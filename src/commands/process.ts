import { Args } from "@oclif/core";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import yaml from "js-yaml";
import { Database } from "duckdb-async";

import { BaseCommand } from "./_base.js";
import { RecipeObject, validateRecipe } from "../utils/validate-recipe.js";
import * as transformations from "../utils/transformations.js";

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
      const createTable =
        `
        CREATE TABLE '${source}' AS
        SELECT ${select.join(",")}
        FROM read_json_auto('${dataPath}/*.json', ` +
        [
          "union_by_name = true",
          "convert_strings_to_integers = true",
          "format = 'array'",
          "records = true",
        ].join(", ") +
        ")";
      await duckDb.all(createTable);
    }
  }
}
