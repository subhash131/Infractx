import React from "react";
import { Arrow } from "./arrow";
import { Label } from "@workspace/ui/components/label";
import { BBH_Sans_Hegarty } from "next/font/google";
import { cn } from "@workspace/ui/lib/utils";

const bbh = BBH_Sans_Hegarty({ variable: "--font-sans", weight: ["400"] });

export const ProjectTooltip = ({
  className,
  color,
  content,
  direction = "right",
  labelContainerClassName,
}: {
  color: string;
  className?: string;
  labelContainerClassName?: string;
  content: string;
  direction?: "right" | "left";
}) => {
  return (
    <div
      className={cn(
        "absolute top-60 rotate-6 flex items-center",
        direction === "right" && "right-40 flex-row-reverse",
        direction === "left" && "left-40",
        className
      )}
    >
      <div
        className={cn("py-3 px-4 rounded-full", labelContainerClassName)}
        style={{ backgroundColor: color }}
      >
        <Label
          className={cn(
            "font-semibold text-white tracking-widest select-text cursor-text",
            bbh.className
          )}
        >
          {content}
        </Label>
      </div>
      <Arrow
        color={color}
        className={cn("size-6", direction === "right" && "rotate-180")}
      />
    </div>
  );
};
