import { ChatGroq } from "@langchain/groq";
import { StateGraph, START, END } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";

// ============= STATE ANNOTATION =============
const AgentStateAnnotation = Annotation.Root({
  // Input
  selectedText: Annotation<string>,
  userMessage: Annotation<string>,
  docContext: Annotation<string>,
  cursorPosition: Annotation<number>,
  
  // Processing
  intent: Annotation<'schema' | 'table' | 'list' | 'code' | 'text' | 'general' | null>,
  extractedData: Annotation<any>,
  confidence: Annotation<number>,
  
  // Output
  operations: Annotation<EditOperation[]>,
  error: Annotation<string | undefined>,
});

export interface EditOperation {
  type: 'insert_smartblock' | 'insert_table' | 'replace' | 'delete';
  position: number;
  content: any;
}

// ============= AI CLIENT =============
const groq = new ChatGroq({model:"openai/gpt-oss-120b"});

// ============= HELPER: CALL CLAUDE =============
async function callAI(prompt: string, options: {
  returnJson?: boolean;
  temperature?: number;
} = {}) {
  const message = await groq.invoke([
    {
      role: "user",
      content: prompt,
    },
  ]);

  // console.log(JSON.stringify(message,null,2));

  const content = typeof message.content === 'string' ? message.content : message.content;
  if (content && typeof content === 'string') {
    return options.returnJson ? JSON.parse(content) : content;
  }
  if (Array.isArray(content) && content[0]) {
      // Assuming text content block if array
       const text = (content[0] as any).text || "";
       return options.returnJson ? JSON.parse(text) : text;
  }
  throw new Error("Unexpected response type");
}

// ============= NODE 1: CLASSIFY INTENT =============
async function classifyIntent(state: typeof AgentStateAnnotation.State) {
  console.log("🔍 Classifying intent...");
  
  const prompt = `You are analyzing a user's request to edit a document.

User Message: "${state.userMessage}"
Selected Text: "${state.selectedText}"

Classify the intent. Return ONLY valid JSON:

{
  "intent": "schema" | "table" | "list" | "code" | "text" | "general",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Intent definitions:
- "schema": Database schema, mentions fields/types/constraints/UUID/primary key
- "table": Comparison table, pros/cons, feature matrix
- "list": Bullet points, numbered steps, checklist
- "code": Code snippet, algorithm, function
- "text": General text edit/insertion
- "general" : greeting, normal queries, etc.

Examples:
- "Add fields for user auth" → schema
- "Compare React vs Vue" → table
- "Steps to deploy" → list
- "Hello" → general`;

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
  
  const prompt = `Extract database schema fields from these requirements:

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
async function generateOperations(state: typeof AgentStateAnnotation.State) {
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
    operations.push({
      type: 'insert_smartblock',
      position: state.cursorPosition,
      content: {
        blockType: 'list',
        items: [] // Extract from userMessage
      }
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
      return 'generateOps';
    default:
      return END;
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

const docEditAgent = workflow.compile();

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

  const stream = await docEditAgent.stream(initialState, {
    streamMode: "updates",
  });

  return stream;
}

// ============= EXPORT =============
export default executeDocAgent;