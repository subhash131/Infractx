"use client";
import React, { useState, useEffect } from "react";
import { ChatHeader } from "./chat-header";
import { ChatBody } from "./chat-body";
import { ChatFooter } from "./chat-footer";
import { cn } from "@workspace/ui/lib/utils";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { useQuery } from "convex/react";
import { Editor } from "@tiptap/react";

interface ChatWindowProps {
  editor?: Editor | null;
  onClose?: () => void;
}

export const ChatWindow = ({ editor, onClose }: ChatWindowProps) => {
  const [position, setPosition] = useState({
    x: innerWidth * 0.65,
    y: innerHeight * 0.2,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [conversationId, setConversationId] = useState(
    "mh78e9t21y3bven4937p7s0eyn7yeac8"
  );
  const messages = useQuery(api.ai.messages.listMessages, {
    conversationId: conversationId as Id<"conversations">,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Calculate new position using dragStart offset
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Get window dimensions
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const cardWidth = 320;
        const cardHeight = 480;

        // Constrain to viewport bounds
        const constrainedX = Math.max(
          0,
          Math.min(newX, windowWidth - cardWidth)
        );
        const constrainedY = Math.max(
          0,
          Math.min(newY, windowHeight - cardHeight)
        );

        setPosition({ x: constrainedX, y: constrainedY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  return (
    <div
      className={cn(
        "z-99 border absolute rounded-xl w-80 h-[30rem] bg-[#1f1f1f] shadow-2xl overflow-hidden flex flex-col transition",
        isDragging && "select-none"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <ChatHeader onMouseDown={handleMouseDown} onClose={onClose} />
      <ChatBody messages={messages ?? []} />
      <ChatFooter conversationId={conversationId} editor={editor ?? undefined}/>
    </div>
  );
};
