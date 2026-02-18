import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple Transport Implementation
class SimpleTransport implements Transport {
  sessionId: string;
  controller: ReadableStreamDefaultController | null = null;
  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async start() {
    // No-op
  }

  async send(message: JSONRPCMessage) {
    if (this.controller) {
      const data = JSON.stringify(message);
      const event = `event: message\ndata: ${data}\n\n`;
      this.controller.enqueue(new TextEncoder().encode(event));
    }
  }

  async close() {
    if (this.controller) {
      try {
        this.controller.close();
      } catch (e) {}
    }
    if (this.onclose) {
      this.onclose();
    }
  }
}

// Global map
const transportMap = new Map<string, SimpleTransport>();

function createServer() {
  const server = new McpServer({
    name: "Simple AI Agent",
    version: "1.0.0",
  });

  server.registerTool("ping", { inputSchema: z.object({}) }, async () => {
    console.log("[MCP] Ping!");
    return { content: [{ type: "text", text: "pong" }] };
  });
  
  server.registerTool("echo", { inputSchema: z.object({ message: z.string() }) }, async ({ message }) => {
    console.log(`[MCP] Echo: ${message}`);
    return { content: [{ type: "text", text: `Echo: ${message}` }] };
  });

  return server;
}

export async function GET(req: NextRequest) {
  const sessionId = "sess-" + Date.now();
  const transport = new SimpleTransport(sessionId);
  transportMap.set(sessionId, transport);

  const stream = new ReadableStream({
    start: async (controller) => {
      transport.controller = controller;
      console.log(`[MCP] Session started: ${sessionId}`);

      // Send endpoint
      const endpoint = `/api/mcp?sessionId=${sessionId}`; // Ensure this matches user's expectation or config
      const event = `event: endpoint\ndata: ${endpoint}\n\n`;
      controller.enqueue(new TextEncoder().encode(event));

      const server = createServer();
      await server.connect(transport);

      transport.onclose = () => {
        console.log(`[MCP] Session closed: ${sessionId}`);
        transportMap.delete(sessionId);
      };
    },
    cancel: () => {
      transport.close();
    }
  });

  return new Response(stream, {
    headers: corsHeaders({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }),
  });

}


function corsHeaders(extra: Record<string, string> = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}


export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    
    // Log the request
    console.log(`[MCP POST] Session: ${sessionId}`);
    
    if (!sessionId || !transportMap.has(sessionId)) {
      console.error(`[MCP POST] Invalid session: ${sessionId}`);
      return new Response("Session not found", { status: 404 });
    }

    const body = await req.json();
    console.log("[MCP POST] Body:", JSON.stringify(body));

    const transport = transportMap.get(sessionId)!;
    if (transport.onmessage) {
      // The SDK's server.connect() sets onmessage. We forward the message to it.
      await transport.onmessage(body);
    }

    return new Response("Accepted", {
      status: 202,
      headers: corsHeaders(),
    });
  } catch (e) {
    console.error("[MCP POST] Error:", e);
    return new Response(String(e), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}
