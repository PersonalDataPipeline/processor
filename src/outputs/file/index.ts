import { OutputHandler } from "../../utils/types.js";

const { DEFAULT_FILE_PATH = "" } = process.env;

const strategyIsReady = (data?: {
  path?: string;
  filename?: string;
  fields?: string[];
}) => {
  const errors: string[] = [];
  if (!data?.path && !DEFAULT_FILE_PATH) {
    errors.push("No file path to use");
  }

  if (!data?.fields?.length) {
    errors.push("No fields indicated");
  }

  return errors;
};

const handler: OutputHandler = {
  isReady: () => true,
  handlers: [
    {
      name: () => "json",
      isReady: strategyIsReady,
    },
    {
      name: () => "csv",
      isReady: strategyIsReady,
    },
  ],
};

export default handler;
