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
        new SystemMessage(`You are a strict MySQL database assistant.
CRITICAL INSTRUCTIONS:
1. You MUST use the 'get_from_db' tool to fetch the exact data BEFORE answering any user question.  
2. NEVER guess, estimate, or hallucinate numbers or data. 
3. If the user asks "how many orders", you MUST generate and execute "SELECT COUNT(*) FROM orders" using the tool, and read the result.
4. Only use standard MySQL syntax. Do NOT explore the whole database.
Schema:
${customersTable}
${productsTable}
${ordersTable}
${orderItemsTable}`),
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
      finalResults = null;
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
