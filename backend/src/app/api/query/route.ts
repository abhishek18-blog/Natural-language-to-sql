import { NextResponse } from "next/server";
import { ChatGroq } from "@langchain/groq";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage, ToolMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { execute, seed } from "../../database";
import { customersTable, productsTable, ordersTable, orderItemsTable } from "../../constants";

export const maxDuration = 60; // Set to 60 seconds if platform allows, or just note it.

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

export async function POST(req: Request) {
  try {
    const { question, role } = await req.json();

    // Ensure DB is seeded
    seed();

    const getFromDB = tool(
      async (input) => {
        if (input?.sql) {
          try {
            const result = await execute(input.sql);
            return JSON.stringify(result);
          } catch (e: any) {
            return "FATAL ERROR: The database credentials in the .env file are invalid or the database server is unreachable. YOU MUST NOT RETRY ANY MORE QUERIES. Immediately tell the user to fix their MySQL connection string in the .env file.";
          }
        }
        return null;
      },
      {
        name: "get_from_db",
        description: `Get data from a MySQL database. The database has the following schema:
        ${customersTable}
        ${productsTable}
        ${ordersTable}
        ${orderItemsTable}`,
        schema: z.object({
          sql: z.string().describe("MySQL query to get data from the database. Do not use generic table names, only use the tables provided in the schema."),
        }),
      }
    );

    const agent = createReactAgent({
      llm: new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.1-8b-instant",
        temperature: 0,
      }),
      tools: [getFromDB],
    });

    const response = await agent.invoke({
      messages: [
        new SystemMessage(`You are an expert, strict MySQL Database Assistant. Your primary role is to translate natural language into SQL queries, execute them, and return accurate answers.

### DATABASE SCHEMA:
${customersTable}
${productsTable}
${ordersTable}
${orderItemsTable}

### USER CONTEXT:
The current user interacting with you has the role: ${role ? role.toUpperCase() : 'USER'}.

### CRITICAL INSTRUCTIONS:
1. MANDATORY TOOL USAGE: You MUST use the 'get_from_db' tool to fetch the exact data BEFORE answering the user. NEVER guess, estimate, or hallucinate numbers, names, or data.
2. STRICTLY READ-ONLY: You are only permitted to generate and execute \`SELECT\` statements. You must absolutely REFUSE any request that requires \`INSERT\`, \`UPDATE\`, \`DELETE\`, \`DROP\`, \`ALTER\`, or \`GRANT\`.
3. EXACT QUERY GENERATION: Write accurate SQL based ONLY on the provided schema. If the user asks for a count, sum, or specific filter, generate the exact standard MySQL query required to answer that specific question.
4. DATA PRIVACY & ACCESS CONTROL: If the current user role is 'USER', they cannot view global or other users' sensitive data. If a 'USER' asks for unauthorized data, you must reply: "Access Denied: You do not have the required admin permissions to view this data." (If the role is 'ADMIN', they can see everything).
5. MISSING DATA: If your executed query returns an empty result set, you must reply exactly with: "No data found." Do not attempt to guess why the data is missing.`),
        new HumanMessage(question)
      ],
    }, { recursionLimit: 10 }); // Reduced from 100 to 10 to stop the AI from looping 15 times.

    const messages = response.messages;
    let sql_query = null;
    let results = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg instanceof AIMessage && msg.tool_calls && msg.tool_calls.length > 0) {
        const tc = msg.tool_calls.find((t: any) => t.name === "get_from_db");
        if (tc) {
          sql_query = tc.args.sql;
        }
      }
      if (msg.getType() === "tool") {
        try {
          const parsed = JSON.parse(msg.content as string);
          // Prioritize results that are arrays (actual data) over single objects (likely schema info)
          if (Array.isArray(parsed) && parsed.length > 0) {
            results = parsed;
          } else if (!results) {
            results = parsed;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    let finalResults = results;
    if (role === "user") {
      finalResults = null; // Great security measure here to prevent raw data leaking to the frontend!
    }

    return NextResponse.json({
      sql_query: sql_query,
      results: finalResults,
      answer: messages[messages.length - 1].content
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    });
  }
}