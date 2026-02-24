import { tool } from "@langchain/core/tools";
import z from "zod";
import { getConvexClient } from "../convex-client";
import { api } from "@workspace/backend/_generated/api";
import { generateKeyBetween } from "fractional-indexing";

// ─── Types matching the DB block schema ────────────────────────────────────

type TextNode = { type: "text"; text: string };

type ContentBlock =
    | { kind: "paragraph"; text: string }
    | { kind: "heading"; level: 1 | 2 | 3; text: string }
    | { kind: "bulletList"; items: string[] }
    | { kind: "codeBlock"; language?: string; code: string }
    | { kind: "table"; headers: string[]; rows: string[][] };

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
    return crypto.randomUUID();
}

/**
 * Convert a ContentBlock into one or more flat DB block records
 * (smartBlock children).  All parentId values use externalId strings (UUIDs).
 */
function buildChildBlocks(
    items: ContentBlock[],
    smartBlockId: string,
    startRank: string
): Array<{
    externalId: string;
    type: string;
    props: Record<string, unknown>;
    content: unknown;
    rank: string;
    parentId: string | null;
    approvedByHuman: boolean;
}> {
    const result: ReturnType<typeof buildChildBlocks> = [];
    let currentRank = startRank;

    for (const item of items) {
        const id = uid();

        if (item.kind === "paragraph") {
            result.push({
                externalId: id,
                type: "paragraph",
                props: { textAlign: null },
                content: item.text
                    ? [{ type: "text", text: item.text } as TextNode]
                    : [],
                rank: currentRank,
                parentId: smartBlockId,
                approvedByHuman: false,
            });
        } else if (item.kind === "heading") {
            result.push({
                externalId: id,
                type: `heading`,
                props: { textAlign: null, level: item.level },
                content: [{ type: "text", text: item.text } as TextNode],
                rank: currentRank,
                parentId: smartBlockId,
                approvedByHuman:false,
            });
        } else if (item.kind === "bulletList") {
            // Each bullet is a separate paragraph with a bullet mark
            for (const bulletText of item.items) {
                const bulletId = uid();
                result.push({
                    externalId: bulletId,
                    type: "paragraph",
                    props: { textAlign: null },
                    content: bulletText
                        ? [{ type: "text", text: `• ${bulletText}` } as TextNode]
                        : [],
                    rank: currentRank,
                    parentId: smartBlockId,
                    approvedByHuman:false,
                });
                currentRank = generateKeyBetween(currentRank, null);
            }
            // Skip the normal rank bump below since we did it inside the loop
            continue;
        } else if (item.kind === "codeBlock") {
            result.push({
                externalId: id,
                type: "codeBlock",
                props: { language: item.language ?? "typescript" },
                content: item.code
                    ? [{ type: "text", text: item.code } as TextNode]
                    : [],
                rank: currentRank,
                parentId: smartBlockId,
                approvedByHuman:false,
            });
        } else if (item.kind === "table") {
            // Build the TipTap table structure that matches what the DB stores
            const makeCell = (text: string, isHeader: boolean) => ({
                type: isHeader ? "tableHeader" : "tableCell",
                attrs: { colspan: 1, rowspan: 1, colwidth: null },
                content: [
                    {
                        type: "tableParagraph",
                        content: [{ type: "text", text }],
                    },
                ],
            });

            const headerRow = {
                type: "tableRow",
                content: item.headers.map((h) => makeCell(h, true)),
            };

            const dataRows = item.rows.map((row) => ({
                type: "tableRow",
                content: row.map((cell) => makeCell(cell, false)),
            }));

            result.push({
                externalId: id,
                type: "table",
                props: {},
                content: { tableData: [headerRow, ...dataRows] },
                rank: currentRank,
                parentId: smartBlockId,
                approvedByHuman:false,
            });
        }

        currentRank = generateKeyBetween(currentRank, null);
    }

    return result;
}

// ─── Tool ──────────────────────────────────────────────────────────────────

