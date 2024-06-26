import { arrayMissingValue } from "../../utils/index.js";
import { OutputHandler } from "../../utils/types.js";

const { DEFAULT_FILE_PATH = "" } = process.env;

////
/// Types
//

interface StrategyData {
  path?: string;
  filename?: string;
  fields?: string[];
}

////
/// Utilities
//
const strategyIsReady = (fields: object, data?: StrategyData) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object" || !data.fields || !data.fields.length) {
    errors.push("Missing output data fields: fields");
    return errors;
  }

  if (!data.path && !DEFAULT_FILE_PATH) {
    errors.push("No file path to use");
  }

  const maybeMissingField = arrayMissingValue(Object.keys(fields), data.fields);
  if (maybeMissingField) {
    errors.push(`Found unknown field ${maybeMissingField}.`);
  }

  return errors;
};

////
/// Exports
//
const handler: OutputHandler = {
  isReady: () => true,
  handlers: [
    {
      name: () => "json",
      isReady: strategyIsReady,
      handle: async (inputData, strategyData?: StrategyData) => {
        console.log(inputData);
        console.log(strategyData);
      },
    },
    {
      name: () => "csv",
      isReady: strategyIsReady,
      handle: async (inputData, strategyData?: StrategyData) => {
        console.log(inputData);
        console.log(strategyData);
      },
    },
  ],
};

export default handler;
