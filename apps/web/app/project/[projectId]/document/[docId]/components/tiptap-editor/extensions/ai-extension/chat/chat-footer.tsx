import React, { useEffect, useState } from "react";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import {
  Cancel01Icon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Editor } from "@tiptap/core";
import { RESET_STREAMING_TEXT, useChatStore } from "../../../store/chat-store";
import { v4 as uuid } from "uuid";
import { handleAIResponse } from "./ai-response-handlers/handle-ai-response";

interface ChatFooterProps {
  conversationId: string;
  editor: Editor;
}

export const ChatFooter = ({ conversationId, editor }: ChatFooterProps) => {
  const {selectedContext, setSelectedContext, removeContext, setStreamingText} = useChatStore()

  const [prompt, setPrompt] = useState("");
  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    let selectedText = selectedContext.map((context) => context.text).join("\n");
    let cursorPosition = editor.state.selection.from;
    
    // Selection coordinates to pass to handler (for UI update)
    let handlerSelection = { from: 0, to: 0 };

    if (selectedContext.length > 0) {
        handlerSelection = { 
            from: selectedContext[0]?.from || 0,
            to: selectedContext[0]?.to || 0 
        };
    } else {
        // Use current editor selection if context is empty
        const { from, to, empty } = editor.state.selection;
        if (!empty) {
             selectedText = editor.state.doc.textBetween(from, to, "\n");
             handlerSelection = { from, to };
             cursorPosition = from;
        }
    }

    const docContext = editor.getText(); // Sending full text for context

    if(!prompt.trim() && !selectedText) return

    const response = await fetch("http://localhost:3000/api/ai/doc/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userMessage: prompt,
        selectedText,
        docContext,
        cursorPosition
      }),
    });

    if (!response.ok) {
        console.error("Failed to fetch AI response");
        return;
    }

    handleAIResponse(response, editor, handlerSelection);

    setPrompt("");
    setSelectedContext("reset");
    
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === " " || e.code === "Space") {
      e.stopPropagation();
    }
  };
  const removeSelectedContext = (id: string) => {
    removeContext(id)
  }

  return (
    <form
      className="w-full shrink-0 bg-[#1f1f1f] border-t p-1"
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
        // value={JSON.stringify(editor.getJSON())}
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
