import { ActionMenu, ActionMenuItem, ActionMenuSeparator } from "@workspace/ui/components/action-menu";
import { Clipboard, Copy, Pencil, Scissors, Trash2 } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { File02Icon, FileAddIcon, Folder01Icon, Folder02Icon, FolderAddIcon } from "@hugeicons/core-free-icons";
import { truncate } from "@/modules/utils";

export type ClipboardData = {
  itemId: string;
  operation: "cut" | "copy";
} | null;

export function FileItemWithContextMenu({
  item,
  isSpecialItem,
  clipboard,
  onRename,
  onDelete,
  onDuplicate,
  onCut,
  onCopy,
  onPaste,
  onClickFile,
  onCreateFile,
  onCreateFolder,
}: {
  item: any;
  isSpecialItem: boolean;
  clipboard: ClipboardData;
  onRename: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onDuplicate: (id: string) => Promise<void>;
  onCut: (id: string) => void;
  onCopy: (id: string) => void;
  onPaste: (targetId: string) => Promise<void>;
  onClickFile: (id: string) => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}) {
  const itemId = item.getId();

  const treeItemButton = (
    <button
      {...item.getProps()}
      style={{ paddingLeft: `${item.getItemMeta().level * 20}px` }}
      className="w-full text-left rounded border-0 outline-none group"
      onClick={(e) => {
        const originalOnClick = item.getProps().onClick;
        if (originalOnClick) {
          originalOnClick(e);
        }
        
        const itemData = item.getItemData();
        if (
          itemId !== "root" && 
          itemId !== "__virtual_root__" && 
          itemData.type === "FILE"
        ) {
          onClickFile(itemId);
        }
      }}
      onContextMenu={(e) => {
        const originalOnClick = item.getProps().onClick;
        if (originalOnClick) {
          originalOnClick(e as any);
        }
        
        const itemData = item.getItemData();
        if (
          itemId !== "root" && 
          itemId !== "__virtual_root__" && 
          itemData.type === "FILE"
        ) {
          onClickFile(itemId);
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
          "opacity-50": clipboard?.itemId === itemId && clipboard?.operation === "cut",
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
        {itemId === "root" && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div
              onClick={(e) => {
                e.stopPropagation();
                onCreateFile();
              }}
              className="p-1 hover:bg-gray-600 rounded text-xs cursor-pointer"
              title="New File"
            >
             <HugeiconsIcon icon={FileAddIcon} size={16} />
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                onCreateFolder();
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
  );

  // Only show context menu for non-root, non-virtual-root items
  if (isSpecialItem) {
    return treeItemButton;
  }

  const items: (ActionMenuItem | ActionMenuSeparator)[] = [
    { label: "Rename", icon: <Pencil size={14} />, onClick: () => onRename(itemId) },
    { label: "Duplicate", icon: <Copy size={14} />, onClick: () => onDuplicate(itemId) },
    { isSeparator: true },
    { label: "Cut", icon: <Scissors size={14} />, onClick: () => onCut(itemId) },
    { label: "Copy", icon: <Copy size={14} />, onClick: () => onCopy(itemId) },
    ...(clipboard ? [{ label: "Paste", icon: <Clipboard size={14} />, onClick: () => onPaste(itemId) }] : []),
    { isSeparator: true },
    { label: "Delete", icon: <Trash2 size={14} />, variant: "destructive", onClick: () => onDelete(itemId) },
  ];

  return (
    <ActionMenu items={items} contentClassName="w-44">
      {treeItemButton}
    </ActionMenu>
  );
}
