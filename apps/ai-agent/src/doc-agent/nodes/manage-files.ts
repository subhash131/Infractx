import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateAnnotation, callAI, ChatMessage } from "../index";
import { api } from "@workspace/backend/_generated/api";
import { getConvexClient } from "../convex-client";
import { generateKeyBetween } from "fractional-indexing";
import { buildChildBlocks, uid } from "../tools/add-database-smart-block";

export async function manageFiles(state: typeof AgentStateAnnotation.State, config: RunnableConfig) {
  console.log("📁 Managing files...");
  
  const { docId, userMessage, sessionToken } = state;
  if (!docId) return { error: "No document ID available." };

  try {
    const client = getConvexClient(sessionToken);

    // 1. Fetch current file tree for context
    const existingFiles = await client.query(api.requirements.textFiles.getFilesByDocumentId, {
      documentId: docId as any
    });

    // Formatting file tree for LLM
    const filesRepresentation = existingFiles.map((f: any) => ({
      id: f._id,
      title: f.title,
      type: f.type,
      parentId: f.parentId
    }));

    const prompt = `
You are a File Management AI Assistant. Your task is to plan file and folder operations based on the user's request.

User Request: "${userMessage}"

Current Document File Tree:
${JSON.stringify(filesRepresentation, null, 2)}

Instructions:
1. Analyze the request. Does the user want to create, delete, rename, move, or generate files/folders?
2. If the user asks for high-level generative docs (e.g., "design a system architecture"), break this down into a low-level, detailed roadmap folder hierarchy and multiple files, providing detailed 'content' for each file. 
3. Only use existing parentIds if placing inside existing folders. If creating new nested folders, assign a temporary ID (e.g., "temp_1") to the folder, and use that temporary ID as the parentId for its children.
4. Output a list of operations in valid JSON format.
5. For FILE creation content, DO NOT use markdown strings. You MUST output an array of "Smart Blocks", where each block has a title and an array of inner content items (paragraph, heading, bulletList, table).

Supported Operations:
- delete: { "action": "delete", "fileId": string }
- rename: { "action": "rename", "fileId": string, "title": string }
- move: { "action": "move", "fileId": string, "parentId": string | null }
- create: { 
    "action": "create", 
    "type": "FILE" | "FOLDER", 
    "title": string, 
    "parentId"?: string | "temp_X", 
    "tempId"?: "temp_X", 
    "content"?: [ 
       { 
         "title": "Section Title", 
         "content": [ 
           { "kind": "paragraph", "text": "A descriptive paragraph." }, 
           { "kind": "heading", "level": 2, "text": "Sub-section heading" },
           { "kind": "bulletList", "items": ["Item 1", "Item 2"] } 
         ] 
       } 
    ]
  }

Return ONLY the valid JSON array (NO MARKDOWN WRAPPERS):
[
  { "action": "create", "type": "FOLDER", "title": "backend", "tempId": "temp_1" },
  { "action": "create", "type": "FILE", "title": "schema", "parentId": "temp_1", "content": [{ "title": "Database Schema", "content": [{ "kind": "paragraph", "text": "Overview of schema" }] }] }
]
`;

    const messages: ChatMessage[] = state.chatHistory?.length > 0 
      ? state.chatHistory.slice(-5).map((m: any) => ({
          role: m.role?.toLowerCase() === 'user' ? 'user' : 'assistant',
          content: m.content || ""
      }))
      : [];
      
    messages.push({ role: "user" as const, content: prompt });

    const operationsList = await callAI(messages, { returnJson: true, config });
    console.log("File Operations Planned:", JSON.stringify(operationsList, null, 2));

    if (!Array.isArray(operationsList)) {
      throw new Error("Invalid output format from LLM, expected array.");
    }

    const tempIdMap = new Map<string, string>(); // Maps tempId to real Convex ID
    let actionCount = 0;

    // 2. Execute Operations
    for (const op of operationsList) {
      if (op.action === "create") {
        let parentIdToUse = op.parentId;
        if (parentIdToUse && parentIdToUse.startsWith("temp_")) {
          parentIdToUse = tempIdMap.get(parentIdToUse);
        }

        const newId = await client.mutation(api.requirements.textFiles.create, {
          title: op.title,
          documentId: docId as any,
          type: op.type,
          parentId: parentIdToUse ? (parentIdToUse as any) : undefined
        });

        if (op.tempId) {
          tempIdMap.set(op.tempId, newId);
        }
        
        // Insert initial block content if provided
        if (op.type === "FILE" && Array.isArray(op.content) && op.content.length > 0) {
          let currentRank = generateKeyBetween(null, null);
          // Single rolling rank shared across ALL child blocks in this file
          // so no two blocks ever get the same rank value
          let globalChildRank = generateKeyBetween(null, null);
          const allBlocks = [];
          
          for (const sb of op.content) {
            const smartBlockId = uid();
            
            const smartBlockRecord = {
               externalId: smartBlockId,
               type: "smartBlock",
               props: {},
               content: [{ type: "text", text: sb.title }],
               rank: currentRank,
               parentId: null,
               approvedByHuman: false,
            };
            
            const childBlocks = buildChildBlocks(sb.content, smartBlockId, globalChildRank);
            
            // Advance the global child rank past all the ranks used by this SmartBlock's children
            const lastChildRank = childBlocks.at(-1)?.rank ?? globalChildRank;
            
            const trailingParagraph = {
               externalId: uid(),
               type: "paragraph",
               props: { textAlign: null },
               content: [],
               rank: generateKeyBetween(lastChildRank, null),
               parentId: smartBlockId,
               approvedByHuman: false,
            };
            
            // Update global child rank so the next SmartBlock's children start after this one
            globalChildRank = generateKeyBetween(trailingParagraph.rank, null);
            
            allBlocks.push(smartBlockRecord, ...childBlocks, trailingParagraph);
            currentRank = generateKeyBetween(currentRank, null);
          }
          
          if (allBlocks.length > 0) {
            console.log("📝 [manageFiles] Inserting SmartBlocks into DB:", JSON.stringify(allBlocks, null, 2));
            await client.mutation(api.requirements.textFileBlocks.bulkCreate, {
              textFileId: newId,
              blocks: allBlocks,
            });
          }
        }
        actionCount++;
      } else if (op.action === "delete") {
        await client.mutation(api.requirements.textFiles.deleteFile, {
          fileId: op.fileId as any
        });
        actionCount++;
      } else if (op.action === "rename" || op.action === "move") {
        await client.mutation(api.requirements.textFiles.updateFile, {
          fileId: op.fileId as any,
          title: op.title,
          parentId: op.parentId !== undefined ? op.parentId : undefined
        });
        actionCount++;
      }
    }

    // 3. Output Chat Response to Frontend
    const summaryMsg = `I have completed ${actionCount} file operation(s) based on your request.`;
    
    return {
      operations: [{
        type: 'chat_response',
        position: state.cursorPosition || 0,
        content: summaryMsg
      }]
    };

  } catch (error) {
    console.error("Manage files failed:", error);
    return { 
      operations: [{
        type: 'chat_response',
        position: state.cursorPosition || 0,
        content: "Sorry, I encountered an error while managing the files."
      }],
      error: "Failed to manage files"
    };
  }
}
