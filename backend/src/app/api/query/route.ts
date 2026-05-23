import { NextResponse } from "next/server";
import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";


import { tool } from "@langchain/core/tools";


import { z } from "zod";


import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";


import { execute, seed, getSchema } from "../../database";


export const maxDuration = 60;


export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}


// ─── Fast path for Local AI ───────────────────────────────────────────────────
// Instead of the slow ReAct agent loop (3+ LLM calls), we do:
//   1. Ask the LLM to produce ONLY a raw SQL query (1 LLM call)
//   2. We execute it ourselves
//   3. Ask the LLM to summarize the result in plain English (1 LLM call)
// Total: 2 LLM calls instead of 5+
async function handleLocalAI(question: string, role: string, schemaStr: string, database?: string, addLog?: (msg: string) => void, signal?: AbortSignal) {
  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "llama3.2:latest",
    //model: "qwen2.5-coder:7b",

    temperature: 0.1,
  });


  const privacyRule = role.toLowerCase() === "user"
    ? `If the question asks for personal details (names, emails, addresses, specific people), reply with exactly: "You need to be an admin to access this data." and no SQL.`
    : `The user is an ADMIN and can access all data.`;


  // Pre-check to save compute: do not even invoke LLM if user asks for personal data
  if (role.toLowerCase() === "user") {
    const qLower = question.toLowerCase();
    if (
      qLower.includes("name") ||
      qLower.includes("email") ||
      qLower.includes("address") ||
      qLower.includes("phone") ||
      qLower.includes("contact") ||
      qLower.includes("personal") ||
      qLower.includes("passenger data") ||
      qLower.includes("user data") ||
      qLower.includes("passenger info")
    ) {
      return { sql_query: null, results: null, answer: "You need to be an admin to access this data." };
    }
  }


  // Step 1: Generate SQL
  const sqlPrompt = `You are a MySQL query generator. Your ONLY job is to write valid MySQL SQL.


STRICT RULES — FOLLOW EXACTLY:
1. Output ONLY the raw SQL query. No explanation, no markdown, no code fences, no comments.
2. ONLY use table names and column names that are listed in the Schema below. NEVER invent column names.
3. Date columns in this database are stored as standard MySQL DATETIME (e.g., '2015-06-01 00:00:00'). You can use standard functions like YEAR(col), MONTH(col), or LIKE '2015-07%' directly without STR_TO_DATE.
4. Do NOT use DATE(), from, log_date, or any column not in the Schema.
5. Do NOT add a semicolon before LIMIT. By default, ALWAYS use LIMIT 10. If the user explicitly asks for more, you may use up to LIMIT 100 maximum.
6. Do NOT alias columns unless necessary.
7. If the question is ONLY a greeting (e.g. 'hi', 'hello', 'thanks') with no database intent, output exactly: NOT_A_QUERY
8. If the user asks to "show tables", "list tables", "what tables exist", or similar — generate SQL: SHOW TABLES
9. If the user asks to "show entries", "show data", "show rows" for a table — generate: SELECT * FROM <table_name> LIMIT 10
10. Only use DESCRIBE: for purely abstract questions like 'what is this database?' or 'describe the database' where no data listing is requested. Format: DESCRIBE: <2-3 sentence description>
11. ${privacyRule}
12. ALWAYS use IN instead of = when comparing against a subquery. Example: WHERE id IN (SELECT ...) NOT WHERE id = (SELECT ...)
13. NEVER use LIMIT inside an IN() subquery — MySQL does not support it. Instead, use a JOIN with a derived table. Example: JOIN (SELECT film_id FROM rental GROUP BY film_id ORDER BY COUNT(*) DESC LIMIT 1) AS top ON film.film_id = top.film_id
14. NEVER hallucinate columns. Always double-check the schema before using a column name. Do NOT assume common columns like 'store_id' or 'status' exist on every table.
15. If the question contains a specific value (e.g., "movies with ID 1", "customers from city 2", "films released in 2006", "bookings for date '2015-11-08'"), you MUST use = in your WHERE clause (WHERE id = 1, WHERE city_id = 2, WHERE release_year = 2006, WHERE booking_date = '2015-11-08'). Only use IN when the user explicitly asks for multiple values, or when comparing against a subquery. NEVER use IN() for a single literal value (never write IN(1), always use =1).
16. CROSS-DB PROTECTION: You are connected to the '${database || 'sakila'}' database. If the user's question asks about a topic that clearly belongs to a different database (e.g. asking about flights/passengers in the movie database, or asking about movies/rentals in the airport database), output exactly: CROSS_DB_ERROR


PRIVACY & ACCESS CONTROL:
The current active user role is: ${role.toUpperCase()}
If the user role is "USER", they are strictly PROHIBITED from viewing personal details (names, emails, addresses). Reply: "You need to be an admin to access this data."
If the user role is "ADMIN", they are fully authorized to see all personal details.


Schema:
${schemaStr}


Question: ${question}
SQL:`;


  const sqlResponse = await llm.invoke([new HumanMessage(sqlPrompt)], { signal });
  const rawSql = (sqlResponse.content as string).trim();


  // Handle non-query responses
  if (rawSql.toLowerCase().includes("you need to be an admin")) {
    return { sql_query: null, results: null, answer: "You need to be an admin to access this data." };
  }
  if (rawSql === "NOT_A_QUERY") {
    return { sql_query: null, results: null, answer: "Hello! I'm your SQL assistant. Ask me anything about your database." };
  }
  if (rawSql === "CROSS_DB_ERROR") {
    return { sql_query: null, results: null, answer: `This question does not match the currently selected database (${database === 'airportdb' ? 'Airport DB' : 'Sakila DB'}). Please switch databases or ask a relevant question.` };
  }
  // Meta/descriptive question — model answers inline with DESCRIBE: prefix (1 LLM call, no second call needed)
  if (rawSql.startsWith("DESCRIBE:")) {
    const description = rawSql.replace(/^DESCRIBE:\s*/i, "").trim();
    return { sql_query: null, results: null, answer: description };
  }


  // Step 2: Sanitize SQL — fix common LLM mistakes
  // e.g. "SELECT ... WHERE ...;  LIMIT 100" → "SELECT ... WHERE ... LIMIT 100"
  const cleanSql = rawSql
    .replace(/;\s*(LIMIT\s+\d+)/gi, ' $1')  // move misplaced LIMIT after semicolon
    .replace(/;+\s*$/g, '')                   // strip trailing semicolons
    .trim();


  // Step 3: Execute the SQL ourselves
  let results: any[] | null = null;
  let executionError: string | null = null;
  try {
    const rows = await execute(cleanSql, database, addLog) as any[];
    results = JSON.parse(JSON.stringify(rows, (_, v) => typeof v === "bigint" ? v.toString() : v));
  } catch (e: any) {
    executionError = e.message;
  }


  // Step 3b: Retry once with the error so the model can self-correct
  if (executionError) {
    const retryMsg = "⚠️ Local AI SQL failed, retrying with error context...";
    console.warn(retryMsg);
    if (addLog) addLog(retryMsg);
    const retryPrompt = `${sqlPrompt}


Your previous attempt was:
${cleanSql}


It failed with error: ${executionError}


Fix the SQL and output ONLY the corrected raw SQL query:`;
    const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)], { signal });
    const retrySql = (retryResponse.content as string).trim()
      .replace(/;\s*(LIMIT\s+\d+)/gi, ' $1')
      .replace(/;+\s*$/g, '')
      .trim();


    try {
      const rows = await execute(retrySql, database, addLog) as any[];
      results = JSON.parse(JSON.stringify(rows, (_, v) => typeof v === "bigint" ? v.toString() : v));
      executionError = null;
      return {
        sql_query: retrySql,
        results,
        answer: await (async () => {
          const s = await llm.invoke([new HumanMessage(
            `You are a helpful data analyst. The user asked: "${question}"\nThe SQL returned: ${JSON.stringify(results?.slice(0, 5))}\nGive a short plain English answer. No SQL, no raw data. IMPORTANT: If the answer involves a date or time, output it EXACTLY as it appears in the results (do not reformat it).`
          )], { signal });
          return (s.content as string).trim();
        })(),
      };
    } catch (e: any) {
      return {
        sql_query: retrySql,
        results: null,
        answer: `I couldn't generate a valid SQL query for this question. Error: ${e.message}`,
      };
    }
  }


  // Step 4: Summarize the result in plain English
  const summaryPrompt = `You are a helpful data analyst. The user asked: "${question}"
The SQL query returned these results: ${JSON.stringify(results?.slice(0, 5))}
Give a short, direct, plain English answer. Do NOT mention SQL or raw data. IMPORTANT: If the answer involves a date or time, output it EXACTLY as it appears in the results (do not reformat it). Just answer the question.`;


  const summaryResponse = await llm.invoke([new HumanMessage(summaryPrompt)], { signal });
  const answer = (summaryResponse.content as string).trim();


  return { sql_query: cleanSql, results, answer };
}


