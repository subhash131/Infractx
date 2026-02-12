import { tool } from "@langchain/core/tools";
import { z } from "zod";

// ============================================
// STUB TOOLS — Convex data access
// Replace console.log / hardcoded returns with real Convex HTTP client calls later
// ============================================

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

export const getDocumentFiles = tool(
  async ({ documentId }) => {
    console.log(`[TOOL] getDocumentFiles called with documentId: ${documentId}`);

    // TODO: Replace with ConvexHttpClient call to requirements.textFiles.getFilesByDocumentId
    const stubResult = {
      documentId,
      files: [
        {
          fileId: "file_stub_1",
          title: "main.md",
          type: "FILE",
        },
        {
          fileId: "file_stub_2",
          title: "appendix",
          type: "FOLDER",
        },
      ],
    };

    return JSON.stringify(stubResult, null, 2);
  },
  {
    name: "getDocumentFiles",
    description:
      "Get all text files and folders within a document. Returns file IDs, titles, and types (FILE or FOLDER).",
    schema: z.object({
      documentId: z
        .string()
        .describe("The document ID to get files for"),
    }),
  }
);

export const getFileBlocks = tool(
  async ({ fileId }) => {
    console.log(`[TOOL] getFileBlocks called with fileId: ${fileId}`);

    // TODO: Replace with ConvexHttpClient call to requirements.textFileBlocks.getBlocksByFileId
    const stubResult = {
      fileId,
      blocks: [
        {
          externalId: "block_stub_1",
          type: "heading",
          content: [{ type: "text", text: "Introduction" }],
          props: { level: 1 },
          rank: "a0",
          parentId: null,
        },
        {
          externalId: "block_stub_2",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is the main requirements document for the project.",
            },
          ],
          props: {},
          rank: "a1",
          parentId: null,
        },
        {
          externalId: "block_stub_3",
          type: "smartBlock",
          content: [{ type: "text", text: "Feature: User Authentication" }],
          props: {},
          rank: "a2",
          parentId: null,
        },
        {
          externalId: "block_stub_4",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Users should be able to sign in with email and OAuth.",
            },
          ],
          props: {},
          rank: "a0",
          parentId: "block_stub_3",
        },
      ],
    };

    return JSON.stringify(stubResult, null, 2);
  },
  {
    name: "getFileBlocks",
    description:
      "Get all blocks (content) in a text file. Returns blocks with their type, content, props, rank, and parentId. SmartBlocks have children linked via parentId.",
    schema: z.object({
      fileId: z.string().describe("The text file ID to get blocks for"),
    }),
  }
);

export const searchBlockContent = tool(
  async ({ projectId, searchTerm }) => {
    console.log(
      `[TOOL] searchBlockContent called with projectId: ${projectId}, searchTerm: ${searchTerm}`
    );

    // TODO: Replace with a custom Convex query that searches block content
    const stubResult = {
      searchTerm,
      matches: [
        {
          documentTitle: "Technical Requirements",
          fileTitle: "main.md",
          block: {
            externalId: "block_stub_2",
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "This is the main requirements document for the project.",
              },
            ],
            rank: "a1",
            parentId: null,
          },
        },
      ],
    };

    return JSON.stringify(stubResult, null, 2);
  },
  {
    name: "searchBlockContent",
    description:
      "Search for blocks containing specific text or of a specific type within a project's documents. Useful for finding relevant content across all documents.",
    schema: z.object({
      projectId: z.string().describe("The project ID to search within"),
      searchTerm: z
        .string()
        .describe("The text to search for in block content"),
    }),
  }
);

export const createDocumentDraft = tool(
  async ({ projectId, title, blocks }) => {
    console.log(
      `[TOOL] createDocumentDraft called — title: ${title}, blocks: ${blocks.length}`
    );
    console.log("[TOOL] Draft blocks:", JSON.stringify(blocks, null, 2));

    // TODO: Replace with real Convex mutations:
    // 1. documents.create() to create the document
    // 2. textFiles.create() to create the text file
    // 3. textFileBlocks.bulkCreate() to insert all blocks

    const stubResult = {
      success: true,
      documentId: "doc_draft_stub",
      title,
      blockCount: blocks.length,
      message: `Draft "${title}" created with ${blocks.length} blocks.`,
    };

    return JSON.stringify(stubResult, null, 2);
  },
  {
    name: "createDocumentDraft",
    description:
      "Create a new document draft with structured blocks. Each block must have a type (paragraph, heading, smartBlock, bulletListItem, numberedListItem, codeBlock), content (inline nodes), props, rank, and parentId (null for root blocks, or the parent smartBlock's ID for nested blocks).",
    schema: z.object({
      projectId: z.string().describe("The project ID to create the document in"),
      title: z.string().describe("Title of the new document"),
      blocks: z
        .array(
          z.object({
            type: z.string().describe("Block type: paragraph, heading, smartBlock, bulletListItem, numberedListItem, codeBlock"),
            content: z.any().describe("Inline content array, e.g. [{type: 'text', text: '...'}]"),
            props: z
              .record(z.any())
              .describe("Block properties, e.g. {level: 2} for headings"),
            rank: z.string().describe("Fractional index for ordering, e.g. 'a0', 'a1'"),
            parentId: z
              .string()
              .nullable()
              .describe("null for root blocks, parent block ID for nested SmartBlock children"),
          })
        )
        .describe("Array of blocks to create"),
    }),
  }
);

// All tools exported as an array for binding to the LLM
export const allDocumentTools = [
  listProjectDocuments,
  getDocumentFiles,
  getFileBlocks,
  searchBlockContent,
  createDocumentDraft,
];
