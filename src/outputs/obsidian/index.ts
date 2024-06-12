import { OutputHandler } from "../../utils/types.js";

const { OBSIDIAN_PATH_TO_NOTES = "" } = process.env;

const handler: OutputHandler = {
  isReady: () => !!OBSIDIAN_PATH_TO_NOTES,
  handlers: [
    {
      name: () => "daily_notes_append",
      isReady: (data?: { template?: string }) => {
        const errors: string[] = [];
        if (!data?.template) {
          errors.push("Missing template data");
        }
        // TODO: Validate template
        return errors;
      },
    },
  ],
};

export default handler;
