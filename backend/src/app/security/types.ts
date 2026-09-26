export type UserRole = 'user' | 'admin';

export type SecurityMode = 'none' | 'keyword' | 'guardrails';

export type QueryCategory = 
  | 'simple'
  | 'aggregation'
  | 'join'
  | 'complex'
  | 'adversarial'
  | 'rbac_bypass'
  | 'cross_db';

export interface ColumnPolicy {
  classification: 'PUBLIC' | 'PII_CRITICAL' | 'FINANCIAL_RESTRICTED' | 'INTERNAL_CREDENTIAL';
  description?: string;
  allowedRoles: UserRole[];
  allowAggregateOnlyForUser?: boolean; // e.g. SUM(amount) allowed for user, raw amount blocked
}

export interface TablePolicy {
  description?: string;
  allowedRoles: UserRole[];
  columns: Record<string, ColumnPolicy>;
}

export interface DatabaseSecurityPolicy {
  database: 'sakila' | 'airportdb';
  tables: Record<string, TablePolicy>;
}

export interface SecurityCheckResult {
  allowed: boolean;
  blockedReason?: string;
  violationType?: 'WRITE_PROHIBITED' | 'STACKED_QUERY' | 'RBAC_COLUMN_DENIED' | 'CROSS_DB_VIOLATION' | 'DANGEROUS_FUNCTION' | 'PROMPT_INJECTION';
  flaggedColumns?: string[];
  flaggedTables?: string[];
  sanitizedSql?: string;
}

export interface ExecutionMetrics {
  strategy: 'two-call' | 'react';
  provider: 'local' | 'online';
  llmCalls: number;
  latencyMs: number;
  toolCallsCount: number;
  sqlValid: boolean;
  securityPassed: boolean;
  securityMode: SecurityMode;
  error?: string;
}
