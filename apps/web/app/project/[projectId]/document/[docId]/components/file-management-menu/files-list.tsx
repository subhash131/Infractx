import { Id } from "@workspace/backend/_generated/dataModel";
import React, { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import {
  UncontrolledTreeEnvironment,
  Tree,
  StaticTreeDataProvider,
  TreeItem,
} from "react-complex-tree";
import "react-complex-tree/lib/style-modern.css"; 
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  FileIcon,
  Folder02Icon,
  FolderIcon,
} from "@hugeicons/core-free-icons";

type FileNode = {
  _id: Id<"text_files">;
  title: string;
  type: "FILE" | "FOLDER";
  documentId: Id<"documents">;
  parentId?: Id<"text_files">;
};

export const FilesList = ({ docId }: { docId: Id<"documents"> }) => {
  const files = useQuery(
    api.requirements.textFiles.getFilesByDocumentId,
    docId ? { documentId: docId } : "skip"
  );
  const moveFile = useMutation(api.requirements.textFiles.moveFile);

  // 1. Transform Convex flat array to react-complex-tree format
  const { items, rootItems } = useMemo(() => {
    if (!files) return { items: {}, rootItems: [] };

    const treeMap: Record<string, TreeItem<FileNode>> = {};
    const roots: string[] = [];

    // Initialize items
    files.forEach((file) => {
      treeMap[file._id] = {
        index: file._id,
        canMove: true,
        isFolder: file.type === "FOLDER",
        children: [],
        data: file,
      };
    });

    // Link children to parents
    files.forEach((file) => {
      if (file.parentId) {
        const parent = treeMap[file.parentId];
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(file._id);
        } else {
          roots.push(file._id);
        }
      } else {
        roots.push(file._id);
      }
    });

    // Sort: Folders first, then alphabetical
    Object.values(treeMap).forEach((item) => {
      item.children?.sort((a, b) => {
        const itemA = treeMap[a];
        const itemB = treeMap[b];
        if (!itemA || !itemB) return 0;
        if (itemA.data.type !== itemB.data.type) return itemA.data.type === "FOLDER" ? -1 : 1;
        return itemA.data.title.localeCompare(itemB.data.title);
      });
    });

    // Add a virtual root item
    treeMap["root"] = {
      index: "root",
      canMove: false,
      isFolder: true,
      children: roots,
      data: {
        _id: "root" as Id<"text_files">,
        title: "Root",
        type: "FOLDER",
        documentId: docId,
      },
    };

    return { items: treeMap, rootItems: roots };
  }, [files]);

  if (!files) return <div className="p-2 text-xs text-gray-500">Loading...</div>;
  if (files.length === 0) return <div className="p-2 text-xs text-gray-500">No files yet</div>;

  return (
    <div className="p-1 select-none relative">
      <UncontrolledTreeEnvironment
        dataProvider={new StaticTreeDataProvider(items, (item, newName) => ({ 
          ...item, 
          data: { ...item.data, title: newName } 
        }))}
        canDropBelowOpenFolders={true}
        canDropOnNonFolder={false}
        getItemTitle={(item) => item.data.title}
        viewState={{}}
        canDragAndDrop={true}
        canDropOnFolder={true}
        canReorderItems={true}
        onDrop={(items, target) => {
          items.forEach((item) => {
            const itemId = item.index as string;
            // Don't move the virtual root
            if (itemId === "root") return;          
            // Determine the new parent based on drop target type
            let newParent: string | undefined;
            if (target.targetType === "item" && "targetItem" in target) {
              // Dropped on a folder
              newParent = String((target as { targetItem: string }).targetItem);
            } else if ("parentItem" in target) {
              // Dropped between items, use parentItem
              newParent = String(target.parentItem);
            } else {
              // Dropped at root level
              newParent = undefined;
            }
            
            moveFile({
              fileId: itemId as Id<"text_files">,
              newParentId: newParent === "root" || !newParent
                ? undefined 
                : newParent as Id<"text_files">
            });
          });
        }}
        renderItem={({ item, depth, children, title, context, arrow }) => (
          <div 
            {...context.itemContainerWithChildrenProps}
          >
            <div 
              {...context.interactiveElementProps}
              className="flex items-center gap-1 px-1 py-1 rounded hover:bg-accent/50 cursor-pointer w-full text-left"
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              {/* Arrow */}
              {item.isFolder && item.children?.length ? (
                <div {...context.arrowProps} className="w-4 h-4 flex items-center justify-center">
                  <HugeiconsIcon
                    icon={context.isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                    size={14}
                  />
                </div>
              ) : (
                <div className="w-4 h-4" />
              )}
              
              {/* Icon */}
              <div className="flex-shrink-0">
                <HugeiconsIcon
                  icon={
                    item.isFolder
                      ? context.isExpanded
                        ? Folder02Icon
                        : FolderIcon
                      : FileIcon
                  }
                  size={16}
                  className="text-accent-foreground/50"
                />
              </div>
              
              {/* Title */}
              <span className="text-xs truncate text-accent-foreground/70">
                {item.data.title}
              </span>
            </div>
            {children}
          </div>
        )}
      >
        <Tree treeId="main-tree" rootItem="root" treeLabel="File Explorer" />
      </UncontrolledTreeEnvironment>
    </div>
  );
};