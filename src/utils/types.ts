import { Database } from "duckdb-async";

export type OutputStrategyHandler = (db: Database, data?: object) => void;

export interface OutputHandler {
  handlers: OutputStrategy[];
  isReady: () => boolean;
}

export interface OutputStrategy {
  name: () => string;
  isReady: (
    fields: {
      [key: string]: string;
    },
    data?: object
  ) => string[];
  handle: OutputStrategyHandler;
}
