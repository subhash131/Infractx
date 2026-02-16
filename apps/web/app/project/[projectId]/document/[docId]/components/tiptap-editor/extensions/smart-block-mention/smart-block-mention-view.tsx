"use client";

import { NodeViewWrapper } from "@tiptap/react";
import { useState, useRef, useEffect } from "react";
import "./smart-block-mention.scss";

export const SmartBlockMentionView = ({ node }: { node: any }) => {
  const { label, blockId, fileId } = node.attrs;
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 400);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setShowTooltip(false);
  };

  const handleNavigate = () => {
    const event = new CustomEvent("navigate-to-smart-block", {
      detail: { blockId, fileId },
    });
    window.dispatchEvent(event);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <NodeViewWrapper
      as="span"
      className="smart-block-mention"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      contentEditable={false}
    >
      <span className="smart-block-mention__icon">⚡</span>
      <span className="smart-block-mention__label">{label || "Untitled"}</span>

      {showTooltip && (
        <span className="smart-block-mention__tooltip" contentEditable={false}>
          <button
            className="smart-block-mention__nav-btn"
            onClick={handleNavigate}
            type="button"
          >
            Go to block →
          </button>
        </span>
      )}
    </NodeViewWrapper>
  );
};
