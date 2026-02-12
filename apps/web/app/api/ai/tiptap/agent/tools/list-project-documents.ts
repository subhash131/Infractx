import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const listProjectDocuments = tool(
  async ({ projectId }) => {
    console.log(`[TOOL] listProjectDocuments called with projectId: ${projectId}`);
    // TODO: Replace with ConvexHttpClient call to projects.getProjectById
    // Stub: simulate known projects. Unknown IDs return not_found.
    const knownProjects: Record<string, any> = {
      proj_ecommerce_123: {
        projectId: "proj_ecommerce_123",
        projectName: "E-Commerce Platform",
        description:
          "A modern e-commerce platform with product catalog, shopping cart, checkout, user authentication, and order management. Built with Next.js, Convex, and Tiptap for rich document editing.",
        documents: [
          {
            documentId: "doc_stub_1",
            title: "Technical Requirements",
            description: "Main technical requirements document",
            type: "TEXT",
          },
          {
            documentId: "doc_stub_2",
            title: "Design Canvas",
            description: "Visual design canvas",
            type: "CANVAS",
          },
        ],
      },
    };

    const project = knownProjects[projectId];
    if (!project) {
      const availableProjects = Object.entries(knownProjects).map(
        ([id, p]) => ({ id, name: p.projectName })
      );
      return JSON.stringify(
        {
          error: "project_not_found",
          message: `No project found with ID "${projectId}". The project may not exist or the ID is incorrect.`,
          availableProjects,
          hint: "Ask the user for the correct project name or ID.",
        },
        null,
        2
      );
    }

    return JSON.stringify(project, null, 2);
  },
  {
    name: "listProjectDocuments",
    description:
      "List all documents in a project. Returns document IDs, titles, types (TEXT or CANVAS), and descriptions. If project is not found, returns an error with available projects.",
    schema: z.object({
      projectId: z.string().describe("The project ID to list documents for"),
    }),
  }
);
