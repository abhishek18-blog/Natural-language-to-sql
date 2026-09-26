import { NextResponse } from "next/server";
import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { execute, seed, getSchema } from "../../database";
import { evaluateSecurity, maskSensitiveResults } from "../../security/guardrails";
import { SecurityMode, UserRole, ExecutionMetrics } from "../../security/types";

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

// ─── Fast Path for Local AI: 2-Call Pattern ─────────────────────────────────
// Call 1: LLM generates raw SQL from Schema & Query
// Runtime executes SQL with AST & RBAC Guardrails
// Call 2: LLM summarizes results into natural language
async function handleLocalAI(
  question: string,
  role: UserRole,
  schemaStr: string,
  database?: string,
  addLog?: (msg: string) => void,
  signal?: AbortSignal,
  securityMode: SecurityMode = "guardrails"
) {
  const startTime = Date.now();
  let llmCalls = 0;

  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "llama3.2:latest",
    temperature: 0.1,
  });

  const privacyRule = role.toLowerCase() === "user"
    ? `If the question asks for personal details (names, emails, addresses, specific people), reply with exactly: "You need to be an admin to access this data." and no SQL.`
    : `The user is an ADMIN and can access all data.`;

  // Pre-check for keyword mode
  if (securityMode === "keyword" && role.toLowerCase() === "user") {
    const qLower = question.toLowerCase();
    const keywords = ["name", "email", "address", "phone", "contact", "personal", "passenger data", "user data", "passport"];
    if (keywords.some(kw => qLower.includes(kw))) {
      return {
        sql_query: null,
        results: null,
        answer: "You need to be an admin to access this data.",
        metrics: {
          strategy: "two-call" as const,
          provider: "local" as const,
          llmCalls: 0,
          latencyMs: Date.now() - startTime,
          toolCallsCount: 0,
          sqlValid: true,
          securityPassed: false,
          securityMode,
        }
      };
    }
  }

  // Step 1: Generate SQL (Call 1)
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
13. NEVER use LIMIT inside an IN() subquery — MySQL does not support it. Instead, use a JOIN with a derived table.
14. NEVER hallucinate columns. Always double-check the schema before using a column name.
15. If the question contains a specific value (e.g., "movies with ID 1"), use = in your WHERE clause.
16. CROSS-DB PROTECTION: You are connected to the '${database || 'sakila'}' database. If the user's question asks about a topic that clearly belongs to a different database (e.g. asking about flights/passengers in the movie database, or asking about movies/rentals in the airport database), output exactly: CROSS_DB_ERROR

PRIVACY & ACCESS CONTROL:
The current active user role is: ${role.toUpperCase()}
If the user role is "USER", they are strictly PROHIBITED from viewing personal details (names, emails, addresses). Reply: "You need to be an admin to access this data."
If the user role is "ADMIN", they are fully authorized to see all personal details.

Schema:
${schemaStr}

