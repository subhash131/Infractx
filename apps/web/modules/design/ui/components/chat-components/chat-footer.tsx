import React, { useState } from "react";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import {
  Cancel01Icon,
  PlusSignIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useAction } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import useCanvas from "@/modules/design/store";

export const ChatFooter = ({ conversationId }: { conversationId: string }) => {
  // const sendMessage = useAction(api.ai.workflowAction.create);

  const { activePageId, canvas, activeObject } = useCanvas();
  const [prompt, setPrompt] = useState("");
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPrompt("");
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.code === "Space") {
      e.stopPropagation();
    }
  };
  return (
    <form
      className="w-full shrink-0 bg-white border-t p-1"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full flex justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} type="button">
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="z-100">Add Context</TooltipContent>
        </Tooltip>
        <div className="flex flex-1 overflow-x-scroll text-xs items-center gap-1 hide-scrollbar">
          {activeObject?.name && (
            <div className="flex items-center gap-0.5 bg-accent py-0.5 px-2 rounded-2xl">
              <p>{activeObject?.name?.toLowerCase()}</p>
              <Button variant="ghost" className="p-0 h-fit" type="button">
                <HugeiconsIcon icon={Cancel01Icon} size={12} />
              </Button>
            </div>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"} type="submit">
              <HugeiconsIcon icon={SentIcon} strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="z-100">Send</TooltipContent>
        </Tooltip>
      </div>
      <Textarea
        className="p-1 h-10 max-h-10"
        placeholder="Describe your thoughts..."
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
    </form>
  );
};
