import { ChatGroq } from "@langchain/groq";
import { StateGraph, START, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { identifyProject } from "./nodes/identify-project";
import { identifyFiles } from "./nodes/identify-files";
import { fetchFileData } from "./nodes/fetch-file-data";
import { explainContext } from "./nodes/explain-context";
import { classifyIntent } from "./nodes/classify-intent";
import { extractSchemaData } from "./nodes/extract-schema-data";
import { extractTableData } from "./nodes/extract-table-data";
import { generateOperations } from "./nodes/generate-operations";
import { fetchChatHistory } from "./nodes/fetch-chat-history";
import { manageFiles } from "./nodes/manage-files";
import { architectureAgent } from "./nodes/architecture-agent";

export interface ChatHistoryItem {
  role: "USER" | "AI" | "SYSTEM";
  content: string;
  [key: string]: any;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// ============= STATE ANNOTATION =============
export const AgentStateAnnotation = Annotation.Root({
  // Input
  selectedText: Annotation<string>,
  userMessage: Annotation<string>,
  docContext: Annotation<string>,
  cursorPosition: Annotation<number>,
  projectId: Annotation<string>,
  conversationId: Annotation<string | undefined>,
  source: Annotation<'ui' | 'mcp'>, // 'ui' vs 'mcp'
  docId: Annotation<string>,
  fileId: Annotation<string>,
  sessionToken:Annotation<string>, // session token
  
  // Processing
  intent: Annotation<'context' | 'schema' | 'table' | 'list' | 'code' | 'text' | 'general' | 'delete' | 'file_management' | 'architecture' | null>,
  extractedData: Annotation<any>,
  confidence: Annotation<number>,
  targetFileIds: Annotation<string[]>,
  fetchedContext: Annotation<string>,
  chatHistory: Annotation<ChatHistoryItem[]>,
  // Output
  operations: Annotation<EditOperation[]>,
  error: Annotation<string | undefined>,
});

export interface EditOperation {
  type: 'insert_smartblock' | 'insert_table' | 'replace' | 'delete' | 'chat_response' | 'insert_smartblock_mention';
  position: number;
  content: any;
}

// ============= AI CLIENT =============
const groq = new ChatGroq({model:"openai/gpt-oss-120b", maxTokens: 8192, maxRetries: 2});

// ============= HELPER: CALL LLM =============
export async function callAI(messages: ChatMessage[], options: {
  returnJson?: boolean;
  temperature?: number;
  tags?: string[];
  config?: RunnableConfig;
} = {}) {
  // Merge tags explicitly to avoid overwriting
  const tags = [...(options.tags || []), ...(options.config?.tags || [])];
  const runConfig = { ...options.config, tags };

  // Langchain types expect BaseMessageLike, which is slightly more complex than our simple interface.
  // We cast to any internally to avoid type errors since Groq accepts {role, content} format perfectly.
  const stream = await groq.stream(messages as any, runConfig);

  let text = "";
  for await (const chunk of stream) {
      if (typeof chunk.content === 'string') {
          text += chunk.content;
      }
  }

  const content = text;
  
  if (content) {
    if(options.returnJson){
        // clean json string
        let cleaned = content.replace(/```json/g,"").replace(/```/g,"").trim();
        try{
            return JSON.parse(cleaned);
        }catch(e){
            // Try simple repair if truncated array
            if (cleaned.startsWith("[") && !cleaned.endsWith("]")) {
              let repaired = "";
              const lastBrace = cleaned.lastIndexOf("}");
              if (lastBrace !== -1) {
                  try {
                      repaired = cleaned.substring(0, lastBrace + 1) + "]";
                      return JSON.parse(repaired);
                  } catch (e2) {
                      console.error("Failed to parse repaired JSON:", repaired);
                  }
              }
            }
            console.error("Failed to parse JSON:", cleaned);
            throw e;
        }
    }
    return content;
  }
  // Fallback for array content if valid structure (unlikely in stream accumulation of simple text)
  throw new Error("Unexpected response type or empty response");
}

// ============= ROUTING LOGIC =============
function routeByIntent(state: typeof AgentStateAnnotation.State): string {
  console.log(`🔀 Routing based on intent: ${state.intent}`);
  
  if (state.error) return END;
  
  switch (state.intent) {
    case 'context':
      return 'identifyProject';
    case 'schema':
      return 'extractSchema';
    case 'table':
      return 'extractTable';
    case 'list':
    case 'code':
    case 'text':
    case 'delete':
    case 'general':
      return 'generateOps';
    case 'architecture':
      return 'architectureAgent';
    case 'file_management':
      return 'manageFiles';
    default:
      return 'generateOps'; // Fallback to general handling
  }
}

// ============= BUILD THE GRAPH =============
const workflow = new StateGraph(AgentStateAnnotation)
  .addNode('fetchChatHistory', fetchChatHistory)
  .addNode('classifyIntent', classifyIntent)
  .addNode('identifyProject', identifyProject)
  .addNode('identifyFiles', identifyFiles)
  .addNode('fetchFileData', fetchFileData)
  .addNode('explainContext', explainContext)
  .addNode('extractSchema', extractSchemaData)
  .addNode('extractTable', extractTableData)
  .addNode('generateOps', generateOperations)
  .addNode('manageFiles', manageFiles)
  .addNode('architectureAgent', architectureAgent)

  .addEdge(START, 'fetchChatHistory')
  .addEdge('fetchChatHistory', 'classifyIntent')
  .addConditionalEdges('classifyIntent', routeByIntent)
  
  // Context Branch
  .addEdge('identifyProject', 'identifyFiles') 
  // identifyProject calls interrupt if needed, so it handles the control flow implicitly
  
  .addEdge('identifyFiles', 'fetchFileData') 
  // identifyFiles calls interrupt if needed
  
  .addEdge('fetchFileData', 'explainContext')
  .addEdge('explainContext', END)

  // Edit Branch
  .addEdge('extractSchema', 'generateOps')
  .addEdge('extractTable', 'generateOps')
  .addEdge('generateOps', END)
  
  // File Management Branch
  .addEdge('manageFiles', END)

  // Architecture Agent Branch
  .addEdge('architectureAgent', END);

export const docEditAgent = workflow.compile();

// ============= MAIN AGENT EXECUTOR =============
export async function executeDocAgent(input: {
  selectedText: string;
  userMessage: string;
  docContext: string;
  cursorPosition: number;
  projectId?: string;
  conversationId?: string;
  source?: 'ui' | 'mcp';
  docId: string;
  fileId: string;
  sessionToken: string;
}) {
  console.log("🚀 Starting doc edit agent...");
  const initialState = {
    selectedText: input.selectedText,
    userMessage: input.userMessage,
    docContext: input.docContext,
    cursorPosition: input.cursorPosition,
    projectId: input.projectId || "",
    conversationId: input.conversationId,
    source: input.source || 'ui',
    docId: input.docId,
    fileId: input.fileId,
    sessionToken: input.sessionToken,
    intent: null,
    extractedData: null,
    targetFileIds: [],
    fetchedContext: "",
    chatHistory: [],
    confidence: 0,
    operations: [],
    error: undefined
  };

  try {
    const result = await docEditAgent.invoke(initialState);
    
    console.log("✅ Agent completed successfully");
    
    return {
      success: true,
      operations: result.operations,
      metadata: {
        intent: result.intent,
        confidence: result.confidence
      }
    };
  } catch (error) {
    console.error("❌ Agent failed:", error);
    
    return {
      success: false,
      error,
      operations: []
    };
  }
}

// ============= EXPORT =============
export default executeDocAgent;