import { PersistentTextStreaming } from "@convex-dev/persistent-text-streaming";
import { StreamId } from "@convex-dev/persistent-text-streaming";
import { components } from "./_generated/api";
import { httpAction, mutation, query } from "./_generated/server";
import { StreamIdValidator } from "@convex-dev/persistent-text-streaming";
import { ConvexError } from "convex/values";

const persistentTextStreaming = new PersistentTextStreaming(
  components.persistentTextStreaming
);

export const streamChat = httpAction(async (ctx, request) => {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const textEncoder = new TextEncoder();
  const identity = await ctx.auth.getUserIdentity();

  const body = (await request.json()) as { streamId: string };

  const streamContent = async () => {
    console.log({ request: body.streamId });
    const message =
      "This is a hardcoded stream. No database used! This is a hardcoded stream. No database used! This is a hardcoded stream. No database used!";

    const parts = message.split(" ");
    for (const part of parts) {
      await writer.write(textEncoder.encode(part + " "));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await writer.close();
  };

  void streamContent();

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

/**
 * Retrieves the current body of a stream from the database.
 * This is called by the `useStream` hook on the frontend to
 * ensure the client has the most up-to-date persisted text.
 */
export const getStreamBody = query({
  args: {
    streamId: StreamIdValidator,
  },
  handler: async (ctx, args) => {
    return await persistentTextStreaming.getStreamBody(
      ctx,
      args.streamId as StreamId
    );
  },
});

export const createStream = mutation({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    const streamId = await persistentTextStreaming.createStream(ctx);
    return streamId;
  },
});
