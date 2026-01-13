import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface MenuPosition {
  x: number;
  y: number;
}

export function FrameContextMenu({ onSave }: { onSave: () => void }) {
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
    window.addEventListener("scroll", close, true);

    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [pos]);

  if (!pos) return null;

  return createPortal(
    <div
      className="fixed text-[#fff] bg-[#111] min-h-40 p-1 rounded-lg min-w-40"
      style={{
        left: pos.x,
        top: pos.y,
      }}
    >
      <button
        className="px-2 py-1 text-xs rounded hover:bg-gray-200 hover:text-black w-full text-start"
        onClick={(e) => {
          onSave();
          setPos(null);
        }}
      >
        Save as template
      </button>
    </div>,
    document.body
  );
}
