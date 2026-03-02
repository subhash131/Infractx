
/**
 * Flattens nested block content into human-readable text.
 * Input: Convex block objects
 * Output: Markdown-like string
 *
 * resolvedSBMs: optional map of blockId (externalId) → fetched block object.
 * When provided, smartBlockMention nodes are inlined with the referenced block's
 * parsed content so the LLM sees the full picture instead of a silent gap.
 */

export function parseBlocks(blocks: any[], resolvedSBMs?: Map<string, any>): string {
    if (!blocks || !Array.isArray(blocks)) return "";
  
    // Sort blocks by rank
    const sortedBlocks = [...blocks].sort((a, b) => {
      return (a.rank || "").localeCompare(b.rank || "");
    });
  
    let output = "";
  
    /**
     * Extract readable text from a TipTap content array.
     * Handles plain text nodes and smartBlockMention inline nodes.
     *
     * SmartBlockMention shape (from DB):
     * { type: "smartBlockMention", attrs: { blockId, label, fileId, fileName } }
     *
     * attrs.blockId === externalId of the referenced smartBlock.
     */
    const extractText = (content: any): string => {
      if (!content || !Array.isArray(content)) return "";
      return content.map((c: any) => {
        if (c.type === "smartBlockMention") {
          const blockId: string = c.attrs?.blockId ?? "";
          const label: string   = c.attrs?.label   ?? blockId ?? "SmartBlock";

          if (resolvedSBMs && blockId && resolvedSBMs.has(blockId)) {
            // Inline the referenced smartblock's content recursively
            const sbBlock = resolvedSBMs.get(blockId)!;
            const sbText  = parseBlocks([sbBlock], resolvedSBMs).trim();
            return `[@${label}: ${sbText || "(empty)"}]`;
          }

          // Fallback: at least surface the label so the LLM knows a reference exists
          return `[@${label}]`;
        }
        return c.text || "";
      }).join("");
    };
  
    for (const block of sortedBlocks) {
      const text = extractText(block.content);
      const type = block.type;
  
      switch (type) {
        case "heading": {
          const level = block.props?.level || 1;
          output += `${"#".repeat(level)} ${text}\n\n`;
          break;
        }
        
        case "paragraph":
          if (text.trim()) {
            output += `${text}\n\n`;
          }
          break;
  
        case "bulletListItem":
          output += `- ${text}\n`;
          break;
  
        case "numberedListItem":
          output += `1. ${text}\n`;
          break;
        
        case "codeBlock":
           output += "```" + (block.props?.language || "") + "\n";
           output += text + "\n";
           output += "```\n\n";
           break;
  
        case "smartBlock":
           output += `\n--- SMART BLOCK: ${block.externalId || block.attrs?.id || "Unknown"} ---\n`;
           break;
        
        case "smartBlockContent":
        case "smartBlockGroup":
            if (text.trim()) output += `${text}\n`;
            break;
            
        case "table":
            output += `\n[Table: ${block.attrs?.id || "Structure"}]\n`;
            if (block.content && block.content.tableData && Array.isArray(block.content.tableData)) {
                block.content.tableData.forEach((row: any) => {
                    output += "| ";
                    if (row.content && Array.isArray(row.content)) {
                        row.content.forEach((cell: any) => {
                            const cellText = (cell.content || [])
                                .map((node: any) => extractNestedText(node))
                                .join(" ");
                            output += cellText + " | ";
                        });
                    }
                    output += "\n";
                });
                output += "\n";
            }
            break;
        
        case "image":
             output += `[Image: ${block.props?.src || "No src"}]\n`;
             break;
  
        default:
          if (text.trim()) {
             output += `[${type}]: ${text}\n`;
          }
      }
    }
  
    console.log("--- [DEBUG] Parsed Content ---");
    console.log(output.substring(0, 500) + (output.length > 500 ? "..." : ""));
    console.log("-----------------------------------");
    return output;
}

/** Extract text from deeply nested nodes (e.g. table cells) */
const extractNestedText = (node: any): string => {
    if (!node) return "";
    if (node.text) return node.text;
    if (node.content && Array.isArray(node.content)) {
        return node.content.map((child: any) => extractNestedText(child)).join("");
    }
    return "";
};
