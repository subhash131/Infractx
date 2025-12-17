"use client";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import React, { useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MagicWand01Icon,
  Sent02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { AIChart } from "./ai-chart";
import { cn } from "@workspace/ui/lib/utils";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

const rightIcons = [
  { name: "openai", icon: "/tech/openai.svg" },
  { name: "langgraph", icon: "/tech/langgraph.svg" },
  { name: "Next.js", icon: "/tech/nextjs.svg" },
];
const leftIcons = [
  { name: "clerk", icon: "/tech/clerk.svg" },
  { name: "gemini", icon: "/tech/gemini.svg" },
  { name: "convex", icon: "/tech/convex.svg" },
];

export const Intro = () => {
  return (
    <div className="pt-16 px-20 h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4">
      <div className="size-full flex items-center justify-end flex-col">
        <div className="flex items-center justify-center gap-2">
          <div className="relative size-4 rounded-full flex items-center justify-center">
            <div className="absolute rounded-full bg-green-500 size-4 animate-ping opacity-75"></div>
            <div className="absolute size-2 rounded-full bg-green-500"></div>
          </div>
          <Label className="py-3">We Build With Experience</Label>
        </div>
        <div className="shrink-0 w-[50%] h-[90%] flex items-center justify-center relative">
          <TechIconsStack
            items={rightIcons}
            className="left-10 flex-col-reverse h-fit"
            tooltipSide="left"
          />
          <TechIconsStack
            items={leftIcons}
            className="right-10 flex-col-reverse"
            tooltipSide="right"
          />
          <AIChatWindow />
        </div>
      </div>
      <div className="h-[70%] w-full flex items-center justify-start flex-col gap-4">
        <Label className="text-5xl font-semibold text-center">
          From a concept to working product in days
        </Label>
        <Label className="text-lg text-center">
          The possibilities are endless with AI-powered applications. Build
          yours today.
        </Label>
      </div>
    </div>
  );
};

type Message = {
  content: string;
  sender: "user" | "ai";
  showChart?: boolean;
};

const AIChatWindow = () => {
  const [messages, setMessages] = React.useState<Message[]>([
    { content: "Hey Analyze the sales of this year", sender: "user" },
    {
      content: "Sure, Real-time charts coming up",
      sender: "ai",
      showChart: true,
    },
  ]);
  const [inputValue, setInputValue] = React.useState<string>("");
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messages]);
  return (
    <div className="w-[80%] h-full bg- rounded-xl shadow-lg p-1 bg-accent">
      <div className="size-full bg-background rounded-lg flex flex-col items-center justify-end p-2">
        <div
          className="h-fit max-h-52 w-full flex flex-col items-center px-14 overflow-y-scroll hide-scrollbar p-2 gap-1"
          ref={ref}
        >
          {messages.map((msg, index) => {
            if (msg.sender === "user") {
              return <UserMessage key={index}>{msg.content}</UserMessage>;
            }
            return (
              <AiMessage key={index} showChart={msg.showChart}>
                {msg.content}
              </AiMessage>
            );
          })}
        </div>
        <form className="shrink-0 w-[60%] mx-auto h-10 rounded-lg border flex overflow-hidden gap-1 p-1">
          <Input
            className="size-full border-transparent focus-visible:ring-0 transition-colors"
            placeholder="Ask AI"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              if (!inputValue.trim()) return;
              setMessages((prev) => [
                ...prev,
                {
                  content: inputValue,
                  sender: "user",
                },
              ]);
              setInputValue("");
            }}
          >
            <HugeiconsIcon icon={Sent02Icon} />
          </Button>
        </form>
      </div>
    </div>
  );
};

const UserMessage = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full h-fit flex justify-end gap-1 items-center -rotate-1">
      <Badge variant={"secondary"} className="h-6">
        {children}
      </Badge>
      <div className="border p-0.5 size-fit rounded-full">
        <HugeiconsIcon icon={UserIcon} size={16} />
      </div>
    </div>
  );
};
const AiMessage = ({
  children,
  showChart = false,
}: {
  children: React.ReactNode;
  showChart?: boolean;
}) => {
  return (
    <div className="w-full h-fit flex flex-col items-start gap-1">
      <div className="flex gap-1 rotate-1">
        <div className="border bg-[#] p-0.5 size-fit rounded-full">
          <HugeiconsIcon
            icon={MagicWand01Icon}
            size={16}
            className="rotate-90"
          />
        </div>
        <Badge variant={"secondary"} className="h-6">
          {children}
        </Badge>
      </div>
      {showChart && <AIChart />}
    </div>
  );
};

const TechIconsStack = ({
  className,
  items,
  tooltipSide = "right",
}: {
  items: { name: string; icon: string }[];
  className?: string;
  tooltipSide?: "left" | "right";
}) => {
  return (
    <div
      className={cn(
        "absolute flex flex-col h-full items-center top-2",
        className
      )}
    >
      {items.map(({ icon, name }, index) => {
        return (
          <div
            className={`size-12 p-1 ${index % 2 === 1 ? "rotate-6" : "-rotate-6"} rounded-xl bg-accent shadow-xl`}
            key={index}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="size-full bg-background rounded-lg flex items-center justify-center p-1">
                  <img
                    src={icon}
                    alt={name}
                    className="size-full"
                    draggable={false}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide}>{name}</TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
};
