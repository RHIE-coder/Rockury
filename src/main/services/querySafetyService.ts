import type { TQuerySafetyLevel } from '~/shared/types/db';

const SAFE_PATTERNS = /^\s*(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN|SET\s+NAMES|USE)\b/i;
const CAUTION_PATTERNS = /^\s*(INSERT|UPDATE|MERGE)\b/i;
const DESTRUCTIVE_PATTERNS = /^\s*(DELETE|DROP|TRUNCATE|ALTER|CREATE|RENAME|REVOKE|GRANT)\b/i;

export const querySafetyService = {
  classify(sql: string): { level: TQuerySafetyLevel; reason: string } {
    const trimmed = sql.trim();

    if (DESTRUCTIVE_PATTERNS.test(trimmed)) {
      return { level: 'destructive', reason: 'Statement modifies schema or deletes data' };
    }
    if (CAUTION_PATTERNS.test(trimmed)) {
      return { level: 'caution', reason: 'Statement modifies data' };
    }
    if (SAFE_PATTERNS.test(trimmed)) {
      return { level: 'safe', reason: 'Read-only statement' };
    }
    return { level: 'caution', reason: 'Unknown statement type' };
  },
};
