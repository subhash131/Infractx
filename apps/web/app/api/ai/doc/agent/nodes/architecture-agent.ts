import { RunnableConfig } from "@langchain/core/runnables";
import { AgentStateAnnotation, ChatMessage, EditOperation } from "../index";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { ChatGroq } from "@langchain/groq";
import { createFileTool, deleteFileTool, renameFileTool } from "../tools/file-tools";
import { addDatabaseSmartBlockTool } from "../tools/add-database-smart-block";
import { addSmartBlockMentionTool } from "../tools/add-smart-block-mention";
import { listFiles } from "../context-tools";
import { StructuredToolInterface } from "@langchain/core/tools";

const tools = [
    createFileTool,
    deleteFileTool,
    renameFileTool,
    addDatabaseSmartBlockTool,
    addSmartBlockMentionTool
];

export async function architectureAgent(state: typeof AgentStateAnnotation.State, config: RunnableConfig) {
    console.log("🏛️ Running Architecture Agent for System Design...");

    const { docId, userMessage, sessionToken } = state;
    if (!docId) return { error: "No document ID available." };

    try {
        // Fetch current document context
        const existingFiles = await listFiles(docId, sessionToken);

        const prompt = `You are a Senior Systems Architecture Agent. Your ONLY job is to scaffold a system design using the provided tools.

User Request: "${userMessage}"

Active Document ID: "${docId}"

Current Document File Tree:
${JSON.stringify(existingFiles, null, 2)}

## STRICT EXECUTION RULES

### Step 1 — Create root folders
Call \`create_file\` (type: "FOLDER") for each top-level folder. Wait for results.

### Step 2 — Create files inside folders
Using the EXACT \`fileId\` values returned in Step 1 as \`parentId\`, create the specific files (type: "FILE"). Wait for results.

### Step 3 — Populate EVERY file with content (MANDATORY)
For EVERY file created in Step 2, call \`add_database_smart_block\` using the EXACT \`fileId\` returned by that file's \`create_file\` call.
- **DO NOT skip this step for any file.**
- **DO NOT use placeholder IDs.**
- Provide a descriptive \`title\` and a rich \`content\` array.

### Step 4 — Insert inline mentions
Call \`add_smart_block_mention\` for the key files so the user has quick links.

## add_database_smart_block — content schema

The \`content\` field is a structured array, NOT a markdown string. Use these block kinds:

\`\`\`
{ kind: "paragraph", text: "..." }
{ kind: "heading", level: 1|2|3, text: "..." }
{ kind: "bulletList", items: ["item1", "item2", ...] }
{ kind: "codeBlock", language: "typescript"|"sql"|"python"|..., code: "..." }
{ kind: "table", headers: ["Field","Type","Description"], rows: [["id","UUID","Primary key"], ...] }
\`\`\`

Example call for a "User Schema" file:
\`\`\`json
{
  "fileId": "<exact-id-from-create_file>",
  "title": "User Schema",
  "content": [
    { "kind": "paragraph", "text": "Defines the Users table for authentication and profile data." },
    { "kind": "table", "headers": ["Field","Type","Description"], "rows": [["id","UUID","Primary key"],["email","VARCHAR(255)","Unique user email"],["password_hash","TEXT","Bcrypt hash"]] },
    { "kind": "heading", "level": 2, "text": "Indexes" },
    { "kind": "bulletList", "items": ["idx_users_email (UNIQUE)", "idx_users_created_at"] },
    { "kind": "heading", "level": 2, "text": "Notes" },
    { "kind": "paragraph", "text": "Soft-delete via deleted_at column. OAuth users have null password_hash." }
  ]
}
\`\`\`

## IMPORTANT
- The fileId you use in \`add_database_smart_block\` MUST be the exact string returned by the \`create_file\` call.
- Do NOT use raw markdown strings — always use the typed content array.
- Do NOT stop after creating folders or files — you MUST populate every file.`;

        const groq = new ChatGroq({ model: "openai/gpt-oss-120b", maxTokens: 8192, maxRetries: 2 }).bindTools(tools);
        
        const messages = state.chatHistory?.length > 0 
            ? state.chatHistory.slice(-5).map((m: any) => {
                if (m.role?.toLowerCase() === 'user') return new HumanMessage(m.content || "");
                return new AIMessage(m.content || "");
            })
            : [];
            
        const finalMessages: any[] = [...messages, new HumanMessage(prompt)];

        const operations: EditOperation[] = [];

        let actionCount = 0;
        let loopCount = 0;
        const maxLoops = 15; // Enough loops for: create folders → create files → populate files → mentions

        // Track files that were created but NOT yet populated — failsafe for when LLM skips blocks
        const createdFiles: Array<{ fileId: string; title: string }> = [];
        const populatedFileIds = new Set<string>();

        while (loopCount < maxLoops) {
            loopCount++;
            const response = await groq.invoke(finalMessages, config);
            
            finalMessages.push(response);
            
            if (!response.tool_calls || response.tool_calls.length === 0) {
                break;
            }
            
            console.log(`Executing ${response.tool_calls.length} architecture tool calls (Loop ${loopCount})...`);
            
            for (const toolCall of response.tool_calls) {
                const toolName = toolCall.name;
                const toolArgs = toolCall.args;
                
                console.log(`[Tool Call] ${toolName}:`, JSON.stringify(toolArgs).substring(0, 200));
                
                const toolObj = tools.find(t => t.name === toolName);
                if (toolObj) {
                    try {
                        const enhancedConfig = {
                            ...config,
                            configurable: {
                                ...config?.configurable,
                                token: state.sessionToken,
                                documentId: state.docId
                            }
                        };
                        const result = await (toolObj as StructuredToolInterface).invoke(toolArgs, enhancedConfig);
                        
                        // Track created files so we can do a failsafe population pass
                        if (toolName === "create_file" && result && typeof result === 'object') {
                            const r = result as any;
                            if (r.success && r.fileId && r.type === "FILE") {
                                createdFiles.push({ fileId: r.fileId, title: toolArgs.title || "Untitled" });
                            }
                        }

                        // Track which files have already been populated
                        if (toolName === "add_database_smart_block" && toolArgs?.fileId) {
                            populatedFileIds.add(toolArgs.fileId);
                        }

                        // Build a helpful, explicit ToolMessage so the LLM knows exactly what ID to use next
                        let toolResultContent: string;
                        if (toolName === "create_file" && result && typeof result === 'object') {
                            const r = result as any;
                            if (r.success && r.type === "FILE") {
                                toolResultContent = `✅ File "${r.title}" created successfully.\n` +
                                    `fileId = "${r.fileId}"\n` +
                                    `⚠️ You MUST now call add_database_smart_block with fileId="${r.fileId}" to populate this file with content.`;
                            } else if (r.success && r.type === "FOLDER") {
                                toolResultContent = `✅ Folder "${r.title}" created successfully.\nfileId = "${r.fileId}"\nUse this as parentId when creating files inside it.`;
                            } else {
                                toolResultContent = `❌ create_file failed: ${r.error}`;
                            }
                        } else {
                            toolResultContent = typeof result === 'string' ? result : JSON.stringify(result);
                        }

                        finalMessages.push(new ToolMessage({
                            content: toolResultContent,
                            tool_call_id: toolCall.id!,
                            name: toolName
                        }));
                        
                        actionCount++;

                        if (result && typeof result === 'object' && (result as any)._isEditorOperation) {
                            operations.push({
                                type: 'insert_smartblock_mention',
                                position: state.cursorPosition || 0,
                                content: (result as any).content
                            });
                        }
                    } catch (toolErr: any) {
                        console.error(`Failed to execute tool ${toolName}:`, toolErr);
                        finalMessages.push(new ToolMessage({
                            content: `Error: ${toolErr.message}`,
                            tool_call_id: toolCall.id!,
                            name: toolName
                        }));
                    }
                } else {
                    finalMessages.push(new ToolMessage({
                        content: `Error: Tool ${toolName} not found.`,
                        tool_call_id: toolCall.id!,
                        name: toolName
                    }));
                }
            }
        }

        // ── FAILSAFE: populate any files the LLM forgot to add blocks to ──
        const unpopulatedFiles = createdFiles.filter(f => !populatedFileIds.has(f.fileId));
        if (unpopulatedFiles.length > 0) {
            console.log(`⚠️ Failsafe: LLM skipped ${unpopulatedFiles.length} file(s). Populating them now...`);

            // Ask the LLM to generate content for the missing files
            const fallbackPrompt = `The following files were created but NOT yet populated with content.
For EACH file below, call add_database_smart_block using the EXACT fileId shown.

REMINDER: content must be a structured array using these block kinds:
  { kind: "paragraph", text: "..." }
  { kind: "heading", level: 1|2|3, text: "..." }
  { kind: "bulletList", items: ["item1", "item2"] }
  { kind: "codeBlock", language: "typescript", code: "..." }
  { kind: "table", headers: ["Field","Type"], rows: [["id","UUID"]] }

Files to populate:
${unpopulatedFiles.map(f => `- fileId: "${f.fileId}" (file name: "${f.title}")`).join('\n')}

Do NOT skip any of them. Do NOT use raw markdown strings.`;

            finalMessages.push(new HumanMessage(fallbackPrompt));

            let fallbackLoops = 0;
            while (fallbackLoops < 5) {
                fallbackLoops++;
                const fallbackResponse = await groq.invoke(finalMessages, config);
                finalMessages.push(fallbackResponse);

                if (!fallbackResponse.tool_calls || fallbackResponse.tool_calls.length === 0) break;

                for (const toolCall of fallbackResponse.tool_calls) {
                    const toolName = toolCall.name;
                    const toolArgs = toolCall.args;
                    const toolObj = tools.find(t => t.name === toolName);
                    if (toolObj) {
                        try {
                            const enhancedConfig = {
                                ...config,
                                configurable: {
                                    ...config?.configurable,
                                    token: state.sessionToken,
                                    documentId: state.docId
                                }
                            };
                            const result = await (toolObj as StructuredToolInterface).invoke(toolArgs, enhancedConfig);
                            if (toolName === "add_database_smart_block" && toolArgs?.fileId) {
                                populatedFileIds.add(toolArgs.fileId);
                            }
                            finalMessages.push(new ToolMessage({
                                content: typeof result === 'string' ? result : JSON.stringify(result),
                                tool_call_id: toolCall.id!,
                                name: toolName
                            }));
                            actionCount++;
                        } catch (toolErr: any) {
                            finalMessages.push(new ToolMessage({
                                content: `Error: ${toolErr.message}`,
                                tool_call_id: toolCall.id!,
                                name: toolName
                            }));
                        }
                    }
                }
            }
        }
        
        operations.push({
            type: 'chat_response',
            position: state.cursorPosition || 0,
            content: `✅ Architecture scaffolded! Created ${createdFiles.length} file(s) and populated ${populatedFileIds.size} with content blocks (${actionCount} total operations).`
        });

        return { operations };

    } catch (error) {
        console.error("Architecture Agent failed:", error);
        return { 
            operations: [{
                type: 'chat_response',
                position: state.cursorPosition || 0,
                content: "Sorry, I encountered an error while scaffolding the system architecture."
            }],
            error: "Failed to design architecture"
        };
    }
}
