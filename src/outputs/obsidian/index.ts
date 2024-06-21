import { Database } from "duckdb-async";
import mustache from "mustache";

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
      handle: async (
        db: Database,
        data: StrategyData,
        fields: { [key: string]: string }
      ) => {
        const { date: dateField, template = "" } = data;
        const templateFields = getTemplateFields(template);
        const errorPrefix = "obsidian.daily_notes_append handler: ";

        const fieldSources = [];
        for (const templateField of templateFields) {
          fieldSources.push(fields[templateField]);
        }

        // TODO: Move this check to isReady()
        if ([...new Set(Object.values(fieldSources))].length > 1) {
          throw new Error(
            `${errorPrefix}Multiple tables found for template fields: ${fieldSources.join(", ")}`
          );
        }

        const results = await db.all(`
          SELECT ${dateField} ${templateFields.length ? `, ${templateFields.join(", ")}` : ""}
          FROM '${fieldSources[0]}'
        `);

        for (const result of results) {
          const templateObject: { [key: string]: string | string[] } = {};
          templateFields.forEach((field) => {
            templateObject[field] = Array.isArray(result[field])
              ? [...new Set((result[field] as []).flat(Infinity))]
              : (result[field] as string);
          });
          console.log(templateObject);

          const output = mustache.render(data.template || "", templateObject);
          // console.log(output);
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
