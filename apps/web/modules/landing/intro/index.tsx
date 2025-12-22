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
import { ProjectTooltip } from "./project-tooltip";

const rightIcons = [
  { name: "Openai", icon: "/tech/openai.svg" },
  { name: "Langgraph", icon: "/tech/langgraph.svg" },
  { name: "Next.js", icon: "/tech/nextjs.svg" },
];
const leftIcons = [
  { name: "Clerk", icon: "/tech/clerk.svg" },
  { name: "Gemini", icon: "/tech/gemini.svg" },
  { name: "Convex", icon: "/tech/convex.svg" },
];

export const Intro = () => {
  return (
    <div className="pt-16 px-20 h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4">
      <div className="size-full flex items-center justify-end flex-col relative">
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
        <ProjectTooltip
          color="oklch(60% 0.118 184.704)"
          content="AI Sales Agent"
          className="rotate-6"
          direction="right"
        />
        <ProjectTooltip
          color="oklch(76.9% 0.188 70.08)"
          content="AI Web Design Assistant"
          className="-rotate-6 bottom-0 left-30"
          direction="left"
          labelContainerClassName="py-3"
        />
        <ProjectTooltip
          color="oklch(62.3% 0.214 259.815)"
          content="AI Automation"
          className="rotate-10 top-16 left-50"
          direction="left"
          labelContainerClassName="py-3"
        />
        <ProjectTooltip
          color="oklch(76.8% 0.233 130.85)"
          content="AI Business Analyst"
          className="-rotate-10 top-20 left-50"
          direction="right"
          labelContainerClassName="py-3"
        />
      </div>
      <div className="h-[70%] w-full flex flex-col items-center justify-start gap-10">
        <div className="flex items-center justify-start flex-col gap-4">
          <Label className="text-5xl font-semibold text-center">
            From a concept to working product in days
          </Label>
          <Label className="text-lg text-center">
            The possibilities are endless with AI-powered applications. Build
            yours today.
          </Label>
        </div>
        <div className="w-full flex items-center justify-center flex-col">
          <Button className="px-10 py-6 rounded-full shadow-2xl text-xl gap-3">
            Schedule a Call
            <div className="relative size-4 rounded-full flex items-center justify-center">
              <div className="absolute rounded-full bg-green-500 size-4 animate-ping opacity-75"></div>
              <div className="absolute size-2 rounded-full bg-green-500"></div>
            </div>
          </Button>
          <div className="flex items-center justify-center gap-2">
            <Label className="py-3">
              We build with experience, not with vibes.
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
};

type Message = {
  content: string;
  sender?: "user" | "ai";
  showChart?: boolean;
  showScheduleNowButton?: boolean;
};

const AIChatWindow = () => {
  const [messages, setMessages] = React.useState<Message[]>([
    { content: "Hey Analyze the sales of this year", sender: "user" },
    {
      content: "Sure, Real-time charts coming up",
      sender: "ai",
      showChart: true,
      showScheduleNowButton: false,
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
    <div className="w-[80%] h-full bg- rounded-xl shadow-lg p-2 bg-accent">
      <div className="size-full bg-background rounded-lg flex flex-col items-center justify-end p-2">
        <div className="w-[80%] h-10 bg--50">
          <Label className="text-lg font-semibold">AI SaaS</Label>
        </div>
        <div
          className="h-52 max-h-52 w-full flex flex-col items-center px-14 overflow-y-scroll hide-scrollbar p-2 gap-1"
          ref={ref}
        >
          {messages.map((msg, index) => {
            if (msg.sender === "user") {
              return (
                <UserMessage
                  key={index}
                  showChart={msg.showChart}
                  content={msg.content}
                  showScheduleNowButton={msg.showScheduleNowButton}
                  sender={msg.sender}
                />
              );
            }
            return (
              <AiMessage
                key={index}
                showChart={msg.showChart}
                content={msg.content}
                showScheduleNowButton={msg.showScheduleNowButton}
                sender={msg.sender}
              />
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
                {
                  content: "Talk with us",
                  sender: "ai",
                  showScheduleNowButton: true,
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

const UserMessage = ({ content }: Message) => {
  return (
    <div className="w-full h-fit flex justify-end gap-1 items-center -rotate-1">
      <Badge variant={"secondary"} className="h-6 text-wrap max-w-60">
        {content}
      </Badge>
      <div className="border p-0.5 size-fit rounded-full">
        <HugeiconsIcon icon={UserIcon} size={16} />
      </div>
    </div>
  );
};
const AiMessage = ({
  content,
  showChart = false,
  showScheduleNowButton,
}: Message) => {
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
          {content}
        </Badge>
      </div>
      {showChart && <AIChart />}
      {showScheduleNowButton && (
        <Button variant={"link"} className="ml-6">
          Schedule a call
        </Button>
      )}
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
