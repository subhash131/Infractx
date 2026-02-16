"use client";

import { NodeViewWrapper } from "@tiptap/react";
import { Node as PmNode } from "@tiptap/pm/model";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryState } from "nuqs";
import { SmartBlockMentionAttrs } from "./smart-block-mention";
import "./smart-block-mention.scss";

function scrollToBlock(blockId: string) {
  const el = document.querySelector(`[data-id="${blockId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Brief highlight effect
    el.classList.add("smart-block--highlighted");
    setTimeout(() => el.classList.remove("smart-block--highlighted"), 1500);
  }
}

export const SmartBlockMentionView = ({ node }: { node: PmNode }) => {
  const { label, blockId, fileId, fileName } = node.attrs as SmartBlockMentionAttrs;
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentFileId, setFileId] = useQueryState("fileId", { history: "push" });

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

  const handleNavigate = useCallback(async () => {
    if (!blockId) return;
    if (fileId && fileId !== currentFileId) {
      // Different file — switch first, then scroll after load
      await setFileId(fileId);
      // Wait for the new file's content to render
      setTimeout(() => scrollToBlock(blockId), 500);
    } else {
      // Same file — just scroll
      scrollToBlock(blockId);
    }
    setShowTooltip(false);
  }, [blockId, fileId, currentFileId, setFileId]);

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
      <span className="smart-block-mention__icon" onClick={handleNavigate}>⚡</span>
      <span className="smart-block-mention__label" onClick={handleNavigate}>
        {label || "Untitled"}
      </span>

      {showTooltip && (
        <span className="smart-block-mention__tooltip" contentEditable={false}>
          <button
            className="smart-block-mention__nav-btn"
            onClick={handleNavigate}
            type="button"
          >
            Go to {fileName}
          </button>
        </span>
      )}
    </NodeViewWrapper>
  );
};
