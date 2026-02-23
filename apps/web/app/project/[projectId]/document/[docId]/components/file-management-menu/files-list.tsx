import { useTree } from "@headless-tree/react";
import {
  syncDataLoaderFeature,
  selectionFeature,
  hotkeysCoreFeature,
  dragAndDropFeature,
  keyboardDragAndDropFeature,
  renamingFeature,
  TreeState,
  insertItemsAtTarget,
  removeItemsFromParents,
} from "@headless-tree/core";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {  Id } from "@workspace/backend/_generated/dataModel";
import { useMemo, useEffect, useState, Fragment } from "react";
import { TreeItemData } from "../utils/parse-tree";
import { HugeiconsIcon } from "@hugeicons/react";
import { File02Icon,  Folder01Icon, Folder02Icon } from "@hugeicons/core-free-icons";
import { useQueryState } from "nuqs";
import { FileItemWithContextMenu, ClipboardData } from "./file-item-with-context-menu";

// Data structure type for the tree
type FileDataStructure = {
  root: TreeItemData;
  [key: string]: TreeItemData;
};

export const FilesList = ({ docId }: { docId: Id<"documents"> }) => {
  const files = useQuery(
    api.requirements.textFiles.getFilesByDocumentId,
    docId ? { documentId: docId } : "skip"
  );
  const document = useQuery(api.requirements.documents.getDocumentById, docId ? { documentId: docId } : "skip");
  const createFile = useMutation(api.requirements.textFiles.create);
  const updateFile = useMutation(api.requirements.textFiles.updateFile);
  const deleteFile = useMutation(api.requirements.textFiles.deleteFile);
  const duplicateFile = useMutation(api.requirements.textFiles.duplicateFile);

  // Manage selected file ID in URL
  const [_, setSelectedFileId] = useQueryState("fileId");

  // Clipboard state for cut/copy
  const [clipboard, setClipboard] = useState<ClipboardData>(null);

  const [state, setState] = useState<Partial<TreeState<TreeItemData>>>(() => {
    // Load initial state from localStorage
    if (typeof window !== "undefined" && docId) {
      const savedState = localStorage.getItem(`tree-state-${docId}`);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (!parsed.expandedItems) parsed.expandedItems = ["root", "__virtual_root__"];
          else {
            if (!parsed.expandedItems.includes("root")) parsed.expandedItems.push("root");
            if (!parsed.expandedItems.includes("__virtual_root__")) parsed.expandedItems.push("__virtual_root__");
          }
          return parsed;
        } catch (e) {
          console.error("Failed to parse saved tree state:", e);
        }
      }
    }
    return { expandedItems: ["root", "__virtual_root__"] };
  });

  const dataStructure = useMemo<FileDataStructure>(() => {
    const structure: FileDataStructure = {
      root: {
        id: "root",
        title: document?.title || "Project",
        type: "FOLDER",
        childrenIds: [],
      },
    };

    if (files) {
      // First pass: add all items to the structure
      files.forEach((file) => {
        structure[file._id] = {
          id: file._id,
          title: file.title,
          type: file.type,
          childrenIds: [],
        };
      });

      // Second pass: build parent-child relationships
      files.forEach((file) => {
        if (file.parentId) {
          const parent = structure[file.parentId];
          if (parent) {
            // Add this file to its parent's childrenIds
            parent.childrenIds.push(file._id);
          }
        } else {
          // No parentId - this is a root level file, add to root's children
          structure.root.childrenIds.push(file._id);
        }
      });
    }

    return structure;
  }, [files, document?.title]);

  const tree = useTree<TreeItemData>({
    state,
    setState,
    rootItemId: "__virtual_root__",
    getItemName: (item) => item.getItemData().title,
    isItemFolder: (item) => item.getItemData().type === "FOLDER",
    canReorder: false,
    indent: 20,
    onRename: async (item, newName) => {
      const itemId = item.getId();
      if (itemId !== "root" && itemId !== "__virtual_root__") {
        const titleToSave = newName.trim().replace(/\s+/g, "_") || "Untitled";
        await updateFile({
          fileId: itemId as Id<"text_files">,
          title: titleToSave,
        });
        setState(prev => ({
          ...prev,
          renamingItem: undefined,
          renamingValue:""
        }));
      }
    },
    canRename: (item) => {
      const itemId = item.getId();
      return itemId !== "root" && itemId !== "__virtual_root__";
    },
    dataLoader: {
      getItem: (itemId) => {
        if (itemId === "__virtual_root__") {
          return {
            id: "__virtual_root__",
            title: "",
            type: "FOLDER" as const,
            childrenIds: ["root"],
          };
        }
        return dataStructure[itemId] ?? {
          id: itemId,
          title: "Unknown",
          type: "FILE" as const,
          childrenIds: [],
        };
      },
      getChildren: (itemId) => {
        if (itemId === "__virtual_root__") {
          return ["root"];
        }
        return dataStructure[itemId]?.childrenIds || [];
      },
    },
    onDrop: async (items, target) => {
      const itemIds = items.map((item) => item.getId());
      
      // Determine the new parent ID based on the target
      let newParentId: string | null = null;
      
      // The target structure contains an 'item' property which is the parent
      const targetParentId = target.item.getId();
      
      // Check for both root and virtual root
      if (targetParentId === "root" || targetParentId === "__virtual_root__") {
        newParentId = null;
      } else {
        newParentId = targetParentId;
      }

      console.log("Drop target:", target, "New parent ID:", newParentId);

      // Update backend for each moved item
      for (const itemId of itemIds) {
        // Skip virtual root and root items
        if (itemId !== "__virtual_root__" && itemId !== "root") {
          console.log("Moving file", itemId, "to", newParentId);
          await updateFile({
            fileId: itemId as Id<"text_files">,
            parentId: newParentId as Id<"text_files"> | null,
          });
        }
      }

      // Update local tree structure
      await removeItemsFromParents(items, (item, newChildren) => {
        const itemData = item.getItemData();
        if (itemData) {
          itemData.childrenIds = newChildren;
        }
      });
      await insertItemsAtTarget(itemIds, target, (item, newChildren) => {
        const itemData = item.getItemData();
        if (itemData) {
          itemData.childrenIds = newChildren;
        }
      });
    },
    features: [
      syncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      dragAndDropFeature,
      keyboardDragAndDropFeature,
      renamingFeature,
    ],
  });

  // Rebuild tree when data changes
  useEffect(() => {
    if (files && files.length > 0) {
      tree.rebuildTree();
    }
  }, [files, tree]);

  // Save tree state to localStorage when it changes
  useEffect(() => {
    if (docId && Object.keys(state).length > 0) {
      const { renamingItem, ...stateToSave } = state;
      localStorage.setItem(`tree-state-${docId}`, JSON.stringify(stateToSave));
    }
  }, [state, docId]);


  if (!files) return <div className="p-2">Loading files...</div>;

  // Determine parent ID based on selected item
  const getParentForNewItem = (): Id<"text_files"> | undefined => {
    const selectedItems = tree.getState().selectedItems;
    
    // If nothing selected or root is selected, create at root level
    if (!selectedItems || selectedItems.length === 0) return undefined;
    
    const selectedId = selectedItems[0]; // Get first selected item
    if (selectedId === "root" || selectedId === "__virtual_root__") return undefined;
    
    // Find the selected file/folder
    const selectedItem = files.find(f => f._id === selectedId);
    if (!selectedItem) return undefined;
    
    // If selected item is a folder, create inside it
    if (selectedItem.type === "FOLDER") {
      return selectedItem._id;
    }
    
    // If selected item is a file, create in its parent
    return selectedItem.parentId || undefined;
  };

  const handleCreateFile = async () => {
    const parentId = getParentForNewItem();
    
    const newFileId = await createFile({
      title: "Untitled",
      documentId: docId,
      type: "FILE",
      parentId,
    });
    
    const effectiveParentId = parentId || "root";
    
    // Expand the parent folder if it's closed
    setState(prev => ({
      ...prev,
      expandedItems: Array.from(new Set([...(prev.expandedItems || []), effectiveParentId])),
      renamingValue:""
    }));
    
    // Auto-rename the new file
    if (newFileId) {
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          renamingItem: newFileId,
          selectedItems: [newFileId],
          renamingValue:""
        }));
        setSelectedFileId(newFileId);
      }, 100); // Small delay to ensure the item is rendered
    }
  };

  const handleCreateFolder = async () => {
    const parentId = getParentForNewItem();
    
    const newFolderId = await createFile({
      title: "New_Folder",
      documentId: docId,
      type: "FOLDER",
      parentId,
    });
    
    const effectiveParentId = parentId || "root";
    
    // Expand the parent folder if it's closed
    setState(prev => ({
      ...prev,
      expandedItems: Array.from(new Set([...(prev.expandedItems || []), effectiveParentId])),
      renamingValue:""
    }));
    
    // Auto-rename the new folder
    if (newFolderId) {
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          expandedItems: [...(prev.expandedItems || []), newFolderId],
          renamingItem: newFolderId,
          selectedItems: [newFolderId],
          renamingValue:""
        }));
        setSelectedFileId(newFolderId);
      }, 100); // Small delay to ensure the item is rendered
    }
  };

  // Context menu action handlers
  const handleRename = (itemId: string) => {
    setState(prev => ({
      ...prev,
      renamingItem: itemId,
      renamingValue: ""
    }));
  };

  const handleDelete = async (itemId: string) => {
    await deleteFile({ fileId: itemId as Id<"text_files"> });
    setSelectedFileId(null);
    // Clean up tree state to remove references to deleted item
    setState(prev => ({
      ...prev,
      selectedItems: (prev.selectedItems || []).filter(id => id !== itemId),
      expandedItems: (prev.expandedItems || []).filter(id => id !== itemId),
    }));
  };

  const handleDuplicate = async (itemId: string) => {
    const newFileId = await duplicateFile({ fileId: itemId as Id<"text_files"> });
    if (newFileId) {
      setSelectedFileId(newFileId);
    }
  };

  const handleCut = (itemId: string) => {
    setClipboard({ itemId, operation: "cut" });
  };

  const handleCopy = (itemId: string) => {
    setClipboard({ itemId, operation: "copy" });
  };

  const handlePaste = async (targetItemId: string) => {
    if (!clipboard) return;

    // Determine the target parent
    const targetData = dataStructure[targetItemId];
    const targetParentId = targetData?.type === "FOLDER" 
      ? targetItemId 
      : files?.find(f => f._id === targetItemId)?.parentId || undefined;

    if (clipboard.operation === "cut") {
      // Move the item
      await updateFile({
        fileId: clipboard.itemId as Id<"text_files">,
        parentId: (targetParentId as Id<"text_files">) || null,
      });
    } else {
      const newId = await duplicateFile({ fileId: clipboard.itemId as Id<"text_files"> });
      if (newId && targetParentId) {
        await updateFile({
          fileId: newId,
          parentId: targetParentId as Id<"text_files">,
        });
      }
    }
    setClipboard(null);
  };

  return (
    <div {...tree.getContainerProps()} className="tree flex flex-col items-start w-full relative">
        {tree.getItems().map((item) => {
          const itemId = item.getId();
          const isSpecialItem = itemId === "root" || itemId === "__virtual_root__";

          return (
            <Fragment key={itemId}>
              {item.isRenaming() ? (
                <div
                  className="flex items-center gap-2 px-2 py-1 w-full"
                  style={{ paddingLeft: `${item.getItemMeta().level * 20}px` }}
                >
                  <span>
                    {item.isFolder() ? (
                      <HugeiconsIcon icon={item.isExpanded() ? Folder02Icon : Folder01Icon} size={16} />
                    ) : (
                      <HugeiconsIcon icon={File02Icon} size={16} />
                    )}
                  </span>
                  <input
                    {...(() => {
                      const { onChange, ...rest } = item.getRenameInputProps();
                      return {
                        ...rest,
                        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                          const newValue = e.target.value.replace(/\s/g, "_");
                          e.target.value = newValue; // Update input value visually
                          onChange?.({
                            ...e,
                            target: {
                              ...e.target,
                              value: newValue,
                            },
                          } as React.ChangeEvent<HTMLInputElement>);
                          setState(prev => ({
                            ...prev,
                            renamingValue:newValue
                          }))
                        }
                      };
                    })()}
                    className="bg-transparent rounded px-2 text-xs focus:outline-none max-w-fit border min-w-0 "
                    onKeyDown={(e)=>{
                      if(e.key === "Enter"){
                        (e.target as HTMLInputElement).blur()
                        e.stopPropagation()
                      }
                    }}
                    
                  />
                </div>
              ) : (
                <FileItemWithContextMenu
                  item={item}
                  isSpecialItem={isSpecialItem}
                  clipboard={clipboard}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onCut={handleCut}
                  onCopy={handleCopy}
                  onPaste={handlePaste}
                  onClickFile={(id) => setSelectedFileId(id)}
                  onCreateFile={handleCreateFile}
                  onCreateFolder={handleCreateFolder}
                />
              )}
            </Fragment>
          );
        })}
      </div>
  );
};