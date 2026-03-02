import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetDesignsTool } from "./tools/get-designs";
import { registerCreateDesignTool } from "./tools/create-design";
import { registerDemoAddTool } from "./tools/demo-add";

export async function registerTools(
  server: McpServer,
  userId?: string,
  token?: string,
): Promise<void> {
  await registerGetDesignsTool(server, userId, token);
  await registerCreateDesignTool(server, userId, token);
  await registerDemoAddTool(server);
}
