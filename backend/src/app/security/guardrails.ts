import { Parser } from 'node-sql-parser';
import { SecurityCheckResult, UserRole, SecurityMode } from './types';
import { getSecurityPolicy } from './policy';

const parser = new Parser();

// Dangerous statements and keywords that should NEVER be executed
const DANGEROUS_WRITE_KEYWORDS = [
  'insert', 'update', 'delete', 'drop', 'alter', 'truncate', 
  'create', 'replace', 'rename', 'grant', 'revoke', 'lock',
  'unlock', 'flush', 'shutdown', 'kill', 'exec', 'call',
  'into outfile', 'into dumpfile', 'load data', 'load_file'
];

const DANGEROUS_FUNCTIONS = [
  'benchmark', 'sleep', 'sys_eval', 'sys_exec'
];

/**
 * Validates that an SQL query is strictly read-only (SELECT, SHOW, DESCRIBE, EXPLAIN)
 * and does NOT contain destructive statements, stacked commands, or injection functions.
 */
export function validateReadOnly(sql: string): SecurityCheckResult {
  const trimmed = sql.trim().replace(/;+\s*$/, ''); // remove trailing semicolons

  // 1. Lexer / Text-Level Defense-in-depth Check
  const lower = trimmed.toLowerCase();

  // Check for stacked / multiple queries separated by semicolons
  // (ignoring semicolons that might be inside single or double quotes)
  const nonQuoted = lower.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
  if (nonQuoted.includes(';')) {
    return {
      allowed: false,
      violationType: 'STACKED_QUERY',
      blockedReason: 'Stacked or multi-statement queries are strictly prohibited for security.',
    };
  }

  // Check for dangerous injection functions
  for (const fn of DANGEROUS_FUNCTIONS) {
    const fnRegex = new RegExp(`\\b${fn}\\s*\\(`, 'i');
    if (fnRegex.test(lower)) {
      return {
        allowed: false,
        violationType: 'DANGEROUS_FUNCTION',
        blockedReason: `Execution of potentially dangerous function '${fn}' is blocked.`,
      };
    }
  }

  // Check for dangerous write and file exfiltration keywords
  for (const kw of DANGEROUS_WRITE_KEYWORDS) {
    const kwRegex = new RegExp(`\\b${kw}\\b`, 'i');
    if (kwRegex.test(nonQuoted)) {
      // INTO OUTFILE, INTO DUMPFILE, LOAD_FILE, LOAD DATA are prohibited even inside SELECT
      const isFileExfiltration = kw.includes('outfile') || kw.includes('dumpfile') || kw.includes('load');
      if (isFileExfiltration || (!lower.startsWith('select') && !lower.startsWith('show') && !lower.startsWith('desc') && !lower.startsWith('explain') && !lower.startsWith('with'))) {
        return {
          allowed: false,
          violationType: 'WRITE_PROHIBITED',
          blockedReason: `Non-read-only statement containing '${kw.toUpperCase()}' is prohibited by read-only guardrails.`,
        };
      }
    }
  }

  // Allow native MySQL inspection queries that don't need full AST parsing
  if (/^show\s+tables/i.test(lower) || /^describe\s+/i.test(lower) || /^desc\s+/i.test(lower)) {
    return { allowed: true, sanitizedSql: trimmed };
  }

  // 2. AST-Level Verification using node-sql-parser
  try {
    const { ast } = parser.parse(trimmed, { database: 'MySQL' });

    // If multiple AST statements returned from parser
    if (Array.isArray(ast)) {
      if (ast.length > 1) {
        return {
          allowed: false,
          violationType: 'STACKED_QUERY',
          blockedReason: 'Stacked or multiple statements detected in query AST.',
        };
      }
      const singleAst = ast[0];
      if (singleAst && singleAst.type !== 'select' && singleAst.type !== 'show' && singleAst.type !== 'desc') {
        return {
          allowed: false,
          violationType: 'WRITE_PROHIBITED',
          blockedReason: `Query type '${singleAst.type.toUpperCase()}' is not permitted. Only SELECT queries are allowed.`,
        };
      }
    } else if (ast) {
      if (ast.type !== 'select' && ast.type !== 'show' && ast.type !== 'desc') {
        return {
          allowed: false,
          violationType: 'WRITE_PROHIBITED',
          blockedReason: `Query type '${ast.type.toUpperCase()}' is not permitted. Only SELECT queries are allowed.`,
        };
      }
    }

    return { allowed: true, sanitizedSql: trimmed };
  } catch (err: any) {
    // If AST parsing fails, fallback to strict regex verification
    // Must strictly start with SELECT or WITH ... SELECT
    if (/^\s*(select|with)\b/i.test(trimmed)) {
      // Extra verification against write operations
      for (const kw of ['drop', 'delete', 'truncate', 'alter', 'insert', 'update', 'rename', 'grant', 'revoke']) {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(nonQuoted)) {
          return {
            allowed: false,
            violationType: 'WRITE_PROHIBITED',
            blockedReason: `Query failed AST validation and contains dangerous keyword '${kw.toUpperCase()}'.`,
          };
        }
      }
      return { allowed: true, sanitizedSql: trimmed };
    }

    return {
      allowed: false,
      violationType: 'WRITE_PROHIBITED',
      blockedReason: `Query failed SQL syntax and read-only validation: ${err.message}`,
    };
  }
}