Question: ${question}
SQL:`;

  llmCalls++;
  const sqlResponse = await llm.invoke([new HumanMessage(sqlPrompt)], { signal });
  const rawSql = (sqlResponse.content as string).trim();

  // Handle non-query responses
  if (rawSql.toLowerCase().includes("you need to be an admin")) {
    return {
      sql_query: null,
      results: null,
      answer: "You need to be an admin to access this data.",
      metrics: {
        strategy: "two-call" as const,
        provider: "local" as const,
        llmCalls,
        latencyMs: Date.now() - startTime,
        toolCallsCount: 0,
        sqlValid: true,
        securityPassed: true,
        securityMode,
      }
    };
  }
  if (rawSql === "NOT_A_QUERY") {
    return {
      sql_query: null,
      results: null,
      answer: "Hello! I'm your SQL assistant. Ask me anything about your database.",
      metrics: {
        strategy: "two-call" as const,
        provider: "local" as const,
        llmCalls,
        latencyMs: Date.now() - startTime,
        toolCallsCount: 0,
        sqlValid: true,
        securityPassed: true,
        securityMode,
      }
    };
  }
  if (rawSql === "CROSS_DB_ERROR") {
    return {
      sql_query: null,
      results: null,
      answer: `This question does not match the currently selected database (${database === 'airportdb' ? 'Airport DB' : 'Sakila DB'}). Please switch databases or ask a relevant question.`,
      metrics: {
        strategy: "two-call" as const,
        provider: "local" as const,
        llmCalls,
        latencyMs: Date.now() - startTime,
        toolCallsCount: 0,
        sqlValid: true,
        securityPassed: true,
        securityMode,
      }
    };
  }
  if (rawSql.startsWith("DESCRIBE:")) {
    const description = rawSql.replace(/^DESCRIBE:\s*/i, "").trim();
    return {
      sql_query: null,
      results: null,
      answer: description,
      metrics: {
        strategy: "two-call" as const,
        provider: "local" as const,
        llmCalls,
        latencyMs: Date.now() - startTime,
        toolCallsCount: 0,
        sqlValid: true,
        securityPassed: true,
        securityMode,
      }
    };
  }

  // Step 2: Sanitize SQL
  const cleanSql = rawSql
    .replace(/;\s*(LIMIT\s+\d+)/gi, ' $1')
    .replace(/;+\s*$/g, '')
    .trim();

  // Step 3: Security & RBAC Evaluation
  const secResult = evaluateSecurity(cleanSql, role, database, securityMode, question);
  if (!secResult.allowed) {
    const secMsg = `🛡️ Security/RBAC Policy Enforcement: ${secResult.blockedReason}`;
    if (addLog) addLog(secMsg);
    return {
      sql_query: cleanSql,
      results: null,
      answer: secResult.blockedReason || "Access denied by security guardrails.",
      metrics: {
        strategy: "two-call" as const,
        provider: "local" as const,
        llmCalls,
        latencyMs: Date.now() - startTime,
        toolCallsCount: 0,
        sqlValid: false,
        securityPassed: false,
        securityMode,
        error: secResult.blockedReason,
      }
    };
  }

  // Step 4: Execute SQL
  let results: any[] | null = null;
  let executionError: string | null = null;
  try {
    const rows = await execute(cleanSql, database, addLog, { role }) as any[];
    results = JSON.parse(JSON.stringify(rows, (_, v) => typeof v === "bigint" ? v.toString() : v));
    results = maskSensitiveResults(results || [], role, database);
  } catch (e: any) {
    executionError = e.message;
  }

  // Step 4b: Self-correction retry once if syntax error
  if (executionError) {
    const retryMsg = "⚠️ Local AI SQL failed, retrying with error context...";
    if (addLog) addLog(retryMsg);
    llmCalls++;
    const retryPrompt = `${sqlPrompt}\n\nYour previous attempt was:\n${cleanSql}\n\nIt failed with error: ${executionError}\n\nFix the SQL and output ONLY the corrected raw SQL query:`;
    const retryResponse = await llm.invoke([new HumanMessage(retryPrompt)], { signal });
    const retrySql = (retryResponse.content as string).trim()
      .replace(/;\s*(LIMIT\s+\d+)/gi, ' $1')
      .replace(/;+\s*$/g, '')
      .trim();

    const retrySec = evaluateSecurity(retrySql, role, database, securityMode, question);
    if (!retrySec.allowed) {
      return {
        sql_query: retrySql,
        results: null,
        answer: retrySec.blockedReason || "Access denied by security guardrails.",
        metrics: {
          strategy: "two-call" as const,
          provider: "local" as const,
          llmCalls,
          latencyMs: Date.now() - startTime,
          toolCallsCount: 0,
          sqlValid: false,
          securityPassed: false,
          securityMode,
          error: retrySec.blockedReason,
        }
      };
    }

    try {
      const rows = await execute(retrySql, database, addLog, { role }) as any[];
      results = JSON.parse(JSON.stringify(rows, (_, v) => typeof v === "bigint" ? v.toString() : v));
      results = maskSensitiveResults(results || [], role, database);
      llmCalls++;
      const s = await llm.invoke([new HumanMessage(
        `You are a helpful data analyst. The user asked: "${question}"\nThe SQL returned: ${JSON.stringify(results?.slice(0, 5))}\nGive a short plain English answer.`
      )], { signal });
      return {
        sql_query: retrySql,
        results,
        answer: (s.content as string).trim(),
        metrics: {
          strategy: "two-call" as const,
          provider: "local" as const,
          llmCalls,
          latencyMs: Date.now() - startTime,
          toolCallsCount: 0,
          sqlValid: true,
          securityPassed: true,
          securityMode,
        }
      };
    } catch (e: any) {
      return {
        sql_query: retrySql,
        results: null,
        answer: `I couldn't generate a valid SQL query for this question. Error: ${e.message}`,
        metrics: {
          strategy: "two-call" as const,
          provider: "local" as const,
          llmCalls,
          latencyMs: Date.now() - startTime,
          toolCallsCount: 0,
          sqlValid: false,
          securityPassed: true,
          securityMode,
          error: e.message,
        }
      };
    }
  }

  // Step 5: Summarize in plain English (Call 2)
  llmCalls++;
  const summaryPrompt = `You are a helpful data analyst. The user asked: "${question}"
The SQL query returned these results: ${JSON.stringify(results?.slice(0, 5))}
Give a short, direct, plain English answer. Do NOT mention SQL or raw data. IMPORTANT: If the answer involves a date or time, output it EXACTLY as it appears in the results (do not reformat it). Just answer the question.`;

  const summaryResponse = await llm.invoke([new HumanMessage(summaryPrompt)], { signal });
  const answer = (summaryResponse.content as string).trim();

  return {
    sql_query: cleanSql,
    results,
    answer,
    metrics: {
      strategy: "two-call" as const,
      provider: "local" as const,
      llmCalls,
      latencyMs: Date.now() - startTime,
      toolCallsCount: 0,
      sqlValid: true,
      securityPassed: true,
      securityMode,
    }
  };
}

