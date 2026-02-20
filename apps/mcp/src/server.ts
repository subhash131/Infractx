import express, { Request, Response } from "express";
import cors from "cors";
import crypto from "crypto";
import {
  port,
  CORS_ALLOWED_ORIGINS,
  SESSION_CLEANUP_INTERVAL,
  SESSION_MAX_AGE,
} from "./config.js";
import { Session } from "./types.js";
import { extractAuthToken, resolveAuth } from "./utils/auth.js";
import { createSession, cleanupOldSessions } from "./utils/session.js";

const app = express();

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, CORS_ALLOWED_ORIGINS.has(origin));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "mcp-session-id",
      "mcp-protocol-version",
      "Accept",
      "Cache-Control",
    ],
    exposedHeaders: ["mcp-session-id"],
  }),
);

app.use(express.json());

/* =========================
   Global State
========================= */

const sessions = new Map<string, Session>();

/* =========================
   MCP Endpoint
========================= */

app.options("/mcp", (_, res) => {
  res.sendStatus(204);
});

app.all("/mcp", async (req: Request, res: Response) => {
  try {
    const existingSessionId = req.headers["mcp-session-id"] as string | undefined;
    
    console.log(`\n[DEBUG] ${req.method} ${req.url}`);
    console.log(`[DEBUG] Headers:`, JSON.stringify(req.headers, null, 2));
    
    const authToken = extractAuthToken(req);

    // Detect if this is an initialize request
    const isInitialize = req.method === "POST" && req.body?.method === "initialize";

    let sessionId: string;

    if (isInitialize || !existingSessionId) {
      // Resolve auth context
      const authContext = authToken ? await resolveAuth(authToken) : null;

      if (!authContext) {
        console.warn(`[AUTH] Refusing session initialization: No valid auth token provided`);
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      // Create a fresh session for initialize requests
      sessionId = crypto.randomUUID();
      console.log(
        `\n[REQUEST] ${req.method} /mcp | New session=${sessionId} | Auth: user=${authContext.userId}`,
      );

      const session = await createSession(sessionId, authContext);
      sessions.set(sessionId, session);

      res.setHeader("mcp-session-id", sessionId);

      if (req.method === "GET") {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        await session.transport.handleRequest(req, res);
      } else {
        await session.transport.handleRequest(req, res, req.body);
      }
    } else {

      sessionId = existingSessionId;
      const session = sessions.get(sessionId);

      if (!session) {
        console.error(`[REQUEST] Session not found: ${sessionId}`);
        res.status(404).json({ error: "Session not found" });
        return;
      }

      // Log session details
      console.log(
        `\n[REQUEST] ${req.method} /mcp | session=${sessionId}${session.userId ? ` | user=${session.userId}` : ""}${session.orgId ? ` | org=${session.orgId}` : ""}`,
      );

      // Check for token updates
      if (authToken) {
        const auth = await resolveAuth(authToken);
        if (auth && (!session.userId || session.userId !== auth.userId)) {
           console.log(`[AUTH] Updating session ${sessionId} context for user ${auth.userId}`);
           session.userId = auth.userId;
           session.orgId = auth.orgId;
           session.keyId = auth.keyId;
           session.clerkToken = auth.token;
        }
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
   Session Cleanup
========================= */

setInterval(() => {
  cleanupOldSessions(sessions, SESSION_MAX_AGE);
}, SESSION_CLEANUP_INTERVAL);

/* =========================
   Start Server
========================= */

app.listen(port, () => {
  console.log(`🚀 MCP server running at http://localhost:${port}/mcp`);
});
