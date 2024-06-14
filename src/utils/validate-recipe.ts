import Joi, { ValidationError } from "joi";
import { strict as assert } from "node:assert";

import getConfig, { Config } from "../utils/config.js";
import * as transformations from "../utils/transformations.js";
import path from "path";
import { readdirSync } from "fs";
import { OutputHandler, OutputStrategy } from "./types.js";
import { arrayMissingValue } from "./index.js";

interface InputObject {
  [key: string]: {
    [key: string]: {
      [key: string]: string;
    };
  };
}

interface OutputObject {
  [key: string]: {
    strategy: string;
    template: string;
    data?: object;
  }[];
}

export interface RecipeObject {
  version: number;
  input: InputObject;
  output: OutputObject;
  pipeline: {
    field: string;
    transform?: string[];
    toField?: string;
    linkTo?: string;
  }[];
  sources: {
    [key: string]: string;
  };
  handlers: {
    [key: string]: OutputStrategy;
  };
  fields: {
    [key: string]: string;
  };
}

export const validateRecipe = async (
  recipeRaw: object,
  config: Config
): Promise<RecipeObject> => {
  const { value: recipe, error } = Joi.object({
    version: Joi.number().allow(0.1),
    input: Joi.object().pattern(
      Joi.string().valid(...getConfig().inputsSupported),
      Joi.object()
        .pattern(
          Joi.string(),
          Joi.object().pattern(Joi.string(), Joi.string().pattern(/^[a-z\d_]*$/))
        )
        .unknown()
    ),
    output: Joi.object().pattern(
      Joi.string().valid(...getConfig().outputsSupported),
      Joi.array().items(
        Joi.object({
          strategy: Joi.string().required(),
          data: Joi.object().unknown(),
        })
      )
    ),
    pipeline: Joi.array().items(
      Joi.object({
        // TODO: Validate that this exists as an input field
        field: Joi.string().required(),
        // TODO: Validate that these exist as built-in or plugin
        transform: Joi.array().items(Joi.string()),
        // TODO: Validate that this exists as an input field
        linkTo: Joi.string(),
        toField: Joi.string(),
      })
    ),
  }).validate(recipeRaw) as { value: RecipeObject; error: ValidationError };

  if (error) {
    throw new Error(`Recipe validation: ${error.details[0].message}`);
  }

  const allFields: { [key: string]: string } = {};

  ////
  /// Validate inputs
  //
  recipe.sources = {};
  const inputNames = Object.keys(recipe.input);
  for (const inputName of inputNames) {
    const inputObject = recipe.input[inputName];
    for (const subName in inputObject) {
      const inputFullName = `${inputName}.${subName}`;
      const dataPath = path.join(config.inputsDir, inputName, subName);
      try {
        // TODO: No data should not always throw
        const inputData = readdirSync(dataPath);
        assert(inputData.length >= 1);
      } catch (error) {
        throw new Error(`Recipe validation: No data found for input ${inputFullName}`);
      }
      recipe.sources[`${inputFullName}`] = dataPath;

      const existingFields = Object.keys(allFields);
      Object.values(inputObject[subName]).forEach((field) => {
        if (existingFields.includes(field)) {
          throw new Error(
            `Recipe validation: Duplicate input field ${field} in ${inputFullName}`
          );
        }
        allFields[field] = inputFullName;
      });
      console.log(allFields);
    }
  }

  recipe.fields = allFields;

  ////
  /// Validate pipeline
  //
  for (const action of recipe.pipeline) {
    const { field, transform, toField, linkTo } = action;

    if (!Object.keys(recipe.fields).includes(field)) {
      throw new Error(
        `Recipe validation: Pipeline from field "${field}" does not exist in input data.`
      );
    }

    const maybeMissingTransform = arrayMissingValue(
      Object.keys(transformations),
      transform || []
    );
    if (maybeMissingTransform) {
      throw new Error(
        `Recipe validation: Unkonwn pipeline transformation "${maybeMissingTransform}."`
      );
    }

    if (toField) {
      if (Object.keys(recipe.fields).includes(toField)) {
        throw new Error(
          `Recipe validation: Pipeline to field "${toField}" already exists in input data.`
        );
      }
      recipe.fields[toField] = recipe.fields[field];
    }

    if (linkTo && !Object.keys(recipe.fields).includes(linkTo)) {
      throw new Error(
        `Recipe validation: Pipeline linkTo field "${linkTo}" does not exist in input data.`
      );
    }
  }

  ////
  /// Validate outputs
  //
  recipe.handlers = {};
  const outputNames = Object.keys(recipe.output);
  for (const outputName of outputNames) {
    const { default: outputHandler } = (await import(
      `../outputs/${outputName}/index.js`
    )) as {
      default: OutputHandler;
    };

    if (!outputHandler) {
      throw new Error(`Invalid output handler ${outputName}.`);
    }

    if (!outputHandler.isReady()) {
      throw new Error(`Output handler ${outputName} is not configured.`);
    }

    for (const output of recipe.output[outputName]) {
      const { strategy: strategyName, data: strategyData } = output;

      const outputStrategy = outputHandler.handlers
        .filter((strategy) => strategy.name() === strategyName)
        .pop();

      if (typeof outputStrategy === "undefined") {
        throw new Error(`Invalid output strategy: ${strategyName}`);
      }

      const strategyErrors = outputStrategy.isReady(recipe, strategyData);
      if (strategyErrors.length > 0) {
        throw new Error(
          `Output strategy ${strategyName} for ${outputName} is not configured: \n${strategyErrors.join("\n")}`
        );
      }

      recipe.handlers[`${outputName}.${strategyName}`] = outputStrategy;
    }
  }

  return recipe;
};
