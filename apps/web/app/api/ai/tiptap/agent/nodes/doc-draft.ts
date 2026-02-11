import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { DocumentAgentStateType, DraftBlock } from "../state";
import { generateKeyBetween } from "fractional-indexing";

const llm = new ChatGroq({
  model: "openai/gpt-oss-120b",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.4,
});

// Structured output schema for draft generation
const DraftOutputSchema = z.object({
  title: z.string().describe("Document title"),
  sections: z.array(
    z.object({
      heading: z.string().describe("Section heading text"),
      content: z.string().describe("Section body content as plain text"),
      isSmartBlock: z
        .boolean()
        .describe(
          "Whether this section should be a SmartBlock (collapsible, with nested children)"
        ),
      subsections: z
        .array(
          z.object({
            heading: z.string().optional().describe("Subsection heading"),
            content: z.string().describe("Subsection content"),
          })
        )
        .optional()
        .describe("Nested subsections (will become SmartBlock children)"),
    })
  ),
});

const structuredLlm = llm.withStructuredOutput(DraftOutputSchema);

/**
 * Convert the LLM structured output into flat Convex-compatible blocks
 * using the same format as block-transformer.ts
 */
function convertToDraftBlocks(
  draft: z.infer<typeof DraftOutputSchema>
): DraftBlock[] {
  const blocks: DraftBlock[] = [];
  let lastRank: string | null = null;

  // Title heading
  const titleRank = generateKeyBetween(lastRank, null);
  lastRank = titleRank;
  blocks.push({
    type: "heading",
    content: [{ type: "text", text: draft.title }],
    props: { level: 1 },
    rank: titleRank,
    parentId: null,
  });

  // Process sections
  for (const section of draft.sections) {
    if (section.isSmartBlock) {
      // Create a SmartBlock with header + children
      const smartBlockRank = generateKeyBetween(lastRank, null);
      lastRank = smartBlockRank;
      const smartBlockId = `draft_sb_${blocks.length}`;

      blocks.push({
        type: "smartBlock",
        content: [{ type: "text", text: section.heading }],
        props: { id: smartBlockId },
        rank: smartBlockRank,
        parentId: null,
      });

      // Add section content as a child paragraph
      let childRank: string | null = null;
      if (section.content.trim()) {
        const contentRank = generateKeyBetween(childRank, null);
        childRank = contentRank;
        blocks.push({
          type: "paragraph",
          content: [{ type: "text", text: section.content }],
          props: {},
          rank: contentRank,
          parentId: smartBlockId,
        });
      }

      // Add subsections as child blocks
      if (section.subsections) {
        for (const sub of section.subsections) {
          if (sub.heading) {
            const subHeadingRank = generateKeyBetween(childRank, null);
            childRank = subHeadingRank;
            blocks.push({
              type: "heading",
              content: [{ type: "text", text: sub.heading }],
              props: { level: 3 },
              rank: subHeadingRank,
              parentId: smartBlockId,
            });
          }

          const subContentRank = generateKeyBetween(childRank, null);
          childRank = subContentRank;
          blocks.push({
            type: "paragraph",
            content: [{ type: "text", text: sub.content }],
            props: {},
            rank: subContentRank,
            parentId: smartBlockId,
          });
        }
      }
    } else {
      // Regular section: heading + paragraph
      const headingRank = generateKeyBetween(lastRank, null);
      lastRank = headingRank;
      blocks.push({
        type: "heading",
        content: [{ type: "text", text: section.heading }],
        props: { level: 2 },
        rank: headingRank,
        parentId: null,
      });

      if (section.content.trim()) {
        const contentRank = generateKeyBetween(lastRank, null);
        lastRank = contentRank;
        blocks.push({
          type: "paragraph",
          content: [{ type: "text", text: section.content }],
          props: {},
          rank: contentRank,
          parentId: null,
        });
      }

      // Handle subsections as regular blocks
      if (section.subsections) {
        for (const sub of section.subsections) {
          if (sub.heading) {
            const subHeadingRank = generateKeyBetween(lastRank, null);
            lastRank = subHeadingRank;
            blocks.push({
              type: "heading",
              content: [{ type: "text", text: sub.heading }],
              props: { level: 3 },
              rank: subHeadingRank,
              parentId: null,
            });
          }

          const subContentRank = generateKeyBetween(lastRank, null);
          lastRank = subContentRank;
          blocks.push({
            type: "paragraph",
            content: [{ type: "text", text: sub.content }],
            props: {},
            rank: subContentRank,
            parentId: null,
          });
        }
      }
    }
  }

  return blocks;
}

/**
 * Document Drafting Node — Generates structured Tiptap-compatible document blocks.
 */
export async function docDraftNode(
  state: DocumentAgentStateType
): Promise<Partial<DocumentAgentStateType>> {
  console.log(`[DOC_DRAFT] Drafting document for: "${state.userQuery}"`);

  const systemPrompt = `You are a professional document writer integrated with a Tiptap-based editor.
Generate a well-structured document based on the user's request.

Rules:
- Create clear, professional content organized into logical sections
- Use SmartBlocks (isSmartBlock: true) for major sections that should be collapsible/expandable
  - SmartBlocks are great for: requirement groups, feature specifications, API endpoints, test cases
- Use regular sections for introductory content, summaries, and conclusions
- Each section should have meaningful content, not just placeholders
- Subsections are used for detailed breakdowns within a section
- Keep content concise but informative

Document types you might be asked to create:
- Technical Requirements Document
- API Specification
- Design Specification
- User Guide
- Project Plan
- Meeting Notes
- Any other structured document`;

  try {
    const result = await structuredLlm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(state.userQuery),
    ]);

    console.log(
      `[DOC_DRAFT] Generated "${result.title}" with ${result.sections.length} sections`
    );

    // Convert to flat block format
    const draftBlocks = convertToDraftBlocks(result);

    console.log(
      `[DOC_DRAFT] Converted to ${draftBlocks.length} flat blocks`
    );

    // Build response summary
    const sectionList = result.sections
      .map(
        (s, i) =>
          `${i + 1}. ${s.isSmartBlock ? "📦 " : "📄 "}${s.heading}${s.subsections ? ` (${s.subsections.length} subsections)` : ""}`
      )
      .join("\n");

    const responseText = `I've drafted your document: **${result.title}**\n\n**Structure:**\n${sectionList}\n\nTotal blocks generated: ${draftBlocks.length}\n\n📦 = SmartBlock (collapsible), 📄 = Regular section`;

    return {
      response: responseText,
      draftBlocks,
      messages: [new HumanMessage(state.userQuery)],
    };
  } catch (error) {
    console.error("[DOC_DRAFT] Error generating draft:", error);
    return {
      response:
        "I encountered an error while drafting the document. Please try providing more details about what you'd like me to create.",
      errors: [`DocDraft node error: ${error}`],
    };
  }
}
