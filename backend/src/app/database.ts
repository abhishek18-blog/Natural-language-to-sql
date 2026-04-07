"use server";

import mysql from 'mysql2/promise';

export async function seed() {
  console.log("Using local MySQL DB, mock seeding skipped.");
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
    
    return rows;
  } catch (error: any) {
    console.error("Database error:", error);
    throw new Error(`Database connection or query failed: ${error.message}`);
  }
}