// ─── Local ReAct Agent Baseline (Multi-turn Conventional Approach) ────────────
// Implements the conventional agentic ReAct loop locally using ChatOllama.
// Serves as the direct empirical baseline requested by reviewers to benchmark against the 2-Call Pattern.
async function handleLocalReActAI(
  question: string,
  role: UserRole,
  schemaStr: string,
  database?: string,
  addLog?: (msg: string) => void,
  signal?: AbortSignal,
  securityMode: SecurityMode = "guardrails"
) {
  const startTime = Date.now();
  let toolCallsCount = 0;
  let executedSql: string | null = null;
  let queryResults: any = null;
  let securityPassed = true;
  let securityError: string | undefined;

  const llm = new ChatOllama({
    baseUrl: "http://localhost:11434",
    model: "llama3.2:latest",
    temperature: 0,
  });

  const privacyRule = role.toLowerCase() === "user"
    ? `If the question asks for personal details (names, emails, addresses, specific people), reply with exactly: "You need to be an admin to access this data." and no SQL.`
    : `The user is an ADMIN and can access all data.`;

  const getFromDB = tool(
    async (input) => {
      if (!input?.sql) return null;
      toolCallsCount++;
      executedSql = input.sql;

      // Security check
      const secResult = evaluateSecurity(input.sql, role, database, securityMode, question);
      if (!secResult.allowed) {
        securityPassed = false;
        securityError = secResult.blockedReason;
        const msg = `🛡️ Security/RBAC Violation in ReAct tool: ${secResult.blockedReason}`;
        if (addLog) addLog(msg);
        return `Security error: ${secResult.blockedReason}`;
      }

      try {
        const rows = await execute(secResult.sanitizedSql || input.sql, database, addLog, { role });
        const cleanRows = JSON.parse(JSON.stringify(rows, (_, v) => typeof v === "bigint" ? v.toString() : v));
        const masked = maskSensitiveResults(cleanRows, role, database);
        queryResults = masked;
        return JSON.stringify(masked);
      } catch (e: any) {
        return `Error executing query: ${e.message}`;
      }
    },
    {
      name: "get_from_db",
      description: "Execute a read-only MySQL query on the active database.",
      schema: z.object({
        sql: z.string().describe("MySQL query to get data from the database. Do not use generic table names, only use the tables provided in the schema."),
      }),
    }
  );

  const agent = createReactAgent({ llm, tools: [getFromDB] });

  try {
    const response = await agent.invoke({
      messages: [
        new SystemMessage(`You are a MySQL database assistant using ReAct methodology.
CRITICAL INSTRUCTIONS:
1. You MUST use the 'get_from_db' tool to fetch exact data before answering questions.
2. NEVER guess numbers or data.
3. ${privacyRule}
4. Database: ${database || 'sakila'}
Schema:
${schemaStr}`),
        new HumanMessage(question),
      ],
    }, { recursionLimit: 12, signal });

    const messages = response.messages;
    const finalAnswer = messages[messages.length - 1]?.content as string;

    // Check if tool calls exist in messages
    for (const msg of messages) {
      if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
        const tc = msg.tool_calls.find((t: any) => t.name === "get_from_db");
        if (tc) executedSql = tc.args.sql;
      }
    }

    return {
      sql_query: executedSql,
      results: queryResults,
      answer: finalAnswer,
      metrics: {
        strategy: "react" as const,
        provider: "local" as const,
        llmCalls: messages.length, // total conversational turns in ReAct loop
        latencyMs: Date.now() - startTime,
        toolCallsCount,
        sqlValid: !!executedSql && !securityError,
        securityPassed,
        securityMode,
        error: securityError,
      }
    };
  } catch (error: any) {
    return {
      sql_query: executedSql,
      results: null,
      answer: `Local ReAct Agent failed: ${error.message}`,
      metrics: {
        strategy: "react" as const,
        provider: "local" as const,
        llmCalls: 0,
        latencyMs: Date.now() - startTime,
        toolCallsCount,
        sqlValid: false,
        securityPassed,
        securityMode,
        error: error.message,
      }
    };
  }
}

