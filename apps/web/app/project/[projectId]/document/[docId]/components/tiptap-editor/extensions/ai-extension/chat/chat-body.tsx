import React, { Fragment, useEffect, useRef, useLayoutEffect } from "react";
import { SentMessage } from "./sent-message";
import { ReceivedMessage } from "./received-message";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { useChatStore } from "../../../store/chat-store";
import { Button } from "@workspace/ui/components/button";

export const ChatBody = ({ 
  messages, 
  loadMore, 
  status 
}: { 
  messages: Doc<"messages">[], 
  loadMore: (numItems: number) => void, 
  status: string 
}) => {
  // 1. New Ref for the main scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Refs to preserve scroll position and track scroll direction
  const previousScrollHeight = useRef<number>(0);
  const previousScrollTop = useRef<number>(0);
  const previousMessageCount = useRef<number>(messages.length);

  const { streamingText, sendingMessage } = useChatStore();

  const renderMessageContent = (content: string, isLatest: boolean, role: string, id: string) => {
    let planJson = null;
    let textContent = content;

    if (role === "AI" && content.includes("[ARCHITECTURE_PLAN]")) {
      const match = content.match(/\[ARCHITECTURE_PLAN\](.*)\[\/ARCHITECTURE_PLAN\]/s);
      if (match && match[0] && match[1]) {
        try {
          planJson = JSON.parse(match[1]);
          textContent = content.replace(match[0], "").trim();
        } catch (e) {
          console.error("Failed to parse plan", e);
        }
      }
    }

    return (
      <Fragment key={id}>
        {role === "AI" && textContent && <ReceivedMessage message={textContent} />}
        {role === "USER" && textContent && <SentMessage message={textContent} />}
        
        {planJson && (
          <div className="w-[90%] bg-accent/30 border border-accent rounded-lg p-3 my-2 flex flex-col gap-2 self-start">
            <h3 className="font-semibold text-sm">Proposed Architecture</h3>
            <div className="max-h-48 overflow-y-auto w-full text-xs text-muted-foreground p-2 bg-background rounded border">
              {planJson.plan.map((item: any, idx: number) => (
                <div key={idx} className="mb-1">
                  {item.type === "FOLDER" ? "📁" : "📄"} <strong>{item.title}</strong>
                  {item.description && <span className="block ml-5 opacity-70">{item.description}</span>}
                </div>
              ))}
            </div>
            {isLatest ? (
              <div className="flex w-full gap-2 mt-2">
                <Button 
                  className="flex-1" variant="default" size="sm"
                  onClick={() => {
                    const form = document.querySelector('form');
                    const input = document.getElementById('ai-chat-textarea') as HTMLTextAreaElement;
                    if (form && input) {
                       input.dataset.replyType = "approve";
                       input.value = "Looks good, approve plan!";
                       form.requestSubmit();
                    }
                  }}
                >
                  Approve Plan
                </Button>
                <Button 
                  className="flex-1" variant="outline" size="sm"
                  onClick={() => {
                    const form = document.querySelector('form');
                    const input = document.getElementById('ai-chat-textarea') as HTMLTextAreaElement;
                    if (form && input) {
                       input.dataset.replyType = "reject";
                       input.value = "Regenerate architecture plan"; 
                       form.requestSubmit();
                    }
                  }}
                >
                  Reject Plan
                </Button>
              </div>
            ) : (
                <div className="text-center text-xs text-muted-foreground italic mt-1">Plan finalized</div>
            )}
          </div>
        )}
      </Fragment>
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const lastMessageId = messages.length > 0 ? messages[messages.length - 1]?._id : null;

  // Scroll to bottom ONLY for new incoming messages
  useEffect(() => {
    scrollToBottom();
  }, [lastMessageId, sendingMessage, streamingText]);

  // 2. Preserve scroll position when loading OLD messages
  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // If the message count increased, it means we just loaded history
    if (messages.length > previousMessageCount.current) {
      // Offset the scrollbar by the exact height of the newly inserted messages
      const heightDifference = container.scrollHeight - previousScrollHeight.current;
      container.scrollTop += heightDifference;
    }

    // Update refs for the next render
    previousScrollHeight.current = container.scrollHeight;
    previousMessageCount.current = messages.length;
  }, [messages]);

  // 3. Auto-fetch ONLY when actively scrolling UP to the top
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const currentScrollTop = container.scrollTop;
    const isScrollingUp = currentScrollTop < previousScrollTop.current;

    // If the user scrolls UP and gets within 5px of the top, trigger fetch
    if (isScrollingUp && currentScrollTop <= 5 && status === "CanLoadMore") {
      loadMore(10);
    }

    // Keep track of the last scroll position
    previousScrollTop.current = currentScrollTop;
  };

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="w-full flex-1 flex flex-col gap-1 p-2 overflow-y-scroll hide-scrollbar text-xs"
    >
      {status === "CanLoadMore" && (
        <div className="w-full flex justify-center py-2">
          {/* Acts as a manual fallback if they are resting at the top without scrolling */}
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full text-xs text-muted-foreground" 
            onClick={() => loadMore(10)}
          >
            Load previous messages
          </Button>
        </div>
      )}
      
      {status === "LoadingMore" && (
        <div className="w-full text-center text-xs text-muted-foreground my-2 py-1.5">
          Loading...
        </div>
      )}

      {messages.map(({ message: { content, role }, _id }, index) => {
        const isLatest = index === messages.length - 1 && !streamingText;
        return renderMessageContent(content, isLatest, role, _id);
      })}
      
      {sendingMessage && <ReceivedMessage message={"thinking..."} />}
      {streamingText && renderMessageContent(streamingText, true, "AI", "streaming")}

      <div ref={messagesEndRef} />
    </div>
  );
};