/**
 * Validates Column-Level Role-Based Access Control (RBAC).
 * Enforces that standard 'user' role cannot access PII, financial, or credential columns,
 * even when using aliases, subqueries, or wildcard 'SELECT *'.
 */
export function validateRBAC(sql: string, role: UserRole, database?: string): SecurityCheckResult {
  // Admin role is granted access to all columns
  if (role === 'admin') {
    return { allowed: true, sanitizedSql: sql };
  }

  const policy = getSecurityPolicy(database);
  const trimmed = sql.trim().replace(/;+\s*$/, '');
  const lower = trimmed.toLowerCase();

  // Allow SHOW TABLES or general metadata inspection
  if (/^show\s+tables/i.test(lower)) {
    return { allowed: true, sanitizedSql: trimmed };
  }

  try {
    const tableListRaw = parser.tableList(trimmed, 'MySQL');
    const columnListRaw = parser.columnList(trimmed, 'MySQL');

    // Extract clean table names: 'select::null::customer' -> 'customer'
    const tablesReferenced = new Set<string>();
    for (const t of tableListRaw) {
      const parts = t.split('::');
      const tableName = parts[parts.length - 1]?.toLowerCase();
      if (tableName && tableName !== 'null') {
        tablesReferenced.add(tableName);
      }
    }

    // 1. Check Table-Level Access
    for (const tbl of tablesReferenced) {
      const tablePolicy = policy.tables[tbl];
      if (tablePolicy && !tablePolicy.allowedRoles.includes(role)) {
        return {
          allowed: false,
          violationType: 'RBAC_COLUMN_DENIED',
          flaggedTables: [tbl],
          blockedReason: `Access denied: Role 'user' does not have permission to query table '${tbl}'. You need to be an admin to access this data.`,
        };
      }
    }

    // 2. Check for Wildcards e.g. SELECT * or SELECT c.*
    // If SELECT * is used on a table that contains restricted columns, block it
    const hasWildcard = columnListRaw.some(c => c.includes('(.*)'));
    if (hasWildcard) {
      for (const tbl of tablesReferenced) {
        const tablePolicy = policy.tables[tbl];
        if (tablePolicy) {
          const restrictedColumns = Object.entries(tablePolicy.columns)
            .filter(([_, col]) => !col.allowedRoles.includes(role))
            .map(([colName]) => colName);

          if (restrictedColumns.length > 0) {
            return {
              allowed: false,
              violationType: 'RBAC_COLUMN_DENIED',
              flaggedTables: [tbl],
              flaggedColumns: restrictedColumns,
              blockedReason: `Access denied: Wildcard SELECT (*) on table '${tbl}' exposes restricted columns: [${restrictedColumns.join(', ')}]. You need to be an admin to access this data.`,
            };
          }
        }
      }
    }

    // 3. Check Individual Column Access
    const flaggedCols: string[] = [];
    for (const colEntry of columnListRaw) {
      // Format: 'select::customer::email' or 'select::null::email'
      const parts = colEntry.split('::');
      const tableName = parts[1] !== 'null' ? parts[1]?.toLowerCase() : null;
      const colName = parts[2]?.toLowerCase();

      if (!colName || colName === '(.*)') continue;

      // If table is identified, check directly
      if (tableName && policy.tables[tableName]) {
        const colPolicy = policy.tables[tableName].columns[colName];
        if (colPolicy && !colPolicy.allowedRoles.includes(role)) {
          flaggedCols.push(`${tableName}.${colName}`);
        }
      } else {
        // Table not explicitly qualified, check all referenced tables
        for (const tbl of tablesReferenced) {
          const tablePolicy = policy.tables[tbl];
          if (tablePolicy && tablePolicy.columns[colName]) {
            const colPolicy = tablePolicy.columns[colName];
            if (!colPolicy.allowedRoles.includes(role)) {
              flaggedCols.push(`${tbl}.${colName}`);
            }
          }
        }
      }
    }

    if (flaggedCols.length > 0) {
      return {
        allowed: false,
        violationType: 'RBAC_COLUMN_DENIED',
        flaggedColumns: flaggedCols,
        blockedReason: `Access denied: Role 'user' is not authorized to access restricted column(s): [${flaggedCols.join(', ')}]. You need to be an admin to access this data.`,
      };
    }

    return { allowed: true, sanitizedSql: trimmed };
  } catch (err: any) {
    // If AST parsing encounters an issue, apply regex column inspection against policy
    const flaggedCols: string[] = [];
    for (const [tblName, tablePolicy] of Object.entries(policy.tables)) {
      for (const [colName, colPolicy] of Object.entries(tablePolicy.columns)) {
        if (!colPolicy.allowedRoles.includes(role)) {
          const colRegex = new RegExp(`\\b${colName}\\b`, 'i');
          if (colRegex.test(lower)) {
            flaggedCols.push(`${tblName}.${colName}`);
          }
        }
      }
    }

    if (flaggedCols.length > 0) {
      return {
        allowed: false,
        violationType: 'RBAC_COLUMN_DENIED',
        flaggedColumns: flaggedCols,
        blockedReason: `Access denied: Role 'user' is not authorized to access restricted column(s): [${flaggedCols.join(', ')}]. You need to be an admin to access this data.`,
      };
    }

    return { allowed: true, sanitizedSql: trimmed };
  }
}

