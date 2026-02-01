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
import { cn } from "@workspace/ui/lib/utils";
import { TreeItemData } from "./utils/parse-tree";
import { HugeiconsIcon } from "@hugeicons/react";
import { File02Icon, FileAddIcon, Folder01Icon, Folder02Icon, FolderAddIcon } from "@hugeicons/core-free-icons";
import { useQueryState } from "nuqs";
import { truncate } from "@/modules/utils";

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

  // Manage selected file ID in URL
  const [_, setSelectedFileId] = useQueryState("fileId");

  const [state, setState] = useState<Partial<TreeState<TreeItemData>>>(() => {
    // Load initial state from localStorage
    if (typeof window !== "undefined" && docId) {
      const savedState = localStorage.getItem(`tree-state-${docId}`);
      if (savedState) {
        try {
          return JSON.parse(savedState);
        } catch (e) {
          console.error("Failed to parse saved tree state:", e);
        }
      }
    }
    return {};
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
    
    // Expand the parent folder if it's closed
    if (parentId) {
      setState(prev => ({
        ...prev,
        expandedItems: [...(prev.expandedItems || []), parentId],
        renamingValue:""
      }));
    }
    
    // Auto-rename the new file
    if (newFileId) {
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          renamingItem: newFileId,
          renamingValue:""
        }));
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
    
    // Expand the parent folder if it's closed
    if (parentId) {
      setState(prev => ({
        ...prev,
        expandedItems: [...(prev.expandedItems || []), parentId],
        renamingValue:""
      }));
    }
    
    // Auto-rename the new folder
    if (newFolderId) {
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          renamingItem: newFolderId,
          renamingValue:""
        }));
      }, 100); // Small delay to ensure the item is rendered
    }
  };

  return (
    <div {...tree.getContainerProps()} className="tree flex flex-col items-start w-full relative">
        {tree.getItems().map((item) => (
          <Fragment key={item.getId()}>
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
              <button
                {...item.getProps()}
                style={{ paddingLeft: `${item.getItemMeta().level * 20}px` }}
                className="w-full text-left rounded border-0 outline-none group"
                onClick={(e) => {
                  // Call the original onClick from getProps() to maintain tree behavior
                  const originalOnClick = item.getProps().onClick;
                  if (originalOnClick) {
                    originalOnClick(e);
                  }
                  
                  // Then add our custom logic for files only
                  const itemId = item.getId();
                  const itemData = item.getItemData();
                  if (
                    itemId !== "root" && 
                    itemId !== "__virtual_root__" && 
                    itemData.type === "FILE"
                  ) {
                    setSelectedFileId(itemId);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  item.startRenaming();
                }}
              >
                <div
                  className={cn("treeitem flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700 justify-between w-full", {
                    "bg-gray-700/50": item.isSelected(),
                    "bg-gray-700": item.isDragTarget(),
                  })}
                >
                  <div className="flex items-center gap-2">
                    <span>
                      {item.isFolder() ? (
                        <HugeiconsIcon icon={item.isExpanded() ? Folder02Icon : Folder01Icon} size={16} />
                      ) : (
                        <HugeiconsIcon icon={File02Icon} size={16} />
                      )}
                    </span>
                    <span>{truncate(item.getItemName(), 12)}</span>
                  </div>
                  
                  {/* Show action buttons only for root */}
                  {item.getId() === "root" && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateFile();
                        }}
                        className="p-1 hover:bg-gray-600 rounded text-xs cursor-pointer"
                        title="New File"
                      >
                       <HugeiconsIcon icon={FileAddIcon} size={16} />
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateFolder();
                        }}
                        className="p-1 hover:bg-gray-600 rounded text-xs cursor-pointer"
                        title="New Folder"
                      >
                        <HugeiconsIcon icon={FolderAddIcon} size={16} />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            )}
          </Fragment>
        ))}
      </div>
      
  );
};