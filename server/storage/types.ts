export type Value = string | number | null;
export type Result<T = Record<string, unknown>> = {
  success: boolean;
  results: T[];
  meta: { changes: number };
};
export interface Statement {
  readonly sql: string;
  readonly args: Value[];
  bind(...values: Value[]): Statement;
  first<T = Record<string, unknown>>(): Promise<T | null> | T | null;
  all<T = Record<string, unknown>>(): Promise<Result<T>> | Result<T>;
  run(): Promise<Result> | Result;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<Result[]>;
}
