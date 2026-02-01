import { useTree } from "@headless-tree/react";
import {
  syncDataLoaderFeature,
  selectionFeature,
  hotkeysCoreFeature,
  TreeState,
} from "@headless-tree/core";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { useMemo, useEffect, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { TreeItemData } from "./utils/parse-tree";
import { HugeiconsIcon } from "@hugeicons/react";
import { File02Icon, Folder01Icon } from "@hugeicons/core-free-icons";

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

  const [state, setState] = useState<Partial<TreeState<TreeItemData>>>({});

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
    features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
  });

  // Rebuild tree when data changes
  useEffect(() => {
    if (files && files.length > 0) {
      tree.rebuildTree();
    }
  }, [files, tree]);


  if (!files) return <div className="p-4 text-gray-500">Loading files...</div>;

  return (
      <div {...tree.getContainerProps()} className="tree flex flex-col items-start w-full">
        {tree.getItems().map((item) => (
          <button
            {...item.getProps()}
            key={item.getId()}
            style={{ paddingLeft: `${item.getItemMeta().level * 20}px` }}
            className="w-full text-left rounded"
          >
            <div
              className={cn("treeitem flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700", {
                "bg-gray-700": item.isSelected(),
              })}
            >
              <span>{item.isFolder() ? <HugeiconsIcon icon={Folder01Icon} size={16} /> : <HugeiconsIcon icon={File02Icon} size={16} />}</span>
              <span>{item.getItemName()}</span>
            </div>
          </button>
        ))}
      </div>
      
  );
};