import { v } from "convex/values";
import { action } from "../_generated/server";
import { designAgent } from "./designAgent";
import { addFrame } from "./tools/addFrame";
import { addRectangle } from "./tools/addRectangle";

export const create = action({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
    frame: v.optional(
      v.object({
        width: v.number(),
        height: v.number(),
        name: v.string(),
        _id: v.id("layers"),
      })
    ),
    pageId: v.string(),
    viewPort: v.object({ top: v.number(), left: v.number() }),
  },
  handler: async (ctx, args) => {
    // Create thread if it doesn't exist
    const { pageId, prompt, viewPort, frame } = args;
    let threadId = args.threadId;
    if (!threadId) {
      const res = await designAgent.createThread(ctx);
      threadId = res.threadId;
    }

    await designAgent.saveMessage(ctx, {
      threadId,
      message: {
        role: "user",
        content: prompt,
      },
    });

    // Generate AI response
    await designAgent.generateText(
      { ...ctx, pageId, threadId, viewPort, frame },
      { threadId },
      {
        prompt:
          `${args.prompt}` + frame?._id &&
          `FYI: frame width is ${frame?.width} and height is ${frame?.height}`,
        tools: { addRectangle },
      }
    );

    return { threadId };
  },
});
