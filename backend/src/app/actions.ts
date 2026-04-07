"use server";

// 1. Remove ChatWatsonx and import ChatGroq
import { ChatGroq } from "@langchain/groq"; 
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  mapStoredMessagesToChatMessages,
  StoredMessage,
} from "@langchain/core/messages";
import { execute } from "./database";
import { customersTable, productsTable, ordersTable, orderItemsTable } from "./constants";

export async function message(messages: StoredMessage[]) {
  const deserialized = mapStoredMessagesToChatMessages(messages);

  const getFromDB = tool(
    async (input) => {
      if (input?.sql) {
        console.log({ sql: input.sql });

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
      ${orderItemsTable}
      `,
      schema: z.object({
        sql: z
          .string()
          .describe(
            "MySQL query to get data from the database. Do not use generic table names, only use the tables provided in the schema."
          ),
      }),
    }
  );

  const agent = createReactAgent({
    llm: new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      // Update this line to a currently supported model
      model: "llama-3.1-8b-instant", 
      temperature: 0,
    }),
    tools: [getFromDB],
  });

  const response = await agent.invoke({
    messages: deserialized,
  }, { recursionLimit: 100 });

  return response.messages[response.messages.length - 1].content;
}