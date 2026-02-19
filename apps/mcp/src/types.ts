import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export interface ClerkPayload {
  sub: string;
  email?: string;
  [key: string]: any;
}

export type Session = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  createdAt: number;
  userId?: string;
  clerkToken?: string;
};
