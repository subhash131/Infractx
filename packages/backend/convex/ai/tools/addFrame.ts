import { createTool } from "@convex-dev/agent";
import z from "zod";
import { AgentCtx, designAgent } from "../designAgent";
import { api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { getNextFramePosition } from "../../design/utils";

export const addFrame = createTool({
  description: `Add a new frame to the design. Extract dimensions and styling from user request.
  - If user specifies dimensions (e.g., "800x600", "wide canvas", "tall frame"), calculate appropriate width and height
  - If user mentions colors (e.g., "blue background", "dark canvas"), set backgroundColor accordingly
  - Default to 800x1200 if no dimensions specified
  - Use hex color codes for backgroundColor (e.g., "#ffffff" for white)`,
  args: z.object({
    threadId: z.string(),
    name: z.string(),
    width: z
      .number()
      .default(800)
      .describe(
        "Width in pixels. Default 800. Adjust based on user request (e.g., 'wide' = 1200+, 'narrow' = 600)"
      ),
    height: z
      .number()
      .default(600)
      .describe(
        "Height in pixels. Default 1200. Adjust based on user request (e.g., 'tall' = 1400+, 'short' = 800)"
      ),
    fill: z
      .string()
      .default("#ffffff")
      .describe(
        "Hex color code (e.g., '#ffffff'). Default '#ffffff'. Parse color names to hex (e.g., 'blue' = '#3b82f6', 'dark' = '#1f2937')"
      ),
    angle: z
      .number()
      .default(0)
      .describe("Rotation angle between -360 to 360, default is 0"),
  }),
  handler: async (ctx: AgentCtx, args) => {
    console.log("Adding Frame...", args);
    const { angle, fill, height, name, threadId, width } = args;

    const existingFrames = await ctx.runQuery(
      api.design.layers.getLayersByType,
      { pageId: ctx.pageId as Id<"pages">, type: "FRAME" }
    );

    const pos = getNextFramePosition(existingFrames);

    const res: Id<"layers"> = await ctx.runMutation(
      api.design.layers.createObject,
      {
        angle,
        height,
        name,
        width,
        pageId: ctx.pageId as Id<"pages">,
        fill,
        left: pos.left,
        opacity: 100,
        scaleX: 1,
        scaleY: 1,
        strokeWidth: 1,
        top: ctx.viewPort.top,
        type: "FRAME",
      }
    );
    console.log("Added Frame...");

    await designAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: `Frame "${name}" added with dimensions ${args.width}x${args.height} and background color ${fill}`,
      },
    });

    return `Frame added: ${width}x${height}, ${res}`;
  },
});
