import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { streamChat } from "./chat";

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
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

// Handle actual POST request
http.route({
  path: "/chat-stream",
  method: "POST",
  handler: streamChat,
});

export default http;
