// import { createGroq } from "@ai-sdk/groq";
// import { convertToModelMessages, streamText } from "ai";
// import {
//   aiDocumentFormats,
//   injectDocumentStateMessages,
//   toolDefinitionsToToolSet,
// } from "@blocknote/xl-ai/server";
// import { NextRequest } from "next/server";

// const groq = createGroq({
//   apiKey: "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",
// });

// const SMART_BLOCK_INSTRUCTIONS = `
// CRITICAL RULES FOR SMART BLOCKS:

// When the user asks to add a function, class, schema, or custom block, you MUST create it with nested children structure.

// Use this EXACT nested HTML format (Notice: NO "bn-block-outer" div):

// Function with child:
// <div class="bn-block" data-content-type="smartBlock" data-semanticType="function">
//   <div class="bn-block-content">
//     <p class="bn-inline-content">@function: YourFunctionName</p>
//   </div>
//   <div class="bn-block-group">
//     <div class="bn-block" data-content-type="paragraph">
//       <div class="bn-block-content">
//         <p class="bn-inline-content"></p>
//       </div>
//     </div>
//   </div>
// </div>

// Class with child:
// <div class="bn-block" data-content-type="smartBlock" data-semanticType="class">
//   <div class="bn-block-content">
//     <p class="bn-inline-content">@class: YourClassName</p>
//   </div>
//   <div class="bn-block-group">
//     <div class="bn-block" data-content-type="paragraph">
//       <div class="bn-block-content">
//         <p class="bn-inline-content"></p>
//       </div>
//     </div>
//   </div>
// </div>

// Schema with child:
// <div class="bn-block" data-content-type="smartBlock" data-semanticType="schema">
//   <div class="bn-block-content">
//     <p class="bn-inline-content">@schema: YourSchemaName</p>
//   </div>
//   <div class="bn-block-group">
//     <div class="bn-block" data-content-type="paragraph">
//       <div class="bn-block-content">
//         <p class="bn-inline-content"></p>
//       </div>
//     </div>
//   </div>
// </div>

// Custom with child:
// <div class="bn-block" data-content-type="smartBlock" data-semanticType="custom">
//   <div class="bn-block-content">
//     <p class="bn-inline-content">@custom: YourCustomName</p>
//   </div>
//   <div class="bn-block-group">
//     <div class="bn-block" data-content-type="paragraph">
//       <div class="bn-block-content">
//         <p class="bn-inline-content"></p>
//       </div>
//     </div>
//   </div>
// </div>

// MANDATORY RULES:
// 1. MUST include the full nested structure with bn-block-group
// 2. The child paragraph inside bn-block-group is empty (ready for user input)
// 3. Use data-content-type="smartBlock" and data-semanticType on the outer div
// 4. Content must start with @function:, @class:, @schema:, or @custom:
// 5. This MUST be a single block of HTML (one root div)
// `;

// function enhanceToolDefinitions(toolDefs: any): any {
//   const enhanced = JSON.parse(JSON.stringify(toolDefs));
  
//   if (enhanced.applyDocumentOperations?.inputSchema?.properties?.operations?.items?.anyOf) {
//     const operations = enhanced.applyDocumentOperations.inputSchema.properties.operations.items.anyOf;
//     const addOp = operations.find((op: any) => op.properties?.type?.enum?.includes("add"));
    
//     if (addOp?.properties?.blocks?.items) {
//       addOp.properties.blocks.items.description = 
//         "html of block (MUST be a single, VALID HTML element)\n\n" + SMART_BLOCK_INSTRUCTIONS;
      
//       // Also update the blocks array description to emphasize multiple blocks
//       if (addOp.properties.blocks.description) {
//         addOp.properties.blocks.description = "Array of HTML blocks. For smartBlocks, ALWAYS include the smartBlock AND an empty paragraph child.";
//       }
      
//       console.log("✅ Enhanced add operation");
//     } else {
//       console.warn("⚠️ Could not find blocks.items");
//     }
//   } else {
//     console.warn("⚠️ Could not find expected structure");
//   }
  
//   return enhanced;
// }

// export async function POST(req: NextRequest) {
//   const { messages, toolDefinitions } = await req.json();
  
//   const smartToolDefinitions = enhanceToolDefinitions(toolDefinitions);

//   console.log("------------START REQUEST---------------");
//   console.log("User message:", messages[messages.length - 1]?.parts?.[0]?.text);
//   console.log("------------END REQUEST---------------");
  
//   console.log("------------Smart tool def---------------");
//   console.log("smart tool def:", JSON.stringify(smartToolDefinitions));
//   console.log("------------End smart tool def---------------\n\n");
//   console.log("------------start tool def---------------");
//   console.log("toolDefinitions:", JSON.stringify(toolDefinitions));
//   console.log("------------END tool def---------------");
  
//   const result = streamText({
//     model: groq("openai/gpt-oss-120b"),
//     system: aiDocumentFormats.html.systemPrompt + "\n\n" + SMART_BLOCK_INSTRUCTIONS,
//     messages: await convertToModelMessages(
//       injectDocumentStateMessages(messages)
//     ),
//     // tools: toolDefinitionsToToolSet(smartToolDefinitions),
//     toolChoice: "required",
//     onFinish: async (event) => {
//       console.log("------------START RESPONSE---------------");
//       console.log("Text:", event.text);
//       console.log("Tool calls:", JSON.stringify(event.toolCalls));
//       console.log("Tool results:", JSON.stringify(event.toolResults));
//       console.log("Usage:", JSON.stringify(event.usage));
//       console.log("------------END RESPONSE---------------");
//     },
//   });
  
//   return result.toUIMessageStreamResponse();
// }