export const addDatabaseSmartBlockTool = tool(
    async (input, config) => {
        try {
            const token = config.configurable?.token;
            if (!token) throw new Error("No session token provided");

            const client = getConvexClient(token);

            // Determine the rank for the new root smartBlock
            const existingBlocks = await client.query(
                api.requirements.textFileBlocks.getBlocksByFileId,
                { textFileId: input.fileId as any }
            );

            // Find the last root-level block rank
            const rootBlocks = (existingBlocks ?? [])
                .filter((b: any) => b.parentId === null || b.parentId === undefined)
                .sort((a: any, b: any) => a.rank.localeCompare(b.rank));

            const lastRootRank = rootBlocks.at(-1)?.rank ?? null;

            const smartBlockRank = generateKeyBetween(lastRootRank, null);

            // ── 1. Build the root smartBlock ─────────────────────────────
            const smartBlockId = uid();
            const smartBlockRecord = {
                externalId: smartBlockId,
                type: "smartBlock",
                props: {},
                content: [{ type: "text", text: input.title }],
                rank: smartBlockRank,
                parentId: null,
                approvedByHuman: false,
            };

            // ── 2. Build all child blocks ────────────────────────────────
            const childStartRank = generateKeyBetween(null, null); // "a0"
            const childBlocks = buildChildBlocks(
                input.content,
                smartBlockId,
                childStartRank
            );

            // ── 3. Trailing empty paragraph (editor convention) ──────────
            const trailingParagraph = {
                externalId: uid(),
                type: "paragraph",
                props: { textAlign: null },
                content: [],
                rank: generateKeyBetween(
                    childBlocks.at(-1)?.rank ?? childStartRank,
                    null
                ),
                parentId: smartBlockId,
                approvedByHuman: false,
            };

            // ── 4. Bulk-insert everything in one mutation ────────────────
            const allBlocks = [smartBlockRecord, ...childBlocks, trailingParagraph];

            await client.mutation(api.requirements.textFileBlocks.bulkCreate, {
                textFileId: input.fileId as any,
                blocks: allBlocks,

            });

            console.log(`✅ Created smartBlock "${input.title}" with ${childBlocks.length} child blocks.`);

            return {
                success: true,
                fileId: input.fileId,
                smartBlockId,
                blocksCreated: allBlocks.length,
            };
        } catch (e: any) {
            console.error("Add Database Smart Block Error:", e);
            return { success: false, error: e.message };
        }
    },
    {
        name: "add_database_smart_block",
        description:
            "Populate a file with a TipTap-compatible smart block hierarchy. Creates a root smartBlock with a title and N child blocks (paragraphs, headings, bullet lists, code blocks, or tables) directly in the database.",
        schema: z.object({
            fileId: z.string().describe(
                "The Convex ID of the file to populate. Must be an existing file (not folder)."
            ),
            title: z.string().describe(
                "The title/label of the smart block — shown as the block's heading in the editor."
            ),
            content: z
                .array(
                    z.discriminatedUnion("kind", [
                        z.object({
                            kind: z.literal("paragraph"),
                            text: z.string().describe("Paragraph text content."),
                        }),
                        z.object({
                            kind: z.literal("heading"),
                            level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
                            text: z.string(),
                        }),
                        z.object({
                            kind: z.literal("bulletList"),
                            items: z.array(z.string()).describe("Array of bullet point strings."),
                        }),
                        z.object({
                            kind: z.literal("codeBlock"),
                            language: z.string().optional().describe("e.g. 'typescript', 'python', 'sql'"),
                            code: z.string().describe("The raw code or pseudo-code."),
                        }),
                        z.object({
                            kind: z.literal("table"),
                            headers: z.array(z.string()).describe("Column header labels."),
                            rows: z
                                .array(z.array(z.string()))
                                .describe("2D array of cell values, each inner array is one row."),
                        }),
                    ])
                )
                .describe(
                    "Ordered list of content blocks to insert as children of the smartBlock. " +
                    "Use paragraphs for text, codeBlocks for pseudo-code, and tables for schemas."
                ),
        }),
    }
);
