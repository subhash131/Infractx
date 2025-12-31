import { createTool } from "@convex-dev/agent";
import z from "zod";
import { AgentCtx, designAgent } from "../olddesignAgent";
import { api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";

export const addFrame = createTool({
  description: `Add a new frame to the design. Extract dimensions and styling from user request.
  - If user specifies dimensions (e.g., "800x600", "wide canvas", "tall frame"), calculate appropriate width and height
  - If user mentions colors (e.g., "blue background", "dark canvas"), set backgroundColor accordingly
  - Default to 800x1200 if no dimensions specified
  - Use hex color codes for backgroundColor (e.g., "#ffffff" for white)`,
  args: z.object({
    threadId: z.string(),
    frameName: z.string(),
    order: z.number(),
    width: z
      .number()
      .default(800)
      .describe(
        "Width in pixels. Default 800. Adjust based on user request (e.g., 'wide' = 1200+, 'narrow' = 600)"
      ),
    height: z
      .number()
      .default(1200)
      .describe(
        "Height in pixels. Default 1200. Adjust based on user request (e.g., 'tall' = 1400+, 'short' = 800)"
      ),
    backgroundColor: z
      .string()
      .default("#ffffff")
      .describe(
        "Hex color code (e.g., '#ffffff'). Default '#ffffff'. Parse color names to hex (e.g., 'blue' = '#3b82f6', 'dark' = '#1f2937')"
      ),
  }),
  handler: async (ctx: AgentCtx, args) => {
    console.log("Adding Frame...", args);
    await ctx.runMutation(api.design.canvases.createCanvas, {
      height: args.height,
      width: args.width,
      name: args.frameName,
      order: args.order,
      pageId: ctx.pageId as Id<"pages">,
      backgroundColor: args.backgroundColor,
    });
    console.log("Added canvas...");

    await designAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: `Canvas "${args.frameName}" added with dimensions ${args.width}x${args.height} and background color ${args.backgroundColor}`,
      },
    });

    return `Canvas added: ${args.width}x${args.height}, ${args.backgroundColor}`;
  },
});