// ─── Online AI Path (Groq / Cloud ReAct Agent) ──────────────────────────────
async function handleOnlineAI(
  question: string,
  role: UserRole,
  schemaStr: string,
  database?: string,
  addLog?: (msg: string) => void,
  signal?: AbortSignal,
  securityMode: SecurityMode = "guardrails"
) {
  const startTime = Date.now();
  let toolCallsCount = 0;
  let executedSql: string | null = null;
  let queryResults: any = null;
  let securityPassed = true;
  let securityError: string | undefined;

  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-120b",
    temperature: 0,
  });

  const privacyRule = role.toLowerCase() === "user"
    ? `If the question asks for personal details (names, emails, addresses, specific people), reply with exactly: "You need to be an admin to access this data." and no SQL.`
    : `The user is an ADMIN and can access all data.`;

  const getFromDB = tool(
    async (input) => {
      if (!input?.sql) return null;
      toolCallsCount++;
      executedSql = input.sql;

      const secResult = evaluateSecurity(input.sql, role, database, securityMode, question);
      if (!secResult.allowed) {
        securityPassed = false;
        securityError = secResult.blockedReason;
        const msg = `🛡️ Security/RBAC Violation in ReAct tool: ${secResult.blockedReason}`;
        if (addLog) addLog(msg);
        return `Security error: ${secResult.blockedReason}`;
      }

      try {
        const rows = await execute(secResult.sanitizedSql || input.sql, database, addLog, { role });
        const cleanRows = JSON.parse(JSON.stringify(rows, (_, v) => typeof v === "bigint" ? v.toString() : v));
        const masked = maskSensitiveResults(cleanRows, role, database);
        queryResults = masked;
        return JSON.stringify(masked);
      } catch (e: any) {
        return `Error executing query: ${e.message}`;
      }
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
4. Once fetched, synthesize a clear, concise answer. Do NOT output raw SQL in your final text.
5. ${privacyRule}
6. CROSS-DB PROTECTION: Connected to '${database || 'sakila'}'. Do NOT query another database.

Schema:
${schemaStr}`),
      new HumanMessage(question),
    ],
  }, { recursionLimit: 15, signal });

  const messages = response.messages;
  for (const msg of messages) {
    if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
      const tc = msg.tool_calls.find((t: any) => t.name === "get_from_db");
      if (tc) executedSql = tc.args.sql;
    }
  }

  return {
    sql_query: executedSql,
    results: queryResults,
    answer: messages[messages.length - 1].content as string,
    metrics: {
      strategy: "react" as const,
      provider: "online" as const,
      llmCalls: messages.length,
      latencyMs: Date.now() - startTime,
      toolCallsCount,
      sqlValid: !!executedSql && !securityError,
      securityPassed,
      securityMode,
      error: securityError,
    }
  };
}

// ─── Main POST Handler ──────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { question, role = "user", provider = "online", database = "sakila", strategy = "two-call", securityMode = "guardrails" } = await req.json();

    const serverLogs: string[] = [];
    const addLog = (msg: string) => serverLogs.push(msg);

    await seed(database, addLog);
    const schemaStr = await getSchema(database, addLog);

    let result;
    if (provider === "local-react" || (provider === "local" && strategy === "react")) {
      addLog("🤖 Strategy Selected: Local ReAct Agent Baseline");
      result = await handleLocalReActAI(question, role, schemaStr, database, addLog, req.signal, securityMode);
    } else if (provider === "local") {
      addLog("⚡ Strategy Selected: Local 2-Call Pattern");
      result = await handleLocalAI(question, role, schemaStr, database, addLog, req.signal, securityMode);
    } else {
      addLog("☁️ Strategy Selected: Cloud ReAct Agent (Groq)");
      result = await handleOnlineAI(question, role, schemaStr, database, addLog, req.signal, securityMode);
    }

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
