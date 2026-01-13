import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TemplateSaveForm } from "../templates/template-save-form";
import { Id } from "@workspace/backend/_generated/dataModel";

interface MenuPosition {
  x: number;
  y: number;
}

export function FrameContextMenu({ frameId }: { frameId?: Id<"layers"> }) {
  const [pos, setPos] = useState<MenuPosition | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y } = (e as CustomEvent).detail;
      setPos({ x, y });
    };

    window.addEventListener("frame-context-menu", handler);
    return () => window.removeEventListener("frame-context-menu", handler);
  }, []);

  useEffect(() => {
    if (!pos) return;

    const close = () => setPos(null);
    window.addEventListener("click", close);

    return () => window.removeEventListener("click", close);
  }, [pos]);

  if (!pos || !frameId) return null;

  return createPortal(
    <div
      className="fixed bg-[#111] text-white rounded-lg p-1 min-w-40"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <TemplateSaveForm frameId={frameId} />
    </div>,
    document.body
  );
}
