import { ChatGroq } from "@langchain/groq";
import { StateGraph, START, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";

// ============= STATE ANNOTATION =============
const AgentStateAnnotation = Annotation.Root({
  // Input
  selectedText: Annotation<string>,
  userMessage: Annotation<string>,
  docContext: Annotation<string>,
  cursorPosition: Annotation<number>,
  
  // Processing
  intent: Annotation<'schema' | 'table' | 'list' | 'code' | 'text' | 'general' | 'delete' | null>,
  extractedData: Annotation<any>,
  confidence: Annotation<number>,
  
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

1. **schema**: Request to generate a database schema.
2. **table**: Request to create a comparison or data table.
3. **list**: Request to create a list (bullet points, checklist).
4. **text**: Request to GENERATE, WRITE, REPHRASE, REWRITE, or SUMMARIZE text that should appear IN THE DOCUMENT. Examples: "Write a paragraph about...", "Expand this", "Rewrite this".
5. **delete**: Request to remove, delete, or omit the selected text.
6. **code**: Request to generate pseudo-code, algorithms, functions, classes, or system logic. Examples: "Create a multiply function", "design a generic interface", "pseudo code for auth flow".
7. **general**: A conversational query (e.g., "Hi", "Explain this") that should be answered in CHAT, NOT inserted into the document. Use this ONLY if the user is asking a question about the AI or a general topic WITHOUT implying it should be written into the doc.

Return ONLY valid JSON:
{
  "intent": "schema" | "table" | "list" | "text" | "delete" | "code" | "general",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Examples:
- "Add fields for usage tracking" -> schema
- "Make a table comparing X and Y" -> table
- "Rewrite this to be funnier" -> text
- "Write a paragraph about elephants" -> text
- "Remove this paragraph" -> delete
- "Create a function to calculate factorial" -> code
- "Design a User class interface" -> code
- "What is the capital of France?" -> general (chat response)
- "Hi there" -> general
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
  
  const operations: EditOperation[] = [];

  if (state.intent === 'schema' && state.extractedData) {
    const { tableName, fields } = state.extractedData;
    
    // Add heading
    operations.push({
      type: 'insert_smartblock',
      position: state.cursorPosition,
      content: {
        blockType: 'heading',
        level: 3,
        text: `Schema: ${tableName.charAt(0).toUpperCase() + tableName.slice(1)}`
      }
    });

    // Add table
    operations.push({
      type: 'insert_table',
      position: state.cursorPosition + 1,
      content: {
        headers: ['Name', 'Type', 'Description'],
        rows: fields.map((field: any) => [
          field.name,
          field.type,
          field.description
        ])
      }
    });
  } 
  else if (state.intent === 'table' && state.extractedData) {
    operations.push({
      type: 'insert_table',
      position: state.cursorPosition,
      content: state.extractedData
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
    const prompt = `Generate a pseudo-code/logic description for the following request:
    "${state.userMessage}"
    
    Return ONLY the detailed pseudo-logic or explanation. Do NOT wrap in JSON. Start directly with the content.`;
    
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

Perform the requested text generation, rewriting, or editing.
Return ONLY the new/modified text content. Do not include quotes or conversational filler.`;

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

Provide a helpful, concise response to the user.`;
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
  .addNode('extractSchema', extractSchemaData)
  .addNode('extractTable', extractTableData)
  .addNode('generateOps', generateOperations)
  .addEdge(START, 'classifyIntent')
  .addConditionalEdges('classifyIntent', routeByIntent)
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
}) {
  console.log("🚀 Starting doc edit agent...");
  
  const initialState = {
    selectedText: input.selectedText,
    userMessage: input.userMessage,
    docContext: input.docContext,
    cursorPosition: input.cursorPosition,
    intent: null,
    extractedData: null,
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