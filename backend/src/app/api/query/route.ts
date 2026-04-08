import { NextResponse } from "next/server";

import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";

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

    const { question, role, provider } = await req.json();



    // Ensure DB is seeded

    seed();



    const getFromDB = tool(

      async (input) => {

        if (input?.sql) {

          try {
            const result = await execute(input.sql);
            // BigInts cannot be processed by generic JSON.stringify, so we must add a replacer.
            return JSON.stringify(result, (key, value) =>
              typeof value === 'bigint' ? value.toString() : value
            );
          } catch (e: any) {
            return `Error executing query: ${e.message}`;
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



    let llm;
    if (provider === "local") {
      llm = new ChatOllama({
        baseUrl: "http://localhost:11434",
        model: "llama3.2:latest",
        temperature: 0,
      });
      
      // Temporary patch for @langchain/ollama bug where bindTools internal uses a missing bind
      if (typeof (llm as any).bind !== "function") {
        const dummyGroq = new ChatGroq({ apiKey: "dummy", model: "dummy" });
        (llm as any).bindTools = (dummyGroq as any).bindTools.bind(llm);
      }
    } else {
      llm = new ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "llama-3.1-8b-instant",
        temperature: 0,
      });
    }

    const agent = createReactAgent({
      llm: llm,
      tools: [getFromDB],
    });



    const response = await agent.invoke({

      messages: [

        new SystemMessage(`You are a strict MySQL database assistant.

CRITICAL INSTRUCTIONS:
1. You MUST use the 'get_from_db' tool to fetch the exact data BEFORE answering any user question.  
2. NEVER guess, estimate, or hallucinate numbers or data. 
3. Only use standard MySQL syntax. Do NOT explore the whole database.
4. If user asks for any data that is not in the database, return "No data found".
5. NEVER append warning messages like "Please note that the actual output may vary". Just give the direct answer.
6. Once you have fetched data using the 'get_from_db' tool, synthesize a clear, concise, and helpful natural language answer based on the results. Do NOT output the raw SQL query in your final answer.
7. If the user's input is a greeting (e.g., "hi", "hello"), a polite closing (e.g., "thank you", "thanks"), or completely unrelated to the schema, DO NOT write SQL. Instead, output exactly this string: NOT_A_QUERY
PRIVACY & ACCESS CONTROL:
The current active user role is: ${role.toUpperCase()}
If the user role is "USER", they are strictly PROHIBITED from viewing personal details (like names, emails, addresses, "who", "where", "when" for specific people). If they ask for personal details, you MUST reply exactly: "You need to be an admin to access this data."
If the user role is "ADMIN", they are fully authorized to see all personal details. You may query and return the data.

Schema:
${customersTable}
${productsTable}
${ordersTable}
${orderItemsTable}`),

        new HumanMessage(question)

      ],

    }, { recursionLimit: 40 }); // Reduced from 100 to 10 to stop the AI from looping 15 times.



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

