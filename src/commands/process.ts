import { Args } from "@oclif/core";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import yaml from "js-yaml";

import { BaseCommand } from "./_base.js";
import { validateRecipe } from "../utils/validate-recipe.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default class Process extends BaseCommand<typeof Process> {
  static override summary = "Process data using recipes";

  static override args = {
    RECIPE_NAME: Args.string({
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { RECIPE_NAME: recipeName } = this.args;
    const recipePath = path.join(__dirname, "..", "..", "recipes", `${recipeName}.yml`);

    let recipeContent = "";
    try {
      recipeContent = readFileSync(recipePath, { encoding: "utf8" });
    } catch (error) {
      throw new Error(`Unknown recipe: ${recipeName}`);
    }

    const value = await validateRecipe(yaml.load(recipeContent) as object, this.conf);

    console.log(Object.keys(value));

    // Iterate through relevant files
    // Read file
    // Filter fields
    // Link data
  }
}
