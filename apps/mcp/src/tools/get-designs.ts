import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callConvexAPI } from "../utils/convex.js";

export async function registerGetDesignsTool(
  server: McpServer,
  userId?: string,
  token?: string,
): Promise<void> {
  server.registerTool(
    "get_designs",
    {
      description: "Get all design projects owned by the authenticated user",
      inputSchema: z.object({}),
    },
    async () => {
      if (!userId || !token) {
        return {
          content: [{ type: "text", text: "Authentication required" }],
          isError: true,
        };
      }

      try {
        // Query Convex for user's designs
        const designs = await callConvexAPI(
          "query:design/files:getDesignFilesByOrgId",
          {},
          token,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(designs, null, 2),
            },
          ],
        };
      } catch (err) {
        console.error("[TOOL] get_designs error:", err);
        return {
          content: [{ type: "text", text: `Error fetching designs: ${err}` }],
          isError: true,
        };
      }
    },
  );
}
