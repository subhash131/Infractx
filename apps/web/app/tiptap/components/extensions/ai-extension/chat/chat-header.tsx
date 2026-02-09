import {
  AddSquareIcon,
  CancelCircleIcon,
  TransactionHistoryIcon,
} from "@hugeicons/core-free-icons";
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
      className="w-full flex justify-between px-2 items-center cursor-grab active:cursor-grabbing border-b"
      onMouseDown={onMouseDown}
    >
      <Label className="font-bold select-none">AI Assistant</Label>
      <div className="flex items-center">
        <Button variant={"ghost"}>
          <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} />
        </Button>
        <Button variant={"ghost"}>
          <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} />
        </Button>
        <Button variant={"ghost"}>
          <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
};
