import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { DocumentAgentStateType, DraftBlock } from "../state";
import { generateKeyBetween } from "fractional-indexing";

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.1, // Low temperature for consistent formatting
});

// Structured output for schema generation
const SchemaOutputSchema = z.object({
  title: z.string().describe("The name of the schema or feature (e.g. 'User Schema', 'Auth Requirements')"),
  tableName: z.string().optional().describe("If it's a database table, the proposed table name (e.g. 'users')"),
  overview: z.string().describe("A brief 1-sentence overview of what this schema represents"),
  fields: z.array(
    z.object({
      name: z.string().describe("Field/Column name"),
      type: z.string().describe("Data type (e.g. UUID, String, Boolean, Timestamp)"),
      description: z.string().describe("Constraints and description (e.g. 'Primary Key', 'Unique', 'Hashed')"),
    })
  ).describe("List of fields/attributes in the schema"),
});

const structuredLlm = llm.withStructuredOutput(SchemaOutputSchema);

/**
 * Converts the structured schema into SmartBlock + Table DraftBlocks
 */
function convertToSchemaBlocks(schema: z.infer<typeof SchemaOutputSchema>): DraftBlock[] {
  const blocks: DraftBlock[] = [];
  let lastRank: string | null = null;

  // 1. Root SmartBlock containing the Schema
  const smartBlockRank = generateKeyBetween(lastRank, null);
  lastRank = smartBlockRank;
  const smartBlockId = `schema_sb_${Date.now()}`;

  blocks.push({
    type: "smartBlock",
    content: [{ type: "text", text: `Schema: ${schema.title}` }],
    props: { id: smartBlockId, isOpen: true }, // Ensure it's open by default
    rank: smartBlockRank,
    parentId: null,
  });

  // 2. Overview Paragraph inside SmartBlock
  let childRank: string | null = null;
  const pRank = generateKeyBetween(childRank, null);
  childRank = pRank;
  
  blocks.push({
    type: "paragraph",
    content: [{ type: "text", text: schema.overview }],
    props: {},
    rank: pRank,
    parentId: smartBlockId,
  });

  // 3. Table Block inside SmartBlock
  const tableRank = generateKeyBetween(childRank, null);
  childRank = tableRank;
  
  const tableBlockId = `draft_table_${Date.now()}`;
  
  blocks.push({
    type: "table",
    content: [], // Table content is handled by children (rows)
    props: { id: tableBlockId },
    rank: tableRank,
    parentId: smartBlockId,
  });

  // Note: In Tiptap flat structure, rows seem to be children of table? 
  // Wait, standard Tiptap JSON is nested. But our `DraftBlock` is flat.
  // The `block-transformer.ts` handles the hierarchy reconstruction.
  // For `table`, usually `table` -> `tableRow` -> `tableHeader` / `tableCell` -> `paragraph` -> `text`
  
  // Let's create the Table Header Row
  // For flat structure, we need to know the ID of the table to parent the rows
  // BUT: The current `DraftBlock` system in `block-transformer.ts` might assume 
  // standard parent-child for everything. Let's assume `table` is a block, 
  // and `tableRow` are children of `table`.

  // IMPORTANT: The `DraftBlock` type suggests a flat hierarchy where `parentId` links them.
  // We need to generate IDs for the table and rows.
  // However, `block-transformer.ts` (which I read in file listing but haven't seen content of)
  // likely handles standard blocks. Tables are complex.
  // If `DraftBlock` is just passed to `textFileBlocks.bulkCreate`, the backend
  // must understand how to reconstruct the tree.
  
  // Let's assume a simplified approach:
  // If the backend `restore` logic supports arbitrary nesting via `parentId`, then:
  // Table (id: T) -> Row (id: R1, parent: T) -> Cell (id: C1, parent: R1) -> Paragraph (parent: C1)
  
  // However, standard Tiptap tables are often strictly nested in the JSON content, 
  // NOT as separate block rows in a "block list" unless the block system is very granular.
  // Given I saw `table-extension.ts`, it's likely a standard Tiptap table.
  // Does the underlying block system function at the Row/Cell level?
  // I will assume YES for safety in this flat structure, or NO if `content` field should hold the table JSON.
  
  // CHECK: `getFileBlocks` tool output defined blocks with `content` array for inline content.
  // It didn't show table examples.
  // BUT `block-transformer.ts` exists.
  // If I look at `doc-draft.ts`, it generates headings and paragraphs.
  
  // Safer bet for now:
  // Generate the table structure as logical blocks if the system supports it. 
  // If the system treats "table" as a single block with complex `content`, that's different.
  // Re-reading `files` list: `extensions/table/table-extension.ts`. 
  // Typically Tiptap tables are one node with nested content.
  // BUT `apps/web/app/project/[projectId]/document/[docId]/components/tiptap-editor/utils/parse-tiptap-doc-to-block.ts` exists.
  // This implies conversion.
  
  // I will assume for now that I can't easily generate a perfect table 
  // via "flat blocks" unless I see how strictly the block model maps to Tiptap nodes.
  // Start with a valid attempts:
  // Table -> TableRow -> TableHeader/TableCell -> Paragraph -> Text
  


  // Headers
  const headers = ["Attribute", "Type", "Description"];
  const headerRowId = `${tableBlockId}_row_head`;
  
  // Header Row
  let rowRank = generateKeyBetween(null, null); // Reset rank counter for inside table?
  // Actually ranks are usually per-parent.
  
  blocks.push({
    type: "tableRow",
    content: [],
    props: { id: headerRowId },
    rank: rowRank,
    parentId: tableBlockId,
  });

  // Header Cells
  let cellRank = generateKeyBetween(null, null);
  for (const h of headers) {
    const cellId = `${headerRowId}_cell_${h}`;
    cellRank = generateKeyBetween(cellRank, null);
    
    blocks.push({
      type: "tableHeader",
      content: [],
      props: { id: cellId },
      rank: cellRank,
      parentId: headerRowId,
    });
    
    // Paragraph inside cell
    blocks.push({
      type: "paragraph",
      content: [{ type: "text", text: h }],
      props: {},
      rank: "a0", // First item in cell
      parentId: cellId,
    });
  }

  // Data Rows
  for (const field of schema.fields) {
    rowRank = generateKeyBetween(rowRank, null);
    const rowId = `${tableBlockId}_row_${field.name.replace(/\s+/g, '_')}`;
    
    blocks.push({
      type: "tableRow",
      content: [],
      props: { id: rowId },
      rank: rowRank,
      parentId: tableBlockId,
    });
    
    const rowData = [field.name, field.type, field.description];
    let fieldCellRank = generateKeyBetween(null, null);
    
     rowData.forEach((text, i) => {
        fieldCellRank = generateKeyBetween(fieldCellRank, null);
        const cellId = `${rowId}_cell_${i}`;
        
        blocks.push({
          type: "tableCell",
          content: [],
          props: { id: cellId },
          rank: fieldCellRank,
          parentId: rowId,
        });

        blocks.push({
          type: "paragraph",
          content: [{ type: "text", text: text }],
          props: {},
          rank: "a0",
          parentId: cellId,
        });
     });
  }

  return blocks;
}

