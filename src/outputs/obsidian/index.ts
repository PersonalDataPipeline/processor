import { Database } from "duckdb-async";
import { arrayMissingValue } from "../../utils/index.js";
import { OutputHandler } from "../../utils/types.js";

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
      isReady: (fields: object, strategyData?: StrategyData) => {
        const errors: string[] = [];

        if (!strategyData || typeof strategyData !== "object") {
          errors.push("Missing output data fields: date, template");
          return errors;
        }

        if (!strategyData.date) {
          errors.push("Missing date field");
        }

        if (strategyData.date && !Object.keys(fields).includes(strategyData.date)) {
          errors.push(`Date field ${strategyData.date} does not exist in input data.`);
        }

        if (!strategyData.template) {
          errors.push("Missing template");
        }

        const templateRegex = /\{{2}(\s*\w+\s*)\}{2}/g;
        const templateMatches = [
          ...(strategyData.template?.matchAll(templateRegex) || []),
        ].map((match) => match[0].replace(templateRegex, "$1").trim());

        const maybeMissingField = arrayMissingValue(Object.keys(fields), templateMatches);

        if (maybeMissingField) {
          errors.push(`Found unknown field ${maybeMissingField} in template.`);
        }

        return errors;
      },
      handle: (db: Database, data?: StrategyData) => {
        console.log("OBISIDAN DOT DAILY APPEND BSHES");
        console.log(db);
        console.log(data);
      },
    },
  ],
};

export default handler;
