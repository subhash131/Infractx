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
  FileAddIcon,
  FolderAddIcon,
} from "@hugeicons/core-free-icons";
import { truncate } from "@/modules/utils";

type FileNode = {
  _id: Id<"text_files"> | "root";
  title: string;
  type: "FILE" | "FOLDER" | "ROOT";
  documentId: Id<"documents">;
  parentId?: Id<"text_files">;
};

export const FilesList = ({ docId, projectId }: { docId: Id<"documents">, projectId: Id<"projects"> }) => {
  const files = useQuery(
    api.requirements.textFiles.getFilesByDocumentId,
    docId ? { documentId: docId } : "skip"
  );
  const document = useQuery(api.requirements.documents.getDocumentById, docId ? { documentId: docId } : "skip");
  const moveFile = useMutation(api.requirements.textFiles.moveFile);
  const createFile = useMutation(api.requirements.textFiles.create);

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

    // Add the project root node
    treeMap["root"] = {
      index: "root",
      canMove: false,
      isFolder: true,
      children: roots,
      data: {
        _id: "root",
        title: truncate(document?.title || "Project",15),
        type: "ROOT",
        documentId: docId,
      },
    };

    // Add a super-root to make "root" visible
    treeMap["super-root"] = {
      index: "super-root",
      canMove: false,
      isFolder: true,
      children: ["root"],
      data: {
        _id: "super-root" as Id<"text_files">,
        title: "Super Root",
        type: "FOLDER",
        documentId: docId,
      },
    };

    return { items: treeMap, rootItems: roots };
  }, [files, document]);

  if (!files) return <div className="p-2 text-xs text-gray-500">Loading...</div>;

  return (
    <div className="p-1 select-none relative size-full">
      <UncontrolledTreeEnvironment
        dataProvider={new StaticTreeDataProvider(items, (item, newName) => ({ 
          ...item, 
          data: { ...item.data, title: newName } 
        }))}
        canDropBelowOpenFolders={true}
        canDropOnNonFolder={false}
        getItemTitle={(item) => item.data.title}
        viewState={{
          "main-tree": {
            expandedItems: ["super-root", "root"]
          }
        }}
        canDragAndDrop={true}
        canDropOnFolder={true}
        canReorderItems={false}
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
            
            // Check if parent is changing - only allow moves between different folders
            const currentParent = item.data.parentId || "root";
            const targetParent = newParent === "root" || !newParent ? "root" : newParent;
            
            if (currentParent === targetParent) {
              return; // Do nothing - same parent, reordering disabled
            }
            
            // Move to new parent
            moveFile({
              fileId: itemId as Id<"text_files">,
              newParentId: newParent === "root" || !newParent
                ? undefined 
                : newParent as Id<"text_files">
            });
          });
        }}
        renderItem={({ item, depth, children, title, context, arrow }) => {
          const isRoot = item.data.type === "ROOT";
          
          // Don't render super-root at all
          if (item.index === "super-root") {
            return <>{children}</>;
          }
          
          return (
            <div 
              {...context.itemContainerWithChildrenProps}
            >
              <div 
                {...context.itemContainerWithoutChildrenProps}
              >
                <div 
                  {...context.interactiveElementProps}
                  className={`flex items-center gap-1 px-1 py-1 rounded cursor-pointer w-full text-left ${
                    isRoot ? 'hover:bg-white/5 font-medium' : 'hover:bg-accent/50'
                  }`}
                  style={{ paddingLeft: `${(depth - 1) * 16}px` }}
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
                  
                  {/* Icon - only for non-root items */}
                  {!isRoot && (
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
                  )}
                  
                  {/* Title */}
                  <span className={`truncate flex-1 ${
                    isRoot ? 'text-sm text-white' : 'text-xs text-accent-foreground/70'
                  }`}>
                    {item.data.title}
                  </span>
                  
                  {/* Create buttons for root node */}
                  {isRoot && (
                    <div className="flex items-center gap-0.5 opacity-70 hover:opacity-100">
                      <button 
                        className="p-0.5 hover:bg-white/10 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          createFile({ title: "New Document", type: "FILE", documentId: docId });
                        }}
                        title="New File"
                      >
                        <HugeiconsIcon icon={FileAddIcon} size={14} />
                      </button>
                      <button 
                        className="p-0.5 hover:bg-white/10 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          createFile({ title: "New Folder", type: "FOLDER", documentId: docId });
                        }}
                        title="New Folder"
                      >
                        <HugeiconsIcon icon={FolderAddIcon} size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {children}
            </div>
          );
        }}
      >
        <Tree treeId="main-tree" rootItem="super-root" treeLabel="File Explorer" />
      </UncontrolledTreeEnvironment>
    </div>
  );
};