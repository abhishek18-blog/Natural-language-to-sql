"use server";

import mysql from 'mysql2/promise';

export async function seed() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    await connection.ping();
    console.log("✅ SUCCESS: Database is actively connected and reachable!");
    await connection.end();
  } catch (error: any) {
    console.error("❌ ERROR: Could not connect to the database. Reason:", error.message);
  }
}

export async function execute(sql: string) {
  try {
    console.log("Executing SQL on local MySQL:", sql);
    
    // Create a connection to the local database
    const connection = await mysql.createConnection(process.env.DATABASE_URL!);
    
    // Execute the query
    const [rows] = await connection.query(sql);
    
    // Close the connection
    await connection.end();
    
    console.log("✅ Query successful!");
    return rows;
  } catch (error: any) {
    throw new Error(`SQL Syntax or Execution Error: ${error.message}`);
  }
}