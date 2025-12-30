import { createTool } from "@convex-dev/agent";
import z from "zod";
import { AgentCtx, designAgent } from "../olddesignAgent";
import { api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { ConvexError } from "convex/values";

export const addRectangle = createTool({
  description: `Add a new rectangle shape to an existing frame in the design. Intelligently extract dimensions, position, and styling from user requests.
  
  Use cases:
  - "Add a blue rectangle" → creates default-sized blue rectangle
  - "Add a 400x300 red box at top left" → creates positioned colored rectangle
  - "Create a wide rectangle" → adjusts width appropriately
  - "Add a rotated rectangle 45 degrees" → applies rotation
  
  Smart extraction rules:
  - Dimensions: Parse explicit sizes (e.g., "800x600") or relative terms ("wide" = 1200+ width, "tall" = 1400+ height, "small" = 400x300)
  - Colors: Convert color names to hex codes (e.g., "blue" → "#3b82f6", "red" → "#ef4444", "dark gray" → "#374151")
  - Position: Extract coordinates from phrases like "at (100, 50)" or "top left" (0, 0)
  - Rotation: Parse angle from phrases like "rotated 45 degrees" or "tilted 30°"
  - left alignment: left = -(frameWidth/2)
  - right alignment: left = (frameWidth/2) - rectWidth
  - Top: top = -(frameHeight/2)
  - Bottom: top = (frameHeight/2) - rectHeight
  - center alignment: left = -rectWidth/2, top = -rectHeight/2
  - Defaults: 800x600 dimensions, white fill (#ffffff), positioned at center alignment, no rotation`,

  args: z.object({
    threadId: z.string().describe("The conversation thread ID"),
    name: z
      .string()
      .describe(
        "Descriptive name for the rectangle (e.g., 'Blue Header Box', 'Background Rectangle')"
      ),
    width: z
      .number()
      .positive()
      .default(800)
      .describe(
        "Width in pixels. Default 800. Adjust based on user intent: 'wide' = 1200+, 'narrow' = 400-600, 'small' = 300-400"
      ),
    height: z
      .number()
      .positive()
      .default(600)
      .describe(
        "Height in pixels. Default 600. Adjust based on user intent: 'tall' = 1400+, 'short' = 300-500, 'small' = 300-400"
      ),
    top: z
      .number()
      .default(0)
      .describe(
        "Vertical position in pixels from top of frame. Default 0. Parse from user phrases like 'at y=100', 'below', or 'centered vertically'"
      ),
    left: z
      .number()
      .default(0)
      .describe(
        "Horizontal position in pixels from left of frame. Default 0. Parse from user phrases like 'at x=50', 'on the right', or 'centered horizontally'"
      ),
    fill: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .default("#ffffff")
      .describe(
        "Fill color as 6-digit hex code including # (e.g., '#ffffff'). Convert color names: 'blue' → '#3b82f6', 'red' → '#ef4444', 'green' → '#22c55e', 'yellow' → '#eab308', 'black' → '#000000', 'dark' → '#1f2937', 'gray' → '#6b7280'"
      ),
    angle: z
      .number()
      .min(-360)
      .max(360)
      .default(0)
      .describe(
        "Rotation angle in degrees. Range: -360 to 360. Default 0 (no rotation). Positive = clockwise, negative = counter-clockwise"
      ),
  }),

  handler: async (ctx: AgentCtx, args) => {
    console.log("Adding rectangle to frame...", args);

    const { angle, fill, name, height, threadId, width, left, top } = args;

    // Validate frameId exists
    if (!ctx.frame?._id) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Frame not found. frameId is missing from context.`,
      });
    }

    // Validate pageId exists
    if (!ctx.pageId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Page not found. pageId is missing from context.`,
      });
    }

    // Fetch and validate frame exists
    const frame = await ctx.runQuery(api.design.layers.getLayerById, {
      frameId: ctx.frame?._id as Id<"layers">,
    });

    if (!frame) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Frame with id ${ctx.frame?._id} does not exist.`,
      });
    }

    // Create the rectangle object
    await ctx.runMutation(api.design.layers.createObject, {
      angle,
      height,
      name,
      width,
      pageId: ctx.pageId as Id<"pages">,
      fill,
      left,
      top,
      opacity: 100,
      scaleX: 1,
      scaleY: 1,
      strokeWidth: 1,
      type: "RECT",
      parentLayerId: frame._id,
    });

    console.log("Added rectangle to frame...");
    // Save success message
    await designAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: `Created rectangle "${name}" (${width}×${height}px) with ${fill} fill at position (${left}, ${top}) ${angle !== 0 ? `rotated ${angle}°` : ""} inside frame "${frame.name || frame._id}"`,
      },
    });

    return `Rectangle "${name}" added successfully: ${width}×${height}px, fill: ${fill}, position: (${left}, ${top}), rotation: ${angle}°`;
  },
});
