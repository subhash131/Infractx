// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Handle preflight OPTIONS request
http.route({
  path: "/chat-stream",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*", //TODO: limit it to frontend in prod..
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// Handle actual POST request
http.route({
  path: "/chat-stream",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const textEncoder = new TextEncoder();

    const streamContent = async () => {
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
  }),
});

export default http;
