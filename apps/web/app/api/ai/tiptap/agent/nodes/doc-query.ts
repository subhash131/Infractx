import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DocumentAgentStateType, DocumentResult, TextFileResult, BlockResult } from "../state";
import {
  listProjectDocuments,
  getDocumentFiles,
  getFileBlocks,
  searchBlockContent,
} from "../tools";

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.2,
});

/**
 * Document Query Node — Searches, retrieves, and explains document content.
 */
export async function docQueryNode(
  state: DocumentAgentStateType
): Promise<Partial<DocumentAgentStateType>> {
  console.log(`[DOC_QUERY] Query: "${state.userQuery}"`);

  // Step 1: Search for relevant content
  let searchResults = "";
  let documentResults: DocumentResult[] = [];

  try {
    // First, list all documents in the project
    const docsResult = await listProjectDocuments.invoke({
      projectId: state.projectId,
    });
    const docs = JSON.parse(docsResult);

    // Search across block content
    const searchResult = await searchBlockContent.invoke({
      projectId: state.projectId,
      searchTerm: state.userQuery,
    });
    searchResults = searchResult;

    // Fetch full content of TEXT documents
    for (const doc of docs.documents || []) {
      if (doc.type !== "TEXT") continue;

      const filesResult = await getDocumentFiles.invoke({
        documentId: doc.documentId,
      });
      const files = JSON.parse(filesResult);

      const docResult: DocumentResult = {
        documentId: doc.documentId,
        title: doc.title,
        description: doc.description,
        type: doc.type,
        files: [],
      };

      for (const file of files.files || []) {
        if (file.type !== "FILE") continue;

        const blocksResult = await getFileBlocks.invoke({
          fileId: file.fileId,
        });
        const blocks = JSON.parse(blocksResult);

        const fileResult: TextFileResult = {
          fileId: file.fileId,
          title: file.title,
          type: file.type,
          blocks: (blocks.blocks || []).map((b: any): BlockResult => ({
            externalId: b.externalId,
            type: b.type,
            content: b.content,
            props: b.props,
            rank: b.rank,
            parentId: b.parentId,
          })),
        };

        docResult.files!.push(fileResult);
      }

      documentResults.push(docResult);
    }
  } catch (error) {
    console.error("[DOC_QUERY] Error fetching documents:", error);
  }

  // Step 2: Use LLM to explain the retrieved content
  const contextStr = JSON.stringify(documentResults, null, 2);
  const searchStr = searchResults || "No specific search results.";

  const systemPrompt = `You are a document analysis assistant. The user is asking about documents in their project.

Available Documents & Content:
${contextStr}

Search Results:
${searchStr}

Instructions:
- Answer the user's question based on the document content above
- If they ask to "show" a document, summarize its structure and key content
- If they ask about a specific section, find and explain it
- Reference specific block types (headings, paragraphs, smartBlocks) when relevant
- SmartBlocks are special collapsible sections with a header and nested child blocks
- If the requested document/content is not found, say so clearly`;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(state.userQuery),
    ]);

    const responseText = response.content.toString();
    console.log(`[DOC_QUERY] Response generated (${responseText.length} chars)`);

    return {
      response: responseText,
      documentResults,
      messages: [
        new HumanMessage(state.userQuery),
        response,
      ],
    };
  } catch (error) {
    console.error("[DOC_QUERY] Error generating response:", error);
    return {
      response: "I encountered an error while searching your documents. Please try again.",
      errors: [`DocQuery node error: ${error}`],
    };
  }
}
