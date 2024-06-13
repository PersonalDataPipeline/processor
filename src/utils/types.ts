import { RecipeObject } from "./validate-recipe.js";

export interface OutputHandler {
  handlers: OutputStrategy[];
  isReady: () => boolean;
}

export interface OutputStrategy {
  name: () => string;
  isReady: (recipe: RecipeObject, data?: object) => string[];
  handle: (inputData: any, data?: object) => void;
}
