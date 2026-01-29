import { Textarea } from "@workspace/ui/components/textarea";
import React, { useRef } from "react";

export const Header = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="w-full h-fit bg-[#1F1F1F] text-white">
      <input
        className="text-4xl font-semibold pl-16 w-full pt-4 border-0 focus:ring-0 outline-none"
        placeholder="Eg: Backend:convex"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            textareaRef.current?.focus();
          }
        }}
      />
      <Textarea
        className="focus-visible:ring-0 border-0 outline-none ring-0 pl-16 bg-transparent max-h-20 h-fit hide-scrollbar"
        placeholder="Description (Eg: This doc describes the technical design of the convex backend)"
        ref={textareaRef}
      />
    </div>
  );
};
