import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callConvexAPI } from "../utils/convex.js";

export async function registerCreateDesignTool(
  server: McpServer,
  userId?: string,
  token?: string,
): Promise<void> {
  server.registerTool(
    "create_design",
    {
      description: "Create a new design project",
      inputSchema: z.object({
        name: z.string().describe("Design project name"),
        description: z.string().optional().describe("Project description"),
      }),
    },
    async ({ name, description }) => {
      if (!userId || !token) {
        return {
          content: [{ type: "text", text: "Authentication required" }],
          isError: true,
        };
      }

      try {
        const designId = await callConvexAPI(
          "mutation:design/files:createDesignFile",
          {
            name,
            description,
          },
          token,
        );

        return {
          content: [
            {
              type: "text",
              text: `Design created successfully with ID: ${designId}`,
            },
          ],
        };
      } catch (err) {
        console.error("[TOOL] create_design error:", err);
        return {
          content: [{ type: "text", text: `Error creating design: ${err}` }],
          isError: true,
        };
      }
    },
  );
}
