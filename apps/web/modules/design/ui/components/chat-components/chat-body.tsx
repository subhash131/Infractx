import React from "react";
import { SentMessage } from "./sent-message";
import { ReceivedMessage } from "./received-message";

export const ChatBody = () => {
  return (
    <div className="w-full flex-1 flex flex-col gap-1 p-2 overflow-y-scroll hide-scrollbar text-xs">
      <SentMessage />
      <ReceivedMessage />
      <SentMessage />
      <ReceivedMessage />
      <SentMessage />
      <ReceivedMessage />
      <SentMessage />
      <ReceivedMessage />
    </div>
  );
};
