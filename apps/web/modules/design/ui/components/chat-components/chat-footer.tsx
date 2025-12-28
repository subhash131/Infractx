import React from "react";
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

export const ChatFooter = () => {
  return (
    <div className="w-full shrink-0 bg-white border p-1">
      <div className="w-full flex justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="z-100">Add Context</TooltipContent>
        </Tooltip>
        <div className="flex flex-1 overflow-x-scroll text-xs items-center gap-1 hide-scrollbar">
          <div className="flex items-center gap-0.5 bg-accent py-0.5 px-2 rounded-2xl">
            <p>hello</p>
            <Button variant="ghost" className="p-0 h-fit">
              <HugeiconsIcon icon={Cancel01Icon} size={12} />
            </Button>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"ghost"}>
              <HugeiconsIcon icon={SentIcon} strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="z-100">Send</TooltipContent>
        </Tooltip>
      </div>
      <Textarea className="focus-visible:ring-0 p-1 h-10 max-h-10" rows={2} />
    </div>
  );
};
