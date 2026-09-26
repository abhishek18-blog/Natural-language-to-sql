"use server";

import mysql from 'mysql2/promise';
import { validateReadOnly, validateRBAC } from './security/guardrails';
import { UserRole } from './security/types';

function getDbUrl(dbName?: string) {
  if (dbName === "airportdb") return process.env.DATABASE_URL_AIRPORT || process.env.DATABASE_URL!;
  if (dbName === "sakila") return process.env.DATABASE_URL_SAKILA || process.env.DATABASE_URL!;
  return process.env.DATABASE_URL_SAKILA || process.env.DATABASE_URL!; // default
}

export async function seed(dbName?: string, addLog?: (msg: string) => void) {
  try {
    const connection = await mysql.createConnection(getDbUrl(dbName));
    await connection.ping();
    const msg = `✅ SUCCESS: Database (${dbName || 'sakila'}) is actively connected and reachable!`;
    console.log(msg);
    if (addLog) addLog(msg);
    await connection.end();
  } catch (error: any) {
    const msg = `❌ ERROR: Could not connect to the database (${dbName || 'sakila'}). Reason: ${error.message}`;
    console.error(msg);
    if (addLog) addLog(msg);
  }
}

export async function execute(
  sql: string, 
  dbName?: string, 
  addLog?: (msg: string) => void,
  options?: { role?: UserRole; skipGuard?: boolean }
) {
  try {
    // 🛡️ Fail-Safe Security Check: Read-Only Guard & Multi-Statement Block
    if (!options?.skipGuard) {
      const readOnlyCheck = validateReadOnly(sql);
      if (!readOnlyCheck.allowed) {
        const violationMsg = `🛡️ SECURITY VIOLATION: ${readOnlyCheck.blockedReason}`;
        console.error(violationMsg);
        if (addLog) addLog(violationMsg);
        throw new Error(violationMsg);
      }

      // If user role is provided, enforce Column-Level RBAC
      if (options?.role) {
        const rbacCheck = validateRBAC(sql, options.role, dbName);
        if (!rbacCheck.allowed) {
          const violationMsg = `🛡️ RBAC VIOLATION: ${rbacCheck.blockedReason}`;
          console.error(violationMsg);
          if (addLog) addLog(violationMsg);
          throw new Error(violationMsg);
        }
      }
    }

    const msg1 = `Executing SQL on local MySQL: ${sql}`;
    console.log(msg1);
    if (addLog) addLog(msg1);
    
    // Create a connection to the local database
    const connection = await mysql.createConnection(getDbUrl(dbName));
    
    // Execute the query
    const [rows] = await connection.query(sql);
    
    // Close the connection
    await connection.end();
    
    const msg2 = `✅ Query successful!`;
    console.log(msg2);
    if (addLog) addLog(msg2);
    return rows;
  } catch (error: any) {
    const msg3 = `❌ SQL Execution Error: ${error.message}`;
    console.error(msg3);
    if (addLog) addLog(msg3);
    throw error;
  }
}

export async function getSchema(dbName?: string, addLog?: (msg: string) => void) {
  try {
    const msg = `Fetching database schema for ${dbName || 'sakila'}...`;
    console.log(msg);
    if (addLog) addLog(msg);
    const dbUrl = getDbUrl(dbName);
    const connection = await mysql.createConnection(dbUrl);
    const [tables]: any = await connection.query("SHOW TABLES");
    const actualDbName = dbUrl.split("/").pop()?.split("?")[0];

    let schemaStr = "";

    for (const row of tables) {
      const tableName = Object.values(row)[0] as string;

      // Get columns with key type
      const [columns]: any = await connection.query(`DESCRIBE \`${tableName}\``);
      const columnDefs = columns.map((col: any) => {
        if (col.Key === "PRI") return `${col.Field}(PK)`;
        if (col.Key === "MUL") return `${col.Field}(FK)`;
        return col.Field;
      }).join(", ");

      // Get foreign key relationships for this table
      const [fkRows]: any = await connection.query(`
        SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [actualDbName, tableName]);

      let fkStr = "";
      if (fkRows.length > 0) {
        fkStr = " | FK: " + fkRows.map((fk: any) =>
          `${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`
        ).join(", ");
      }

      schemaStr += `Table: ${tableName} (${columnDefs})${fkStr}\n`;
    }

    await connection.end();
    return schemaStr;
  } catch (error: any) {
    const msg = `❌ ERROR: Could not fetch database schema: ${error.message}`;
    console.error(msg);
    if (addLog) addLog(msg);
    return "Error fetching schema.";
  }
}