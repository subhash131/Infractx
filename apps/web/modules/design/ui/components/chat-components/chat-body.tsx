import React, { Fragment } from "react";
import { SentMessage } from "./sent-message";
import { ReceivedMessage } from "./received-message";
import { Doc } from "@workspace/backend/_generated/dataModel";

export const ChatBody = ({ messages }: { messages: Doc<"messages">[] }) => {
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
    </div>
  );
};
