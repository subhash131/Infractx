import {
  PersistentTextStreaming,
  StreamWriter,
} from "@convex-dev/persistent-text-streaming";
import { StreamId } from "@convex-dev/persistent-text-streaming";
import { components } from "./_generated/api";
import { httpAction, query } from "./_generated/server";
import { GenericActionCtx } from "convex/server";
import { StreamIdValidator } from "@convex-dev/persistent-text-streaming";

const persistentTextStreaming = new PersistentTextStreaming(
  components.persistentTextStreaming
);

export const streamChat = httpAction(async (ctx, request) => {
  const body = (await request.json()) as {
    streamId: string;
    conversationId: string;
    userMessage: string;
  };

  const generateChat: StreamWriter<GenericActionCtx<any>> = async (
    ctx,
    request,
    streamId,
    chunkAppender
  ) => {
    try {
      const message = "Hello! How can I help you today?";

      // Stream the response character by character
      for (let i = 0; i < message.length; i++) {
        await chunkAppender(message[i]);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error("Chat generation error:", error);
      await chunkAppender("Sorry, an error occurred.");
    }
  };

  const response = await persistentTextStreaming.stream(
    ctx,
    request,
    body.streamId as StreamId,
    generateChat
  );

  // Set CORS headers
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Vary", "Origin");
  return response;
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
