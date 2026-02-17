"use client";

import { NodeViewWrapper } from "@tiptap/react";
import { Node as PmNode } from "@tiptap/pm/model";
import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryState } from "nuqs";
import { SmartBlockMentionAttrs } from "./smart-block-mention";
import "./smart-block-mention.scss";

function scrollToBlock(blockId: string) {
  const element = document.getElementById(blockId);
  if (!element) return;

  element.scrollIntoView({
    behavior: "smooth",
    block: "start", 
  });
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
      await setFileId(fileId);
      // Wait for new file content to render, then scroll via hash
      setTimeout(() => scrollToBlock(blockId), 500);
    } else {
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

      {fileName && showTooltip && (
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
