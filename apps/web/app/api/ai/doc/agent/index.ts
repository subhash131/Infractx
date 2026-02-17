
import { ChatGroq } from "@langchain/groq";
import { StateGraph, START, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { identifyProject } from "./nodes/identify-project";
import { identifyFiles } from "./nodes/identify-files";
import { fetchFileData } from "./nodes/fetch-file-data";
import { explainContext } from "./nodes/explain-context";

// ============= STATE ANNOTATION =============
export const AgentStateAnnotation = Annotation.Root({
  // Input
  selectedText: Annotation<string>,
  userMessage: Annotation<string>,
  docContext: Annotation<string>,
  cursorPosition: Annotation<number>,
  projectId: Annotation<string>,
  source: Annotation<'ui' | 'mcp'>, // 'ui' vs 'mcp'
  
  // Processing
  intent: Annotation<'context' | 'schema' | 'table' | 'list' | 'code' | 'text' | 'general' | 'delete' | null>,
  extractedData: Annotation<any>,
  confidence: Annotation<number>,
  targetFileIds: Annotation<string[]>,
  fetchedContext: Annotation<string>,

  // Output
  operations: Annotation<EditOperation[]>,
  error: Annotation<string | undefined>,
});

export interface EditOperation {
  type: 'insert_smartblock' | 'insert_table' | 'replace' | 'delete' | 'chat_response';
  position: number;
  content: any;
}

// ============= AI CLIENT =============
const groq = new ChatGroq({model:"openai/gpt-oss-120b"});

// ============= HELPER: CALL CLAUDE =============
async function callAI(prompt: string, options: {
  returnJson?: boolean;
  temperature?: number;
  tags?: string[];
  config?: RunnableConfig;
} = {}) {
  // Merge tags explicitly to avoid overwriting
  const tags = [...(options.tags || []), ...(options.config?.tags || [])];
  const runConfig = { ...options.config, tags };

  const stream = await groq.stream([
    {
      role: "user",
      content: prompt,
    },
  ], runConfig);

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
            console.error("Failed to parse JSON:", cleaned);
            throw e;
        }
    }
    return content;
  }
  // Fallback for array content if valid structure (unlikely in stream accumulation of simple text)
  throw new Error("Unexpected response type or empty response");
}

// ============= NODE 1: CLASSIFY INTENT =============
async function classifyIntent(state: typeof AgentStateAnnotation.State) {
  console.log("🔍 Classifying intent...");
  
  const prompt = `You are analyzing a user's request to edit a document or chat.

User Message: "${state.userMessage}"
Selected Text: "${state.selectedText}"

Classify the intent into ONE of these categories:

1. **context**: Request to EXPLAIN, SEARCH, or QUERY project data (schema, files, structure, definitions).
   - "Explain user schema"
   - "What documents exist?"
   - "How does the auth flow work?"
   - "Show me the blocks in file X"
2. **schema**: Request to GENERATE/DESIGN a NEW database schema (not explain an existing one).
   - "Design a schema for a notification system"
3. **table**: Request to create a comparison or data table.
4. **list**: Request to create a list (bullet points, checklist).
5. **text**: Request to GENERATE, WRITE, REPHRASE, REWRITE, or SUMMARIZE text that should appear IN THE DOCUMENT.
6. **delete**: Request to remove, delete, or omit the selected text.
7. **code**: Request to generate pseudo-code, algorithms, functions, classes, or system logic.
8. **general**: A conversational query (e.g., "Hi", "Thanks") that doesn't need project context.

Return ONLY valid JSON:
{
  "intent": "context" | "schema" | "table" | "list" | "text" | "delete" | "code" | "general",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}
`;

  try {
    const result = await callAI(prompt, { returnJson: true });
    console.log("Intent classification result:", result);
    return {
      intent: result.intent,
      confidence: result.confidence
    };
  } catch (error) {
    console.error("Intent classification failed:", error);
    return { 
      intent: null,
      confidence: 0.5,
      error: "Failed to classify intent"
    };
  }
}



