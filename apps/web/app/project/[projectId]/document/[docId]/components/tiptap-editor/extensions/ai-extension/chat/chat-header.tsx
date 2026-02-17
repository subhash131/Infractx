import {
  AddSquareIcon,
  ArrowLeft01Icon,
  CancelCircleIcon,
  TransactionHistoryIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useChatStore } from "../../../store/chat-store";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import React from "react";

export const ChatHeader = ({
  onMouseDown,
  onClose,
}: {
  onMouseDown: React.MouseEventHandler<HTMLDivElement>;
  onClose?: () => void;
}) => {
  const { showHistory, setShowHistory, setConversationId } = useChatStore();

  return (
    <div
      className="w-full flex justify-between px-2 items-center cursor-grab active:cursor-grabbing border-b"
      onMouseDown={onMouseDown}
    >
      <div className="flex items-center gap-2">
         {showHistory && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowHistory(false)}>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} size={16}/>
            </Button>
         )}
         <Label className="font-bold select-none">AI Assistant</Label>
      </div>
      
      <div className="flex items-center">
        {!showHistory && (
             <>
                <Button variant={"ghost"} onClick={() => {
                    setConversationId(null);
                    setShowHistory(false);
                }}>
                  <HugeiconsIcon icon={AddSquareIcon} strokeWidth={2} />
                </Button>
                <Button variant={"ghost"} onClick={() => setShowHistory(true)}>
                  <HugeiconsIcon icon={TransactionHistoryIcon} strokeWidth={2} />
                </Button>
             </>
        )}
       
        <Button variant={"ghost"} onClick={onClose}>
          <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
};