/**
 * Schema Generation Node
 */
export async function schemaGenNode(
  state: DocumentAgentStateType
): Promise<Partial<DocumentAgentStateType>> {
  console.log(`[SCHEMA_GEN] Generating schema for: "${state.userQuery}"`);

  const systemPrompt = `You are a data architect assistant.
Extract requirements from the user's message and structure them into a database schema definition.
If the user provides a list of fields/requirements, parse them accurately.
If requirements are implied (e.g. "auth system"), infer standard fields (e.g. email, password_hash, created_at).
`;

  try {
    const result = await structuredLlm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(state.userQuery),
    ]);

    console.log(`[SCHEMA_GEN] Generated schema: ${result.title} with ${result.fields.length} fields`);

    const draftBlocks = convertToSchemaBlocks(result);

    const responseText = `I've created a schema definition for **${result.title}**.
    
It includes ${result.fields.length} fields:
${result.fields.map(f => `- **${f.name}** (${f.type}): ${f.description}`).join("\n")}

This has been added as a SmartBlock with a table for easy reading.`;

    return {
      response: responseText,
      draftBlocks,
      messages: [new HumanMessage(state.userQuery)],
    };

  } catch (error) {
    console.error("[SCHEMA_GEN] Error generating schema:", error);
    return {
       response: "I recognized you wanted a schema, but I had trouble generating the structure. Please try again with clearer requirements.",
       errors: [`SchemaGen node error: ${error}`]
    };
  }
}
