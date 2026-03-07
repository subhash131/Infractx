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
  fileId?: Id<"text_files">;
  fileName?: string;
  content?: { text?: string }[];
  props?: {
    title?: string;
  };
}
import { api } from "@workspace/backend/_generated/api";

const resolveContextFromPath = (
  pathParts: string[],
  files: FileData[] | undefined,
  currentFileId: Id<"text_files">
): Id<"text_files"> | null | undefined => {
  if (!files) return undefined;

  const currentFile = files.find(f => f._id === currentFileId);
  let currentContextId = currentFile?.parentId ?? null;

  for (const part of pathParts) {
    if (part === "" || part === ".") {
      continue;
    }
    
    if (part === "..") {
      if (currentContextId === null) {
        // Already at root, stay at root (or could be error, but loose is better for UX)
        continue;
      }
      const parentFolder = files.find(f => f._id === currentContextId);
      currentContextId = parentFolder?.parentId ?? null;
    } else {
      // Navigate down to child folder
      // We look for a FOLDER with this title and the current parentId
      const childFolder = files.find(
        f => (currentContextId === null ? !f.parentId : f.parentId === currentContextId) 
             && f.title === part 
             && f.type === "FOLDER"
      );
      
      if (childFolder) {
        currentContextId = childFolder._id;
      } else {
        return undefined;
      }
    }
  }

  return currentContextId;
};

export const getMentionSuggestions = async (
  query: string,
  files: FileData[] | undefined,
  smartBlocks: SmartBlockData[] | undefined,
  currentFileId: Id<"text_files">,
  ancestors: FileData[] | undefined,
  convex: any
): Promise<SuggestionItem[]> => {
  // 1. File Drill-down (@./filename:...)
  if (query.startsWith('.') && query.includes(':')) {
    const colIndex = query.indexOf(':');
    const filePart = query.substring(0, colIndex); // e.g. "./file"
    const filterPart = query.substring(colIndex + 1); // e.g. "" or "search"

    const parts = filePart.split('/');
    const fileName = parts.pop();
    
    // parts is e.g. ['.', '..', 'backend'] for "./../backend/File"
    // We already popped the filename, so parts is the directory path.
    const targetParentId = resolveContextFromPath(parts, files, currentFileId);
    
    if (targetParentId === undefined) return [];

    const targetFile = files?.find(f => (targetParentId === null ? !f.parentId : f.parentId === targetParentId) && f.title === fileName && f.type === 'FILE');

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
                description: `${targetFile.title}`,
                command: (editor: any) => {
                    editor.chain().focus().insertContent({
                        type: 'smartBlockMention',
                        attrs: {
                            blockId: b.externalId,
                            label: targetFile._id === currentFileId ? `${title}` : `${targetFile.title}:${title}`,
                            fileId: targetFile._id,
                            fileName: targetFile.title,
                        },
                    }).run()
                }
            };
         });
    }
    return [];
  }

  // 2. Files Navigation (@./...)
  if (query.startsWith('.')) {
    if (!files || !ancestors) return [];

    const parts = query.split('/');
    // parts has the search term at the end. We want the directory path.
    // e.g. "@./../back" -> parts=["."] (split error?), query="./../back"
    // split('/') -> [".", "..", "back"]
    // pop -> "back" (filter)
    // path -> [".", ".."]
    // if query ends in /, split gives [..., ""] -> pop -> "" (filter empty) -> path [..., "backend"]
    
    // We already popped the last part in the logic below (lines 127-128 in original code, but we need to do it here for context resolution)
    // Wait, existing code did NOT pop before resolving depth. Use `parts` from split?
    // In original code: `const parts = query.split('/');`
    // Then loop counted `..`.
    // We need to act on `parts` minus the last element (which is the partial match).
    
    const dirParts = [...parts];
    dirParts.pop(); // Remove the filter/search part
    
    const targetParentId = resolveContextFromPath(dirParts, files, currentFileId);
    
    if (targetParentId === undefined) return [];

    const relevantFiles = files.filter(f => targetParentId === null ? !f.parentId : f.parentId === targetParentId);

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

  const getFilePath = (fileId: Id<"text_files"> | null | undefined) => {
    if (!fileId || !files) return "Unknown File";
    let path: string[] = [];
    let curr: Id<"text_files"> | null | undefined = fileId;
    while (curr) {
      const f = files.find(f => f._id === curr);
      if (!f) break;
      path.unshift(f.title);
      curr = f.parentId;
    }
    return path.join('/');
  };

  // 3. Colon File Search (e.g. filename:)
  if (!query.startsWith('.') && query.includes(':')) {
    if (!smartBlocks) return [];
    
    const colIndex = query.indexOf(':');
    const fileQuery = query.substring(0, colIndex).toLowerCase();
    const filterPart = query.substring(colIndex + 1).toLowerCase();

    return smartBlocks
      .filter(b => {
         const title = (b.content && b.content[0] && b.content[0].text) || "Untitled Smart Block";
         const filePath = getFilePath(b.fileId).toLowerCase();
         
         const fileMatches = filePath.includes(fileQuery);
         const blockMatches = !filterPart || title.toLowerCase().includes(filterPart);
         
         return fileMatches && blockMatches;
      })
      .map(b => {
        const title = (b.content && b.content[0] && b.content[0].text) || "Untitled Smart Block";
        const filePath = getFilePath(b.fileId);
        return {
           id: b.externalId,
           label: title,
           icon: '⚡',
           description: filePath ? `${filePath}` : 'Smart Block',
           command: (editor: any) => {
              editor.chain().focus().insertContent({
                 type: 'smartBlockMention',
                 attrs: {
                    blockId: b.externalId,
                    label: b.fileId === currentFileId ? `${title}` : (b.fileName ? `${b.fileName}:${title}` : title),
                    fileId: b.fileId || null,
                    fileName: b.fileName || null,
                 },
              }).run()
           }
        }
      });
  }

  // 4. Smart Blocks (default @...)
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
      description: b.fileId ? `${getFilePath(b.fileId)}` : 'Smart Block',
      command: (editor: any) => {
         const title = (b.content && b.content[0] && b.content[0].text) || "Untitled Smart Block";
         editor.chain().focus().insertContent({
            type: 'smartBlockMention',
            attrs: {
               blockId: b.externalId,
               label: b.fileId === currentFileId ? `${title}` : (b.fileName ? `${b.fileName}:${title}` : title),
               fileId: b.fileId || null,
               fileName: b.fileName || null,
            },
         }).run()
      }
   }));
};