// ─── Online AI path (unchanged – uses full ReAct agent) ────────────────────
async function handleOnlineAI(question: string, role: string, schemaStr: string, database?: string, addLog?: (msg: string) => void, signal?: AbortSignal) {
  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    // model: "llama-3.1-8b-instant",
    model: "openai/gpt-oss-120b",
    temperature: 0,
  });


  const privacyRule = role.toLowerCase() === "user"
    ? `If the question asks for personal details (names, emails, addresses, specific people), reply with exactly: "You need to be an admin to access this data." and no SQL.`
    : `The user is an ADMIN and can access all data.`;


  const getFromDB = tool(
    async (input) => {
      if (input?.sql) {
        try {
          const result = await execute(input.sql, database, addLog);
          return JSON.stringify(result, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          );
        } catch (e: any) {
          return `Error executing query: ${e.message}`;
        }
      }
      return null;
    },
    {
      name: "get_from_db",
      description: "Get data from a MySQL database.",
      schema: z.object({
        sql: z.string().describe("MySQL query to get data from the database. Do not use generic table names, only use the tables provided in the schema."),
      }),
    }
  );


  const agent = createReactAgent({ llm, tools: [getFromDB] });


  const response = await agent.invoke({
    messages: [
      new SystemMessage(`You are a strict MySQL database assistant.


CRITICAL INSTRUCTIONS:
1. You MUST use the 'get_from_db' tool to fetch the exact data BEFORE answering data questions.
2. NEVER guess, estimate, or hallucinate numbers or data.
3. If user asks for any data that is not in the database, return "No data found".
4. NEVER append warning messages. Just give the direct answer.
5. Once you have fetched data using the 'get_from_db' tool, synthesize a clear, concise answer. Do NOT output the raw SQL query in your final answer. IMPORTANT: If the answer involves a date or time, output it EXACTLY as it appears in the database results (do not reformat it).
6. If the user's input is a greeting or unrelated to the schema, respond conversationally WITHOUT using the tool.
7. If the user asks a descriptive/meta question about the database (e.g. 'what is this database?', 'describe the database', 'what tables are there?'), answer directly from the Schema below WITHOUT using the get_from_db tool. Give a short, friendly plain English description — do NOT query INFORMATION_SCHEMA.


STRICT RULES — FOLLOW EXACTLY FOR SQL GENERATION:
1. ONLY use table names and column names that are listed in the Schema below. NEVER invent column names.
2. Date columns in this database are stored as standard MySQL DATETIME (e.g., '2015-06-01 00:00:00'). You can use standard functions like YEAR(col), MONTH(col), or LIKE '2015-07%' directly without STR_TO_DATE.
3. Do NOT use DATE(), from, log_date, or any column not in the Schema.
4. Do NOT add a semicolon before LIMIT. By default, ALWAYS use LIMIT 10. If the user explicitly asks for more, you may use up to LIMIT 100 maximum.
5. Do NOT alias columns unless necessary.
6. ${privacyRule}
7. ALWAYS use IN instead of = when comparing against a subquery. Example: WHERE id IN (SELECT ...) NOT WHERE id = (SELECT ...)
8. NEVER use LIMIT inside an IN() subquery — MySQL does not support it. Instead, use a JOIN with a derived table. Example: JOIN (SELECT film_id FROM rental GROUP BY film_id ORDER BY COUNT(*) DESC LIMIT 1) AS top ON film.film_id = top.film_id
9. NEVER hallucinate columns. Always double-check the schema before using a column name. Do NOT assume common columns like 'store_id' or 'status' exist on every table.
10. If the question contains a specific value (e.g., "movies with ID 1", "customers from city 2", "films released in 2006", "bookings for date '2015-11-08'"), you MUST use = in your WHERE clause (WHERE id = 1, WHERE city_id = 2, WHERE release_year = 2006, WHERE booking_date = '2015-11-08'). Only use IN when the user explicitly asks for multiple values, or when comparing against a subquery. NEVER use IN() for a single literal value (never write IN(1), always use =1).
11. CROSS-DB PROTECTION: You are connected to the '${database || 'sakila'}' database. If the user's question asks about a topic that clearly belongs to a different database (e.g. asking about flights/passengers in the movie database, or asking about movies/rentals in the airport database), do NOT use the get_from_db tool. Answer exactly: "This question does not match the currently selected database (${database === 'airportdb' ? 'Airport DB' : 'Sakila DB'}). Please switch databases or ask a relevant question."


PRIVACY & ACCESS CONTROL:
The current active user role is: ${role.toUpperCase()}
If the user role is "USER", they are strictly PROHIBITED from viewing personal details (names, emails, addresses). Reply: "You need to be an admin to access this data."
If the user role is "ADMIN", they are fully authorized to see all personal details.


Schema:
${schemaStr}`),
      new HumanMessage(question),
    ],
  }, { recursionLimit: 5, signal }); //changed recursion limit to 5


  const messages = response.messages;
  let sql_query = null;
  let results = null;


  for (const msg of messages) {
    if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
      const tc = msg.tool_calls.find((t: any) => t.name === "get_from_db");
      if (tc) sql_query = tc.args.sql;
    }
    if (msg.getType() === "tool") {
      try {
        const parsed = JSON.parse(msg.content as string);
        if (Array.isArray(parsed) && parsed.length > 0) {
          results = parsed;
        } else if (!results) {
          results = parsed;
        }
      } catch (e) { /* ignore */ }
    }
  }


  return {
    sql_query,
    results,
    answer: messages[messages.length - 1].content,
  };
}


// ─── Main POST handler ──────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { question, role, provider, database } = await req.json();


    const serverLogs: string[] = [];
    const addLog = (msg: string) => serverLogs.push(msg);


    await seed(database, addLog);


    const schemaStr = await getSchema(database, addLog);


    let result;
    if (provider === "local") {
      result = await handleLocalAI(question, role, schemaStr, database, addLog, req.signal);
    } else {
      result = await handleOnlineAI(question, role, schemaStr, database, addLog, req.signal);
    }


    // Include logs in the result payload
    const finalResult = {
      ...result,
      logs: serverLogs,
    };


    return NextResponse.json(finalResult, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });


  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log("⚠️ Request aborted by user.");
      return NextResponse.json({ detail: "User aborted the process" }, {
        status: 499,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }


    console.error("❌ Error in /api/query:", error);
    return NextResponse.json({ detail: error.message }, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}




