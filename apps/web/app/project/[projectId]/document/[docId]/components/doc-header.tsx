import { Textarea } from "@workspace/ui/components/textarea";
import React, { useRef, useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useQueryState } from "nuqs";
import { Id } from "@workspace/backend/_generated/dataModel";
import { debounce } from "lodash";

export const DocHeader = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fileId] = useQueryState("fileId");

  const file = useQuery(api.requirements.textFiles.getTextFileById, fileId ? { fileId: fileId as Id<"text_files"> } : "skip");
  const updateFile = useMutation(api.requirements.textFiles.updateFile);

  const [title, setTitle] = useState(file?.title || "");
  const [description, setDescription] = useState(file?.description || "");
  
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
  
  const prevFileIdRef = useRef<string | null>(null);

  // Sync local state with fetched file data ONLY when file ID changes or when inputs are not focused
  useEffect(() => {
    if (file) {
      if (file._id !== prevFileIdRef.current) {
        setTitle(file.title);
        setDescription(file.description || "");
        prevFileIdRef.current = file._id;
      } else {
        if (!isTitleFocused) setTitle(file.title);
        if (!isDescFocused) setDescription(file.description || "");
      }
    }
  }, [file, isTitleFocused, isDescFocused]);

  // Debounced update functions
  const debouncedUpdateTitle = useMemo(
    () =>
      debounce((id: Id<"text_files">, title: string) => {
        updateFile({ fileId: id, title });
      }, 500),
    [updateFile]
  );

  const debouncedUpdateDescription = useMemo(
    () =>
      debounce((id: Id<"text_files">, description: string) => {
        updateFile({ fileId: id, description });
      }, 500),
    [updateFile]
  );
  
  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      debouncedUpdateTitle.cancel();
      debouncedUpdateDescription.cancel();
    };
  }, [debouncedUpdateTitle, debouncedUpdateDescription]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawTitle = e.target.value;
    // Replace spaces with underscores for both local state and DB
    const newTitle = rawTitle.replace(/\s+/g, '_');
    setTitle(newTitle); // Update local state with underscores
    if (fileId) {
      // Trim and use "Untitled" if empty
      const titleToSave = newTitle.trim() || "Untitled";
      debouncedUpdateTitle(fileId as Id<"text_files">, titleToSave);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setDescription(newDescription); // Update local state immediately
    if (fileId) {
      debouncedUpdateDescription(fileId as Id<"text_files">, newDescription);
    }
  };

  return (
    <div className="w-full h-fit bg-[#1F1F1F] text-white">
      <input
        className="text-4xl font-semibold pl-12 w-full pt-6 pb-2 border-0 focus:ring-0 outline-none"
        placeholder="Untitled"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            textareaRef.current?.focus();
          }
        }}
        value={title}
        onChange={handleTitleChange}
        onFocus={() => setIsTitleFocused(true)}
        onBlur={() => setIsTitleFocused(false)}
      />
      <Textarea
        className="focus-visible:ring-0 border-0 outline-none ring-0 pl-12 bg-transparent max-h-10 text-sm h-fit hide-scrollbar dark:bg-transparent"
        placeholder="(optional) Add brief context, tech stack, or goals to help the AI provide more accurate results."
        ref={textareaRef}
        value={description}
        onChange={handleDescriptionChange}
        onFocus={() => setIsDescFocused(true)}
        onBlur={() => setIsDescFocused(false)}
        />
    </div>
  );
};
