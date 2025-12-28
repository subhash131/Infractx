import { Cancel01FreeIcons } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import React from "react";

export const ChatHeader = ({
  onMouseDown,
}: {
  onMouseDown: React.MouseEventHandler<HTMLDivElement>;
}) => {
  return (
    <div
      className="w-full flex justify-between px-2 items-center cursor-grab active:cursor-grabbing"
      onMouseDown={onMouseDown}
    >
      <Label className="font-bold select-none">AI Assistant</Label>
      <Button variant={"ghost"}>
        <HugeiconsIcon icon={Cancel01FreeIcons} strokeWidth={3} />
      </Button>
    </div>
  );
};
