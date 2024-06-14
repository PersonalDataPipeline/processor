import { arrayMissingValue } from "../../utils/index.js";
import { OutputHandler } from "../../utils/types.js";
import { RecipeObject } from "../../utils/validate-recipe.js";

const { OBSIDIAN_PATH_TO_NOTES = "" } = process.env;

////
/// Types
//

interface StrategyData {
  date?: string;
  template?: string;
}

////
/// Export
//
const handler: OutputHandler = {
  isReady: () => !!OBSIDIAN_PATH_TO_NOTES,
  handlers: [
    {
      name: () => "daily_notes_append",
      isReady: (recipe: RecipeObject, data?: { template?: string; date?: string }) => {
        const errors: string[] = [];
        if (!data || typeof data !== "object") {
          errors.push("Missing output data fields: date, template");
          return errors;
        }

        if (!data.date) {
          errors.push("Missing date field");
        }

        if (data.date && !Object.keys(recipe.fields).includes(data.date)) {
          errors.push(`Date field ${data.date} does not exist in input data.`);
        }

        if (!data.template) {
          errors.push("Missing template");
        }

        const templateRegex = /\{{2}(\s*\w+\s*)\}{2}/g;
        const templateMatches = [...(data.template?.matchAll(templateRegex) || [])].map(
          (match) => match[0].replace(templateRegex, "$1").trim()
        );

        const maybeMissingField = arrayMissingValue(
          Object.keys(recipe.fields),
          templateMatches
        );

        if (maybeMissingField) {
          errors.push(`Found unknown field ${maybeMissingField} in template.`);
        }

        return errors;
      },
      handle: (inputData, strategyData?: StrategyData) => {
        console.log(inputData);
        console.log(strategyData);
      },
    },
  ],
};

export default handler;
