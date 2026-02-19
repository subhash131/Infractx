import express from "express";
import cors from "cors";
import crypto from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const app = express();
const port = 3001;

app.use(
  cors({
    // Allow local MCP Inspector/dev origins and non-browser clients.
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowedOrigins = new Set([
        "http://localhost:6274",
        "http://127.0.0.1:6274",
      ]);
      callback(null, allowedOrigins.has(origin));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "mcp-session-id",
      "mcp-protocol-version",
      "Accept",
      "Cache-Control",
    ],
    exposedHeaders: ["mcp-session-id"],
  }),
);

app.use(express.json());

type Session = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  createdAt: number;
};

const sessions = new Map<string, Session>();

/* =========================
   Create MCP Server Per Session
========================= */

async function createSession(sessionId: string): Promise<Session> {
  console.log(`[SESSION] Creating new session: ${sessionId}`);

  const server = new McpServer({
    name: "Infrabro MCP",
    version: "1.0.0",
  });

  // Register tools per server instance
  server.registerTool(
    "add",
    {
      inputSchema: z.object({
        a: z.number(),
        b: z.number(),
      }),
    },
    async ({ a, b }) => {
      console.log(`[TOOL] add called: ${a} - ${b}`);
      return {
        content: [{ type: "text", text: String(a - b) }],
      };
    },
  );

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
  });

  await server.connect(transport);

  return {
    server,
    transport,
    createdAt: Date.now(),
  };
}

/* =========================
   MCP Endpoint
========================= */
app.all("/mcp", async (req, res) => {
  try {
    const existingSessionId = req.headers["mcp-session-id"] as
      | string
      | undefined;

    // Detect if this is an initialize request
    const isInitialize =
      req.method === "POST" && req.body?.method === "initialize";

    let sessionId: string;

    if (isInitialize || !existingSessionId) {
      // Always create a fresh session for initialize requests
      sessionId = crypto.randomUUID();
      console.log(`\n[REQUEST] POST /mcp | New session=${sessionId}`);
      const session = await createSession(sessionId);
      sessions.set(sessionId, session);
      res.setHeader("mcp-session-id", sessionId);
      await session.transport.handleRequest(req, res, req.body);
    } else {
      sessionId = existingSessionId;
      console.log(`\n[REQUEST] ${req.method} /mcp | session=${sessionId}`);
      const session = sessions.get(sessionId);
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      res.setHeader("mcp-session-id", sessionId);
      if (req.method === "GET") {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        await session.transport.handleRequest(req, res);
      } else {
        await session.transport.handleRequest(req, res, req.body);
      }
    }

    console.log(`[RESPONSE] Done for session=${sessionId}`);
  } catch (err) {
    console.error("[ERROR]", err);
    res.status(500).json({ error: "Internal MCP server error" });
  }
});

/* =========================
   Cleanup Old Sessions
========================= */

setInterval(
  () => {
    const now = Date.now();
    const MAX_AGE = 1000 * 60 * 30;

    for (const [id, session] of sessions.entries()) {
      if (now - session.createdAt > MAX_AGE) {
        console.log(`[CLEANUP] Removing session: ${id}`);
        sessions.delete(id);
      }
    }
  },
  1000 * 60 * 10,
);

app.options("/mcp", (_, res) => {
  res.sendStatus(200);
});

/* =========================
   Start Server
========================= */

app.listen(port, () => {
  console.log(`🚀 MCP server running at http://localhost:${port}/mcp`);
});
