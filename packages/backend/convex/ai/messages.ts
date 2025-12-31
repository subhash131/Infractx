import { v } from "convex/values";
import { action } from "../_generated/server";
import { createWorkflow } from "./designAgent";

export const create = action({
  args: {},
  handler: async (ctx, args) => {
    const workflow = createWorkflow();
    const mermaid = (await workflow.getGraphAsync()).drawMermaid();

    console.log({ mermaid });

    return { mermaid };
  },
});
