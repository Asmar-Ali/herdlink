export const PgErrorCode = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  EXCLUSION_VIOLATION: '23P01',
} as const;

export interface PgDriverError {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

export function isPgError(err: unknown): err is PgDriverError {
  return typeof err === 'object' && err !== null && 'code' in err;
}
