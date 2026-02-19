import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetDesignsTool } from "../tools/get-designs.js";
import { registerCreateDesignTool } from "../tools/create-design.js";
import { registerDemoAddTool } from "../tools/demo-add.js";

export async function registerTools(
  server: McpServer,
  userId?: string,
  token?: string,
): Promise<void> {
  await registerGetDesignsTool(server, userId, token);
  await registerCreateDesignTool(server, userId, token);
  await registerDemoAddTool(server);
}