// ============= NODE 2: EXTRACT SCHEMA DATA =============
async function extractSchemaData(state: typeof AgentStateAnnotation.State) {
  console.log("📊 Extracting schema data...");
  
  const prompt = `Extract database schema fields from:

  ${state.userMessage}

  Analyze ALL requirements and infer the complete schema.

  Return ONLY valid JSON:
  {
    "tableName": "users",
    "fields": [
      {
        "name": "id",
        "type": "UUID",
        "description": "Primary key identifier"
      },
      {
        "name": "email",
        "type": "VARCHAR(255)",
        "description": "User email (unique, indexed)"
      }
    ]
  }

  Important:
  - Infer fields from requirements (e.g., "role-based access" → role field)
  - Include auth fields (password_hash, oauth fields if OAuth mentioned)
  - Include timestamps if mentioned (created_at, updated_at)
  - Include soft delete field (deleted_at) if mentioned
  - Include status/state fields
  - Be specific with types (UUID, VARCHAR with length, ENUM, TIMESTAMP, etc.)
  - Mention constraints in description (unique, indexed, not null, etc.)`;

  try {
    const result = await callAI(prompt, { returnJson: true });
    
    return {
      extractedData: result
    };
  } catch (error) {
    console.error("Schema extraction failed:", error);
    return {
      error: "Failed to extract schema data"
    };
  }
}

// ============= NODE 3: EXTRACT TABLE DATA =============
async function extractTableData(state: typeof AgentStateAnnotation.State) {
  console.log("📋 Extracting table data...");
  
  const prompt = `Create a comparison table from this request:

${state.userMessage}
Selected context: ${state.selectedText}

Return ONLY valid JSON:
{
  "title": "Short descriptive title for this table",
  "headers": ["Column1", "Column2", "Column3"],
  "rows": [
    ["Row1Col1", "Row1Col2", "Row1Col3"],
    ["Row2Col1", "Row2Col2", "Row2Col3"]
  ]
}`;

  try {
    const result = await callAI(prompt, { returnJson: true });
    return { extractedData: result };
  } catch (error) {
    return { error: "Failed to extract table data" };
  }
}

