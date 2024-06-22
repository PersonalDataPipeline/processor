import { Database } from "duckdb-async";

export type KeyVal = { [key: string]: string };

export interface OutputHandler {
  handlers: OutputStrategy[];
  isReady: () => boolean;
}

export type OutputStrategyHandler = (
  db: Database,
  fields: KeyVal,
  data?: KeyVal
) => Promise<void>;

export interface OutputStrategy {
  name: () => string;
  isReady: (fields: KeyVal, data?: KeyVal) => string[];
  handle: OutputStrategyHandler;
}