/**
 * Systematic evaluation comparing across security modes:
 * - 'none': Baseline unprotected (executes any query)
 * - 'keyword': Baseline naive keyword pre-check (qLower.includes("email") etc.)
 * - 'guardrails': Our multi-layer AST + Column-level RBAC policy engine
 */
export function evaluateSecurity(
  sql: string,
  role: UserRole,
  database?: string,
  mode: SecurityMode = 'guardrails',
  rawQuestion?: string
): SecurityCheckResult {
  // Mode 1: Baseline Unprotected (No checks)
  if (mode === 'none') {
    return { allowed: true, sanitizedSql: sql };
  }

  // Mode 2: Baseline Keyword Filter (naive approach)
  if (mode === 'keyword') {
    if (role === 'user') {
      const qLower = (rawQuestion || '').toLowerCase();
      const sLower = sql.toLowerCase();
      const keywords = ['name', 'email', 'address', 'phone', 'passport', 'contact', 'personal'];
      for (const kw of keywords) {
        if (qLower.includes(kw) || sLower.includes(kw)) {
          return {
            allowed: false,
            violationType: 'RBAC_COLUMN_DENIED',
            blockedReason: 'You need to be an admin to access this data.',
          };
        }
      }
    }
    // Naive keyword check doesn't check write operations or stacked queries!
    return { allowed: true, sanitizedSql: sql };
  }

  // Mode 3: Our Proposed System - Multi-Layer Guardrails & AST-Level RBAC
  const readOnlyCheck = validateReadOnly(sql);
  if (!readOnlyCheck.allowed) {
    return readOnlyCheck;
  }

  const rbacCheck = validateRBAC(readOnlyCheck.sanitizedSql || sql, role, database);
  if (!rbacCheck.allowed) {
    return rbacCheck;
  }

  return { allowed: true, sanitizedSql: readOnlyCheck.sanitizedSql || sql };
}

/**
 * Post-execution data masking (defense in depth):
 * If a regular user query result contains PII fields, mask the values.
 */
export function maskSensitiveResults(results: any[], role: UserRole, database?: string): any[] {
  if (role === 'admin' || !Array.isArray(results) || results.length === 0) {
    return results;
  }

  const PII_KEYS = ['email', 'emailaddress', 'phone', 'telephoneno', 'passportno', 'address', 'password', 'first_name', 'last_name', 'firstname', 'lastname'];

  return results.map(row => {
    if (!row || typeof row !== 'object') return row;
    const maskedRow: Record<string, any> = { ...row };

    for (const key of Object.keys(maskedRow)) {
      const lowerKey = key.toLowerCase();
      if (PII_KEYS.some(pii => lowerKey.includes(pii))) {
        const val = String(maskedRow[key]);
        if (lowerKey.includes('email')) {
          const atIdx = val.indexOf('@');
          maskedRow[key] = atIdx > 1 ? `${val[0]}***${val.substring(atIdx - 1)}` : '***@***.com';
        } else if (lowerKey.includes('passport') || lowerKey.includes('phone')) {
          maskedRow[key] = val.length > 4 ? `***${val.slice(-4)}` : '****';
        } else {
          maskedRow[key] = '***REDACTED***';
        }
      }
    }

    return maskedRow;
  });
}