// ============= NODE 4: GENERATE OPERATIONS =============
async function generateOperations(state: typeof AgentStateAnnotation.State, config: RunnableConfig) {
  console.log("⚙️ Generating edit operations...");

  // EDIT BLOCKING FOR EXTERNAL SOURCES
  if (state.source === 'mcp') {
      console.log("🚫 Blocking edit op from MCP source");
      return {
          operations: [{
              type: 'chat_response',
              position: state.cursorPosition,
              content: "I cannot edit documents directly from this interface. I am in read-only mode."
          }]
      };
  }
  
  const operations: EditOperation[] = [];

  if (state.intent === 'schema' && state.extractedData) {
    const { tableName, fields } = state.extractedData;
    
    operations.push({
      type: 'insert_smartblock',
      position: state.cursorPosition,
      content: {
        title: `Schema: ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}`,
        table: {
          headers: ['Field', 'Type', 'Description (optional)'],
          rows: fields.map((field: any) => [
            field.name,
            field.type,
            field.description || ''
          ])
        }
      }
    });
  } 
  else if (state.intent === 'table' && state.extractedData) {
    operations.push({
      type: 'insert_smartblock',
      position: state.cursorPosition,
      content: {
        title: state.extractedData.title || 'Table',
        table: {
          headers: state.extractedData.headers,
          rows: state.extractedData.rows
        }
      }
    });
  }
  else if (state.intent === 'list') {
    // Handle list generation
    const prompt = `Generate a markdown list for the following request: "${state.userMessage}". Return ONLY the markdown list content.`;
    const text = await callAI(prompt, { tags: ['streamable'], config });
    
    operations.push({
      type: 'replace',
      position: state.cursorPosition,
      content: text
    });
  }
  else if (state.intent === 'code') {
    // 1. Generate Title
    const titlePrompt = `Generate a concise title (1-4 words) for this code snippet.
    Request: "${state.userMessage}"
    Format: "Type: Name" (e.g., "Func: Multiply", "Class: Router", "Script: Setup").
    Return ONLY the title text.`;

    const title = await callAI(titlePrompt, { tags: ['generate_title'], config });

    // 2. Generate Code
    const prompt = `Generate the pseudo-code/logic for the following request:
    "${state.userMessage}"

    Context:
    - Document Context: "${state.docContext}"
    - Selected Text: "${state.selectedText}"
    
    If the request implies editing the selected text or using the document context, ensure the generated logic reflects that.
    
    CRITICAL RULES:
    - The title of this block already contains the function/class name (e.g. "Func: Login"). Do NOT repeat the function signature like "function login(username, password):" in the body.
    - Instead, start with: INPUT: list the parameters, then OUTPUT: describe the return value, then the step-by-step logic.
    - Generate ONLY what was specifically requested. If the user asks for a "login function", output ONLY the login function — do NOT add logout, helpers, utilities, or any other related functions.
    - Do NOT include any title, heading, or bold text.
    - Do NOT wrap output in triple backticks or any code fences (\`\`\`). The output is ALREADY inside a code block.
    - Write plain-text pseudo-code directly, using simple indentation for nesting.
    - Keep it concise, focused, and well-structured. Less is more.
    
  Example output format:
    INPUT: username (string), password (string)
    OUTPUT: session_token, user_id or error

    validate username and password are not empty
    query user record from database by username
    if user not found, return error
    verify password hash matches
    generate session token
    store session and return token with user id`;
    
    try {
        const text = await callAI(prompt, { tags: ['streamable'], config });
         operations.push({
            type: 'insert_smartblock',
            position: state.cursorPosition,
            content: {
                title: title || "Smart Block",
                content: text
            }
        });
    } catch (e) {
        console.error("Failed to generate code logic:", e);
    }
  }
  else if (state.intent === 'text') {
    const prompt = `You are an AI editor.
User Request: "${state.userMessage}"
Context (Selected Text): "${state.selectedText}"
Document Context: "${state.docContext}"

Perform the requested text generation, rewriting, or editing on the 'Selected Text'.
Return ONLY the replacement text for the 'Selected Text'.
- Do NOT include any conversational text.
- Do NOT repeat the Document Context unless it is part of the replacement.
- If the request is a simple fix (typo, grammar), return only the corrected text.`;

    const text = await callAI(prompt, { tags: ['streamable'], config });
    operations.push({
      type: 'replace',
      position: state.cursorPosition,
      content: text
    });
  }
  else if (state.intent === 'delete') {
      operations.push({
          type: 'delete',
          position: state.cursorPosition,
          content: null
      });
  }
  else if (state.intent === 'general') {
      const prompt = `You are a helpful AI assistant.
User Message: "${state.userMessage}"

Context:
- Document Content: "${state.docContext}"
- Selected Text: "${state.selectedText}"

Provide a helpful, concise response to the user.
If the user asks about the document, use the provided Context.`;
      const response = await callAI(prompt, { tags: ['streamable'], config });
      operations.push({
          type: 'chat_response',
          position: state.cursorPosition,
          content: response
      });
  }

  return { operations };
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
    default:
      return 'generateOps'; // Fallback to general handling
  }
}

// ============= BUILD THE GRAPH =============
const workflow = new StateGraph(AgentStateAnnotation)
  .addNode('classifyIntent', classifyIntent)
  .addNode('identifyProject', identifyProject)
  .addNode('identifyFiles', identifyFiles)
  .addNode('fetchFileData', fetchFileData)
  .addNode('explainContext', explainContext)
  .addNode('extractSchema', extractSchemaData)
  .addNode('extractTable', extractTableData)
  .addNode('generateOps', generateOperations)

  .addEdge(START, 'classifyIntent')
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
  .addEdge('generateOps', END);

export const docEditAgent = workflow.compile();

// ============= MAIN AGENT EXECUTOR =============
export async function executeDocAgent(input: {
  selectedText: string;
  userMessage: string;
  docContext: string;
  cursorPosition: number;
  projectId?: string;
  source?: 'ui' | 'mcp';
}) {
  console.log("🚀 Starting doc edit agent...");
  
  const initialState = {
    selectedText: input.selectedText,
    userMessage: input.userMessage,
    docContext: input.docContext,
    cursorPosition: input.cursorPosition,
    projectId: input.projectId || "",
    source: input.source || 'ui',
    intent: null,
    extractedData: null,
    targetFileIds: [],
    fetchedContext: "",
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