import { arrayMissingValue } from "../../utils/index.js";
import { OutputHandler } from "../../utils/types.js";
import { RecipeObject } from "../../utils/validate-recipe.js";

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
const strategyIsReady = (recipe: RecipeObject, data?: StrategyData) => {
  const errors: string[] = [];

  if (!data || typeof data !== "object" || !data.fields || !data.fields.length) {
    errors.push("Missing output data fields: fields");
    return errors;
  }

  if (!data.path && !DEFAULT_FILE_PATH) {
    errors.push("No file path to use");
  }

  const maybeMissingField = arrayMissingValue(recipe.fields, data.fields);
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
      handle: (inputData, strategyData?: StrategyData) => {
        console.log(inputData);
        console.log(strategyData);
      },
    },
    {
      name: () => "csv",
      isReady: strategyIsReady,
      handle: (inputData, strategyData?: StrategyData) => {
        console.log(inputData);
        console.log(strategyData);
      },
    },
  ],
};

export default handler;
