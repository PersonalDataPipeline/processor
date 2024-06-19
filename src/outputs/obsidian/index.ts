import { Database } from "duckdb-async";
import mustache from "mustache";

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
/// Helpers
//

const templateRegex = /\{{2}(\s*\w+\s*)\}{2}/g;
const templateMatches = (template: string = "") => {
  return [...(template.matchAll(templateRegex) || [])].map((match) =>
    match[0].replace(templateRegex, "$1").trim()
  );
};

const getTemplateFields = (template: string): string[] => {
  const templateFields = [];
  for (const token of mustache.parse(template) as string[][]) {
    if (["#", "name"].includes(token[0])) {
      templateFields.push(token[1]);
    }
  }
  return templateFields;
};

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

        // TODO: Add this back with linked fields can be checked
        // const maybeMissingField = arrayMissingValue(
        //   Object.keys(fields),
        //   getTemplateFields(strategyData.template || "")
        // );

        // if (maybeMissingField) {
        //   errors.push(`Found unknown field ${maybeMissingField} in template.`);
        // }

        return errors;
      },
      handle: async (db: Database, data: StrategyData, fields: object) => {
        const templateFields = templateMatches(data.template);
        console.log(templateFields);
        console.log(fields);
        console.log(mustache.parse(data.template || ""));

        const results = await db.all(`
          SELECT start_date, event_summary, start_time, name__LINKED
          FROM "google.calendar--events"
        `);

        for (const result of results) {
          const { start_date, event_summary, start_time, name__LINKED } = result;
          const output = mustache.render(data.template || "", {
            start_date,
            event_summary,
            start_time,
            name__LINKED: name__LINKED ? name__LINKED.flat() : [],
          });
        }

        // console.log("OBISIDAN DOT DAILY APPEND BSHES");
        // console.log(db);
        // console.log(data);
        // console.log(fields);
        // console.log(templateFields);
      },
    },
  ],
};

export default handler;
