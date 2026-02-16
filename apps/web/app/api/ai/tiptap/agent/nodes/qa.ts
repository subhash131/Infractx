import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DocumentAgentStateType } from "../state";
import { listProjectDocuments, getDocumentFiles, getFileBlocks } from "../tools";

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.3,
});

/**
 * General QA Node — Answers general questions about the project using available document context.
 */
export async function qaNode(
  state: DocumentAgentStateType
): Promise<Partial<DocumentAgentStateType>> {
  console.log(`[QA] Answering general question: "${state.userQuery}"`);

  // Fetch project documents for context
  let projectContext = "No project context available.";
  let projectNotFound = false;
  try {
    const docsResult = await listProjectDocuments.invoke({
      projectId: state.projectId,
    });
    const docs = JSON.parse(docsResult);

    // Check if the project was found
    if (docs.error === "project_not_found") {
      projectNotFound = true;
      projectContext = `PROJECT NOT FOUND: ${docs.message}\nAvailable projects: ${JSON.stringify(docs.availableProjects)}`;
      console.log(`[QA] Project not found: ${state.projectId}`);
    } else {
      // Fetch content from the first TEXT document for context
      const textDoc = docs.documents?.find((d: any) => d.type === "TEXT");
      if (textDoc) {
        const filesResult = await getDocumentFiles.invoke({
          documentId: textDoc.documentId,
        });
        const files = JSON.parse(filesResult);

        const firstFile = files.files?.[0];
        if (firstFile) {
          const blocksResult = await getFileBlocks.invoke({
            fileId: firstFile.fileId,
          });
          projectContext = `Project: ${docs.projectName}\nDescription: ${docs.description || "No description available."}\nDocuments:\n${docsResult}\n\nDocument content:\n${blocksResult}`;
        }
      }
    }
  } catch (error) {
    console.warn("[QA] Failed to fetch project context:", error);
  }

  const systemPrompt = projectNotFound
    ? `You are a helpful project assistant. The user provided an invalid or unknown project ID.
You MUST ask the user to provide the correct project name or select from available projects.
Do NOT make up information about a project that doesn't exist.

${projectContext}`
    : `You are a helpful project assistant. Answer the user's question based on the available project context.
If you don't have enough context from the documents, provide a helpful general answer and mention that you'd need access to more specific documents for a detailed answer.

Project Context:
${projectContext}`;

  try {
    // Build conversation with history from previous turns
    const conversationMessages = [
      new SystemMessage(systemPrompt),
      ...(state.messages ?? []),       // accumulated history from checkpointer
      new HumanMessage(state.userQuery), // current turn
    ];

    const response = await llm.invoke(conversationMessages);

    const responseText = response.content.toString();
    console.log(`[QA] Response generated (${responseText.length} chars)`);

    return {
      response: responseText,
      messages: [
        new HumanMessage(state.userQuery),
        response,
      ],
    };
  } catch (error: any) {
    console.error("[QA] Error generating response:", error?.message || error);
    console.error("[QA] Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return {
      response: `I encountered an error: ${error?.message || "Unknown error"}. Please check server logs.`,
      errors: [`QA node error: ${error?.message || error}`],
    };
  }
}
