
/**
 * Flattens nested block content into human-readable text.
 * Input: Convex block objects
 * Output: Markdown-like string
 */

export function parseBlocks(blocks: any[]): string {
    if (!blocks || !Array.isArray(blocks)) return "";
  
    // Sort blocks by rank if possible, otherwise keep order
    const sortedBlocks = [...blocks].sort((a, b) => {
      return (a.rank || "").localeCompare(b.rank || "");
    });
  
    let output = "";
  
    // Helper to extract text from content array
    // [{type: 'text', text: 'Hello'}, {type: 'text', text: ' world', marks: [...]}] -> "Hello world"
    const extractText = (content: any): string => {
      if (!content || !Array.isArray(content)) return "";
      return content.map((c: any) => c.text || "").join("");
    };
  
    // Build a map of blocks by ID for easy parent lookup
    const blockMap = new Map(sortedBlocks.map(b => [b.externalId, b]));
    
    // Process blocks
    // We'll iterate through all blocks, but for nested structures (lists, smartBlocks),
    // we might want to handle them recursively. 
    // For simplicity in this context-fetching use case, we'll iterate linearly
    // but use indentation based on parent/child relationships if we can infer them,
    // OR just output them flatly with clear type indicators.
  
    for (const block of sortedBlocks) {
      const text = extractText(block.content);
      const type = block.type;
  
      switch (type) {
        case "heading":
          const level = block.props?.level || 1;
          output += `${"#".repeat(level)} ${text}\n\n`;
          break;
        
        case "paragraph":
          // Skip empty paragraphs if they're just spacing
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
           // Smart blocks are container parents. 
           // Their content usually contains the title in a 'smartBlockContent' child
           // and body in 'smartBlockGroup'.
           // Since we're iterating a flat list of ALL blocks, the children (smartBlockContent, smartBlockGroup)
           // will appear later in the list if we sorted by rank/index.
           // BUT, smartBlocks might be stored differently. 
           // Let's print a header for the smart block start.
           output += `\n--- SMART BLOCK: ${block.attrs?.id || "Unknown"} ---\n`;
           break;
        
        case "smartBlockContent":
        case "smartBlockGroup":
            // Structural wrappers, usually ignore or just print content
            if (text.trim()) output += `${text}\n`;
            break;
            
        case "table":
            // Table content usually in children tableRow -> tableCell -> tableParagraph
            output += `\n[Table: ${block.attrs?.id || "Structure"}]\n`;
            
            // Handle nested tableData if present (from Tiptap/Prosemirror structure)
            if (block.content && block.content.tableData && Array.isArray(block.content.tableData)) {
                block.content.tableData.forEach((row: any) => {
                    output += "| ";
                    if (row.content && Array.isArray(row.content)) {
                        row.content.forEach((cell: any) => {
                             // Helper to extract text from cell content
                            const cellText = (cell.content || []).map((node: any) => extractNestedText(node)).join(" ");
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

// Helper to extract text from nested nodes (like tableParagraphs)
const extractNestedText = (node: any): string => {
    if (!node) return "";
    if (node.text) return node.text;
    if (node.content && Array.isArray(node.content)) {
        return node.content.map((child: any) => extractNestedText(child)).join("");
    }
    return "";
};
