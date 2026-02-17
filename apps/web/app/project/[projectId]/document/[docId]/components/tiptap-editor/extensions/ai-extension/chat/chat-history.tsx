
import { useQuery } from "convex/react";
import React from "react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { MessageProgrammingIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useChatStore } from "../../../store/chat-store";
import { formatDistanceToNow } from "date-fns";

export const ChatHistory = () => {
  const conversations = useQuery(api.ai.conversations.listConversations,{orgId:"personal"});
  const { setConversationId, setShowHistory } = useChatStore();

  if (!conversations) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>Loading history...</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <HugeiconsIcon icon={MessageProgrammingIcon} size={32} />
        <p>No conversation history</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto h-full">
      {conversations.map((conversation) => (
        <Button
          key={conversation._id}
          variant="ghost"
          className="w-full justify-start h-auto flex flex-col items-start gap-1 p-3 border border-border/50 hover:bg-accent/50"
          onClick={() => {
            setConversationId(conversation._id);
            setShowHistory(false);
          }}
        >
          <span className="font-medium truncate w-full text-left">
            {conversation.title || "Untitled Conversation"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(conversation._creationTime, {
              addSuffix: true,
            })}
          </span>
        </Button>
      ))}
    </div>
  );
};
