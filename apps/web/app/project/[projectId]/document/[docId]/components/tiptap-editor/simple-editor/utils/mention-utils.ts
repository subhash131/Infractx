import { Id } from "@workspace/backend/_generated/dataModel";

export type SuggestionItem = {
  id: string;
  label: string;
  icon: string;
  description: string;
  command: (editor: any) => void;
};

interface FileData {
  _id: Id<"text_files">;
  title: string;
  type: "FILE" | "FOLDER";
  parentId?: Id<"text_files"> | null;
}

interface SmartBlockData {
  externalId: string;
  content?: { text?: string }[];
  props?: {
    title?: string;
  };
}

import { api } from "@workspace/backend/_generated/api";

export const getMentionSuggestions = async (
  query: string,
  files: FileData[] | undefined,
  smartBlocks: SmartBlockData[] | undefined,
  currentFileId: Id<"text_files">,
  ancestors: FileData[] | undefined,
  convex: any
): Promise<SuggestionItem[]> => {
  // 1. File Drill-down (@./filename:...)
  if (query.startsWith('./') && query.includes(':')) {
    const colIndex = query.indexOf(':');
    const filePart = query.substring(0, colIndex); // e.g. "./file"
    const filterPart = query.substring(colIndex + 1); // e.g. "" or "search"

    const parts = filePart.split('/');
    const fileName = parts.pop();
    
    let depth = 0;
    for (const part of parts) {
      if (part === '..') depth++;
    }

    let targetParentId: Id<"text_files"> | null = null;
    
    if (depth === 0) {
      const currentFile = files?.find(f => f._id === currentFileId);
      targetParentId = currentFile?.parentId ?? null;

    } else {
      if (ancestors && ancestors.length >= depth) {
        targetParentId = ancestors[ancestors.length - depth]?._id ?? null;
      } else if (depth > (ancestors?.length || 0)) {
          return []
      }
    }

    const targetFile = files?.find(f => f.parentId === targetParentId && f.title === fileName && f.type === 'FILE');

    if (targetFile) {
        const blocks = await convex.query(api.requirements.textFileBlocks.getSmartBlocks, { textFileId: targetFile._id });
        
        return (blocks || [])
         .filter((b: any) => {
            const title = (b.content && b.content[0] && b.content[0].text) || "Untitled Smart Block";
            return !filterPart || title.toLowerCase().includes(filterPart.toLowerCase());
         })
         .map((b: any) => {
            const title = (b.content && b.content[0] && b.content[0].text) || "Untitled Smart Block";
            return {
                id: b.externalId,
                label: title,
                icon: '⚡',
                description: `Smart Block in ${targetFile.title}`,
                command: (editor: any) => {
                    editor.chain().focus().insertContent(title).run()
                }
            };
         });
    }
    return [];
  }

  // 2. Files Navigation (@./...)
  if (query.startsWith('./')) {
    if (!files || !ancestors) return [];

    const parts = query.split('/');
    // Count how many '..' segments
    let depth = 0;
    for (const part of parts) {
      if (part === '..') depth++;
    }

    let targetParentId: Id<"text_files"> | null = null;
    
    // Determine target folder based on depth
    if (depth === 0) {
      const currentFile = files.find(f => f._id === currentFileId);
      targetParentId = currentFile?.parentId ?? null;

    } else {
      // @./../ -> Parent of current file 
      // ancestors list is ordered [root, ..., parent]
      // index = ancestors.length - depth
      if (ancestors.length >= depth) {
        targetParentId = ancestors[ancestors.length - depth]?._id ?? null;
      } else if (depth > ancestors.length) {
          // trying to go above root
          return []
      }
    }

    const relevantFiles = files.filter(f => f.parentId === targetParentId);

    return relevantFiles.map(f => ({
      id: f._id,
      label: f.title,
      icon: f.type === 'FOLDER' ? '📁' : '📄',
      description: f.type === 'FOLDER' ? 'Folder' : 'File',
      command: (editor: any) => {
          // Reconstruct path to preserve context and append separator
          const parts = query.split('/');
          parts.pop(); 
          const basePath = parts.join('/');
          const separator = basePath ? '/' : '';
          const suffix = f.type === 'FILE' ? ':' : '/';
          
          editor.chain().focus().insertContent(`@${basePath}${separator}${f.title}${suffix}`).run()
      }
    }));
  }

  // 3. Smart Blocks (default @...)
  // 3. Smart Blocks (default @...)
  if (!smartBlocks) return [];
  
  return smartBlocks
     .filter(b => {
         // Fallback to "Untitled" if structure doesn't match
         const title = (b.content && b.content[0] && b.content[0].text) || "Untitled Smart Block";
         const matches = !query || title.toLowerCase().includes(query.toLowerCase());
         return matches;
     })
     .map(b => ({
     id: b.externalId,
     label: (b.content && b.content[0] && b.content[0].text) || "Untitled Smart Block",
     icon: '⚡',
     description: 'Smart Block',
     command: (editor: any) => {
        const title = (b.content && b.content[0] && b.content[0].text) || "Untitled Smart Block";
        editor.chain().focus().insertContent(title).run()
     }
  }));
};
