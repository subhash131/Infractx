import React, { useState } from "react";
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
import { useParams } from "next/navigation";
import { RESET_STREAMING_TEXT, useChatStore } from "../../../store/chat-store";
import { useAuth } from "@clerk/nextjs";
import { handleAIStream } from "./ai-response-handlers/handle-ai-response";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { toast } from "sonner";
import { useQueryState } from "nuqs";

interface ChatFooterProps {
  conversationId: string;
  editor?: Editor | null;
}

export const ChatFooter = ({ conversationId, editor }: ChatFooterProps) => {
  const {selectedContext, setSelectedContext, removeContext, setStreamingText, setConversationId, sendingMessage, setSendingMessage} = useChatStore()
  const params = useParams();
  const projectId = params?.projectId as string;
  const { getToken } = useAuth();
  const [fileId] = useQueryState("fileId")
    
  const createConversation = useMutation(api.ai.conversations.startConversation);

  const insertMessage = useMutation(api.ai.messages.insertMessage);

  const [prompt, setPrompt] = useState("");
  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if(sendingMessage) return;

    let selectedText = selectedContext.map((context) => context.text).join("\n");
    let cursorPosition = editor?.state.selection.from ?? 0;
    
    // Selection coordinates to pass to handler (for UI update)
    let handlerSelection = { from: 0, to: 0 };

    if (selectedContext.length > 0) {
        handlerSelection = { 
            from: selectedContext[0]?.from || 0,
            to: selectedContext[0]?.to || 0 
        };
    } else if (editor) {
        // Use current editor selection if context is empty
        const { from, to, empty } = editor.state.selection;
        if (!empty) {
             selectedText = editor.state.doc.textBetween(from, to, "\n");
             handlerSelection = { from, to };
             cursorPosition = from;
        }
    }

    if(!prompt.trim() && !selectedText) return

    setPrompt("");
    setSelectedContext("reset");
    
    try {
        let currentConversationId = conversationId;
        
        // 1. Create conversation if valid ID not present
        if (!currentConversationId) {
            // Generate title from first message
            const title = prompt.slice(0, 30) + (prompt.length > 30 ? "..." : "");
            currentConversationId = await createConversation({ organizationId: "personal", title }) as Id<"conversations">;
            setConversationId(currentConversationId);
        }


        setSendingMessage(true)
        // 2. Save User Message
        await insertMessage({
            conversationId: currentConversationId as Id<"conversations">,
            content: prompt,
            role: "USER",
            context: selectedContext
        });

        const token = await getToken({ template: "convex" }) ?? undefined;

        // 3. Handle Streaming
        const response = await fetch("http://localhost:3001/ai/doc-agent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userMessage: prompt,
            selectedText,
            cursorPosition,
            projectId,
            conversationId: currentConversationId,
            source: 'ui',
            docId: params?.docId as string,
            sessionToken: token,
            fileId,
          }),
        });
        
        if (!response.ok) {
            throw new Error(`Agent request failed: ${response.statusText}`);
        }

        if (response.body) {
            let aiResponseText = "";
            
            if (editor) {
                aiResponseText = await handleAIStream(
                    response.body,
                    currentConversationId,
                    editor, 
                    handlerSelection, 
                    (token) => setStreamingText(token)
                );
            } else {
                // Fallback if no editor is focused: still process stream but just accumulate text
                aiResponseText = await handleAIStream(
                    response.body,
                    currentConversationId,
                    null as any,
                    handlerSelection,
                    (token) => setStreamingText(token)
                );
            }

            if (aiResponseText.trim()) {
                await insertMessage({
                    conversationId: currentConversationId as Id<"conversations">,
                    content: aiResponseText,
                    role: "AI"
                });
                setStreamingText(RESET_STREAMING_TEXT);
            }
        }


    } catch (error) {
        console.error("Error in chat flow:", error);
        toast.error("Failed to send message");
    }finally{
        setSendingMessage(false)
    }
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
      className="w-full shrink-0 bg-[#1f1f1f] border-t p-1 rounded-b-2xl" 
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
              <Button variant={"ghost"} type="submit" disabled={sendingMessage}>
                <HugeiconsIcon icon={SentIcon} strokeWidth={2} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="z-100">Send</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <Textarea
        id="ai-chat-textarea"
        className="p-1 h-10 max-h-10"
        placeholder="Describe your thoughts..."
        rows={2}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
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
