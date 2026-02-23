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

        const prompt = `You are a Senior Systems Architecture Agent. Your objective is to design and scaffold complex systems for AI coding context.
        
User Request: "${userMessage}"

Active Document ID: "${docId}"

Current Document File Tree:
${JSON.stringify(existingFiles, null, 2)}

INSTRUCTIONS:
1. Orchestrate the system design by invoking the provided tools.
2. IMPORTANT: You CANNOT guess Convex IDs! When creating a file/folder, you MUST wait for the tool to return the actual Convex ID before you can use it as a 'parentId' for nested files or a 'fileId' for 'add_database_smart_block'.
3. Therefore, make your tool calls in sequential batches:
   - Batch 1: Create all root folders. Wait for the IDs.
   - Batch 2: Use returned folder IDs to create files inside them. Wait for the file IDs.
   - Batch 3: Use returned file IDs to call 'add_database_smart_block' for each created file.
4. Use 'create_file' to build the structural folder hierarchy and files (e.g. backend/auth, frontend/login). Do NOT use file extensions. NEVER suggest images, diagrams, or plain text wrappers for files.
5. For every file you create, immediately use 'add_database_smart_block' (in the next batch) to heavily populate that file with detailed pseudo-code, database schema actions, or logical components.
6. Finally, use 'add_smart_block_mention' to insert inline JSON links into the user's active editor document so they can easily access the newly created architectural context files.

Use the bound tools exclusively. You may chain them. Keep calling tools until the system design is fully scaffolded and populated.`;

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
        const maxLoops = 10; // Prevent infinite loops

        while (loopCount < maxLoops) {
            loopCount++;
            const response = await groq.invoke(finalMessages, config);
            
            finalMessages.push(response); // Append AI response (which may include tool_calls)
            
            if (!response.tool_calls || response.tool_calls.length === 0) {
                // LLM is done calling tools
                break;
            }
            
            console.log(`Executing ${response.tool_calls.length} architecture tool calls (Loop ${loopCount})...`);
            
            for (const toolCall of response.tool_calls) {
                const toolName = toolCall.name;
                const toolArgs = toolCall.args;
                
                console.log(`[Tool Call] ${toolName}:`, JSON.stringify(toolArgs).substring(0, 150));
                
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
                        
                        // Append tool result message so the LLM knows it succeeded
                        finalMessages.push(new ToolMessage({
                            content: typeof result === 'string' ? result : JSON.stringify(result),
                            tool_call_id: toolCall.id!,
                            name: toolName
                        }));
                        
                        actionCount++;

                        // If the tool return is an Editor Operation intended for TipTap
                        if (result && typeof result === 'object' && result._isEditorOperation) {
                            operations.push({
                                type: 'insert_smartblock_mention',
                                position: state.cursorPosition || 0,
                                content: result.content
                            });
                        }
                    } catch (toolErr: any) {
                        console.error(`Failed to execute tool ${toolName}:`, toolErr);
                         // Append error so the LLM knows it failed
                         finalMessages.push(new ToolMessage({
                            content: `Error: ${toolErr.message}`,
                            tool_call_id: toolCall.id!,
                            name: toolName
                        }));
                    }
                } else {
                     // Tool not found
                     finalMessages.push(new ToolMessage({
                        content: `Error: Tool ${toolName} not found.`,
                        tool_call_id: toolCall.id!,
                        name: toolName
                    }));
                }
            }
        }
        
        // Output Chat Response to Frontend
        operations.push({
            type: 'chat_response',
            position: state.cursorPosition || 0,
            content: `I have orchestrated the system design, executing ${actionCount} architectural operations and inserted the context links.`
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
