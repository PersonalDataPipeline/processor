import Joi from "joi";
import { strict as assert } from "node:assert";

import getConfig, { Config } from "../utils/config.js";
import path from "path";
import { readdirSync } from "fs";
import { OutputHandler, OutputStrategy } from "./types.js";

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
  input: InputObject;
  output: OutputObject;
  pipeline: object[];
  sources: {
    [key: string]: string;
  };
  handlers: {
    [key: string]: OutputStrategy;
  };
}

export const validateRecipe = async (
  recipe: object,
  config: Config
): Promise<RecipeObject> => {
  const { value, error } = Joi.object({
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
        var: Joi.string(),
      })
    ),
  }).validate(recipe);

  if (error) {
    throw new Error(`Recipe validation: ${error.details[0].message}`);
  }

  (value as RecipeObject).sources = {};
  const inputNames = Object.keys((value as RecipeObject).input);
  for (const inputName of inputNames) {
    for (const subName of Object.keys((value as RecipeObject).input[inputName])) {
      const dataPath = path.join(config.inputsDir, inputName, subName);
      try {
        // TODO: No data should not always throw
        const inputData = readdirSync(dataPath);
        assert(inputData.length >= 1);
      } catch (error) {
        throw new Error(`No data found for input ${inputName}.${subName}`);
      }
      (value as RecipeObject).sources[`${inputName}.${subName}`] = dataPath;
    }
  }

  (value as RecipeObject).handlers = {};
  const outputNames = Object.keys((value as RecipeObject).output);
  for (const outputName of outputNames) {
    const { default: outputHandler } = (await import(
      `../outputs/${outputName}/index.js`
    )) as {
      default: OutputHandler;
    };

    if (!outputHandler.isReady()) {
      throw new Error(`Output handler ${outputName} is not configured properly.`);
    }

    for (const output of (value as RecipeObject).output[outputName]) {
      const { strategy: strategyName, data: strategyData } = output;

      const outputStrategy = outputHandler.handlers
        .filter((strategy) => strategy.name() === strategyName)
        .pop();

      if (typeof outputStrategy === "undefined") {
        throw new Error(`Invalid output strategy: ${strategyName}`);
      }

      const strategyErrors = outputStrategy.isReady(strategyData);
      if (strategyErrors.length > 0) {
        throw new Error(
          `Output strategy ${strategyName} is not configured: \n${strategyErrors.join("\n")}`
        );
      }

      (value as RecipeObject).handlers[`${outputName}.${strategyName}`] = outputStrategy;
    }
  }

  return value;
};
