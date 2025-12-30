"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { designAgent } from "./designAgent";
import { compressUIMessageChunks, DeltaStreamer } from "@convex-dev/agent";
import { components } from "../_generated/api";

import { PersistentTextStreaming } from "@convex-dev/persistent-text-streaming";

const persistentTextStreaming = new PersistentTextStreaming(
  components.persistentTextStreaming
);

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
    const streamer = new DeltaStreamer(
      components.agent,
      ctx,
      {
        throttleMs: 100, // Provide a callback for when the stream is aborted
        onAsyncAbort: async (reason: string) => {
          console.error("Stream aborted:", reason);
        },
        // Pass undefined if you don't have an external abort signal
        abortSignal: undefined,
        // Use the provided compression utility or null
        compress: compressUIMessageChunks,
      },
      {
        threadId: args.threadId ?? "default_thread",
        format: "TextStreamPart",
        order: Date.now(),
        stepOrder: 0,
        userId: undefined,
      }
    );

    const res = await designAgent.stream(
      {
        convexState: ctx,
        userInput: "What is the capital of France?",
        decision: "",
        result: "",
        messages: [],
      },
      { streamMode: "updates", subgraphs: true }
    );

    for await (const [chunks] of await designAgent.stream(
      {
        convexState: ctx,
        userInput: "What is the capital of France?",
        decision: "",
        result: "",
        messages: [],
      },
      { streamMode: "updates", subgraphs: true }
    )) {
      console.log(chunks);
      chunks.forEach((chunk) => {
        console.log(chunk);

        // void streamer.consumeStream(chunk);
      });
    }

    return { streamId: await streamer.getStreamId() };
  },
});
