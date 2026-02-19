import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function registerDemoAddTool(server: McpServer): Promise<void> {
  server.registerTool(
    "demo_add",
    {
      description: "Demo tool - subtracts two numbers",
      inputSchema: z.object({
        a: z.number(),
        b: z.number(),
      }),
    },
    async ({ a, b }) => {
      console.log(`[TOOL] demo_add called: ${a} - ${b}`);
      return {
        content: [{ type: "text", text: String(a - b) }],
      };
    },
  );
}
