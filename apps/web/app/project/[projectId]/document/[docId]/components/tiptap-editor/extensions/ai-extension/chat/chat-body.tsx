import React, { Fragment, useEffect, useRef } from "react";
import { SentMessage } from "./sent-message";
import { ReceivedMessage } from "./received-message";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { useChatStore } from "../../../store/chat-store";

export const ChatBody = ({ messages }: { messages: Doc<"messages">[] }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { streamingText } = useChatStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="w-full flex-1 flex flex-col gap-1 p-2 overflow-y-scroll hide-scrollbar text-xs">
      {messages.map(({ message: { content, role }, _id }) => {
        return (
          <Fragment key={_id}>
            {role === "AI" && <ReceivedMessage message={content} />}
            {role === "USER" && <SentMessage message={content} />}
          </Fragment>
        );
      })}
      {streamingText && <ReceivedMessage message={streamingText} />}
      <div ref={messagesEndRef} />
    </div>
  );
};
