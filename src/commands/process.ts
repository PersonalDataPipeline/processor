import { Args } from "@oclif/core";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import yaml from "js-yaml";
import { Database } from "duckdb-async";

import { BaseCommand } from "./_base.js";
import { RecipeObject, validateRecipe } from "../utils/validate-recipe.js";
import { PipelineTransforms } from "../utils/transformations.js";
const { default: transformations } = (await import(`../utils/transformations.js`)) as {
  default: PipelineTransforms;
};

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class Process extends BaseCommand<typeof Process> {
  static override summary = "Process data using recipes";

  static override args = {
    RECIPE_NAME: Args.string({
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const duckDb = await Database.create(":memory:");
    const dbConn = await duckDb.connect();

    const { RECIPE_NAME: recipeName } = this.args;
    const recipePath = path.join(__dirname, "..", "..", "recipes", `${recipeName}.yml`);

    let recipeContent = "";
    try {
      recipeContent = readFileSync(recipePath, { encoding: "utf8" });
    } catch (error) {
      throw new Error(`Unknown recipe: ${recipeName}`);
    }

    const recipe: RecipeObject = await validateRecipe(
      yaml.load(recipeContent) as object,
      this.conf
    );

    ////
    /// Load input data
    //

    for (const source in recipe.sources) {
      const [inputName, inputData] = source.split(".");
      const dataPath = recipe.sources[source];
      const inputFields = recipe.input[inputName][inputData];

      const select = [];
      for (const sourceName in inputFields) {
        const columnName = inputFields[sourceName];

        if (sourceName.includes("[]")) {
          const sourceParts = sourceName.split("[]");
          select.push(
            `list_transform(${sourceParts.shift()}, x -> x${sourceParts.join(".")}) AS ${columnName}`
          );
          continue;
        }

        if (sourceName.includes(".")) {
          const sourceParts = sourceName.split(".");
          select.push(
            `${sourceParts.shift()}->>'${sourceParts.join("'->>'")}' AS ${columnName}`
          );
          continue;
        }

        select.push(`${sourceName} AS ${columnName}`);
      }

      // TODO: Need to filter out the list of files to just the most recent
      await duckDb.all(
        `CREATE TABLE '${source}' AS
        SELECT ${select.join(",")}
        FROM read_json_auto('${dataPath}/*.json', ` +
          [
            "union_by_name = true",
            "convert_strings_to_integers = true",
            "format = 'array'",
            "records = true",
          ].join(", ") +
          ")"
      );
    }

    ////
    /// Process pipeline
    //
    for (const action of recipe.pipeline) {
      const { field, transform = [], toField = field, linkTo } = action;
      const source = recipe.fields[field];

      // Adding a new column instead of transforming in place
      if (toField !== field) {
        await duckDb.all(`
          ALTER TABLE '${source}'
          ADD COLUMN ${toField} VARCHAR DEFAULT NULL
        `);
      }

      const results = await duckDb.all(`
        SELECT ${field} FROM '${source}'
      `);

      for (const result of results) {
        let value = result[field] as string;
        for (const tranf of transform) {
          value = transformations[tranf](value);
        }

        const statement = await dbConn.prepare(`
          UPDATE '${source}'
          SET ${toField} = ?::VARCHAR
          WHERE ${field} = ?::VARCHAR
        `);
        await statement.all(value, result[field]);
      }
    }
    console.log(await duckDb.all("SELECT * FROM 'google.calendar--events'"));

    // New fields -> columns
    // ALTER TABLE integers ADD COLUMN l INTEGER DEFAULT 10;

    // console.log(
    //   await duckDb.all(`
    //     SELECT events.*, flatten(list(full_name)) AS full_name
    //     FROM 'google.calendar--events' AS 'events'
    //     LEFT OUTER JOIN 'apple-import.contacts'
    //       ON len(list_intersect(event_emails, contact_emails)) > 0
    //     GROUP BY event.*
    //     LIMIT 10;
    //   `)
    // );
    // console.log(await duckDb.all(`DESCRIBE TABLE 'google.calendar--events'`));
    // console.log(await duckDb.all(`DESCRIBE TABLE 'apple-import.contacts'`));
  }
}
