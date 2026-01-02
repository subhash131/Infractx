"use client";
import React, { useState, useEffect } from "react";
import { ChatHeader } from "./chat-components/chat-header";
import { ChatBody } from "./chat-components/chat-body";
import { ChatFooter } from "./chat-components/chat-footer";
import { cn } from "@workspace/ui/lib/utils";
import { useStream } from "@convex-dev/persistent-text-streaming/react";
import { StreamId } from "@convex-dev/persistent-text-streaming";
import { api } from "@workspace/backend/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { Id } from "@workspace/backend/_generated/dataModel";

export const ChatWindow = () => {
  const [position, setPosition] = useState({
    x: innerWidth * 0.75,
    y: innerHeight * 0.25,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [conversationId, setConversationId] = useState(
    "mh7cwasedxxgevvy8gqeq6pqrx7yfghk"
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

        console.log({
          target: (e.target as HTMLDivElement)?.parentElement?.clientHeight,
        });

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
        "z-99 border shadow-lg absolute rounded-xl w-80 h-[30rem] bg-background overflow-hidden flex flex-col transition",
        isDragging && "select-none"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <ChatHeader onMouseDown={handleMouseDown} />
      <ChatBody messages={messages ?? []} />
      <ChatFooter conversationId={conversationId} />
    </div>
  );
};
