import { homedir } from "os";
import { existsSync, readdirSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { config as dotenvConfig } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.join(__dirname, "..", "..", ".env") });

const { PATH_TO_CONFIG } = process.env;

////
/// Types
//

export interface Config {
  inputsDir: string;
  timezone: string;
  originDate: string;
  inputsSupported: string[];
  outputsSupported: string[];
}

interface ConfigFile extends Partial<Config> {}

////
/// Helpers
//

const config: Config = {
  timezone: "GMT",
  inputsDir: path.join(homedir(), "api-data"),
  originDate: "1900-01-01",
  inputsSupported: [],
  outputsSupported: [],
};

const configPath = PATH_TO_CONFIG
  ? PATH_TO_CONFIG
  : path.join(__dirname, "..", "..", ".config.js");

let configImport: null | ConfigFile = null;
let attemptedImport = false;
if (!attemptedImport && existsSync(configPath)) {
  try {
    configImport = (await import(configPath)) as object;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "<unknown error>";
    console.log(
      `❌ Config file ${configPath} exists but could not be loaded: ${errorMessage}`
    );
    process.exit(1);
  }
  attemptedImport = true;
}

////
/// Export
//

let processedConfig: Config | null = null;
export default (): Config => {
  if (processedConfig !== null) {
    return processedConfig;
  }

  let localConfig: ConfigFile = {};
  if (configImport !== null) {
    localConfig = (configImport as { default: object }).default as ConfigFile;
  }

  processedConfig = Object.assign({}, config, localConfig);
  process.env.TZ = processedConfig.timezone;

  // TODO: This should be based on getter config file, not just what happens to be there
  processedConfig.inputsSupported = readdirSync(processedConfig.inputsDir);

  // TODO: I don't love this ...
  const outputFiles = readdirSync(path.join(__dirname, "..", "outputs"));
  processedConfig.outputsSupported = [...new Set(outputFiles)];

  return processedConfig;
};
