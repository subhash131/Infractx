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
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMemo, useEffect, useState, Fragment } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { TreeItemData } from "./utils/parse-tree";
import { HugeiconsIcon } from "@hugeicons/react";
import { File02Icon, Folder01Icon, Folder02Icon } from "@hugeicons/core-free-icons";
import { useQueryState } from "nuqs";

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
  const [selectedFileId, setSelectedFileId] = useQueryState("fileId");

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
        await updateFile({
          fileId: itemId as Id<"text_files">,
          title: newName,
        });
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
      localStorage.setItem(`tree-state-${docId}`, JSON.stringify(state));
    }
  }, [state, docId]);


  if (!files) return <div className="p-4 text-gray-500">Loading files...</div>;

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
                  {...item.getRenameInputProps()}
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
                className="w-full text-left rounded border-0 outline-none"
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
                  className={cn("treeitem flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700", {
                    "bg-gray-700/50": item.isSelected(),
                    "bg-gray-700": item.isDragTarget(),
                  })}
                >
                  <span>
                    {item.isFolder() ? (
                      <HugeiconsIcon icon={item.isExpanded() ? Folder02Icon : Folder01Icon} size={16} />
                    ) : (
                      <HugeiconsIcon icon={File02Icon} size={16} />
                    )}
                  </span>
                  <span>{item.getItemName()}</span>
                </div>
              </button>
            )}
          </Fragment>
        ))}
      </div>
      
  );
};