import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Session } from "../types.js";
import { registerTools } from "./tools-registry.js";

export async function createSession(
  sessionId: string,
  userId?: string,
  token?: string,
): Promise<Session> {
  console.log(
    `[SESSION] Creating new session: ${sessionId}${userId ? ` for user ${userId}` : ""}`,
  );

  const server = new McpServer({
    name: "Infrabro MCP",
    version: "1.0.0",
  });

  // Register all tools for this server instance
  await registerTools(server, userId, token);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => sessionId,
  });

  await server.connect(transport);

  return {
    server,
    transport,
    createdAt: Date.now(),
    userId,
    clerkToken: token,
  };
}

export function cleanupOldSessions(
  sessions: Map<string, Session>,
  maxAge: number,
): void {
  const now = Date.now();

  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > maxAge) {
      console.log(`[CLEANUP] Removing session: ${id}`);
      sessions.delete(id);
    }
  }
}
