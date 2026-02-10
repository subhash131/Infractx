import React, { useEffect, useState } from "react";
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
import { Editor } from "@tiptap/core";
import { useChatStore } from "../../../store/chat-store";
import { v4 as uuid } from "uuid";

interface ChatFooterProps {
  conversationId: string;
  editor: Editor;
  selection: { from: number; to: number };
}

export const ChatFooter = ({ conversationId, editor, selection }: ChatFooterProps) => {
  const sendMessage = useAction(api.ai.workflowAction.create);
  const {selectedContext, setSelectedContext, removeContext} = useChatStore()

  const [prompt, setPrompt] = useState("");
  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // sendMessage({    });
    setPrompt("");
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === " " || e.code === "Space") {
      e.stopPropagation();
    }
  };
  useEffect(()=>{
    if (!editor) return

    const { state } = editor
    if (!state) return

    const { selection, doc } = state
    if (!selection || !doc) return

    if (selection.empty) return

    const selectedText = doc.textBetween(
      selection.from,
      selection.to,
      " "
    )
    if(selectedText){
      console.log(selectedText)

      setSelectedContext({
        text: selectedText,
        from: selection.from,
        to: selection.to,
        id: uuid()
      });
    }
  },[selection])

  const removeSelectedContext = (id: string) => {
    removeContext(id)
  }
  return (
    <form
      className="w-full shrink-0 bg-background border-t p-1"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full flex justify-between">
        <div className="flex items-center gap-1 overflow-auto hide-scrollbar" style={{paddingBottom:4}}>
          {selectedContext.map((context, index) => (
           <div 
              key={index} 
              className="flex-none bg-accent rounded-lg h-20 relative overflow-hidden p-1"
              style={{
                maxWidth:"5rem"
              }}
            >
              <p className="text-[10px] break-words overflow-hidden pr-3 text-gray-400"
              style={{
                color:"#99a1af"
              }}
              >
                {context.text.length > 50 ? context.text.slice(0, 50) + "..." : context.text}
              </p> 
              
              <Button 
                variant="ghost" 
                className="p-0 h-fit absolute top-0 right-0 hover:bg-background bg-background/80" 
                type="button" 
                onClick={() => removeSelectedContext(context.id)}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={12} />
              </Button>
            </div>
          ))}
        </div>
        <div className="h-full w-fit flex items-end justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={"ghost"} type="submit">
                <HugeiconsIcon icon={SentIcon} strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="z-100">Send</TooltipContent>
          </Tooltip>
        </div>
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
