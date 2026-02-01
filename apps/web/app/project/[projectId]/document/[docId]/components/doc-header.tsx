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

  // Local state for immediate UI updates
  const [title, setTitle] = useState(file?.title || "");
  const [description, setDescription] = useState(file?.description || "");

  // Sync local state with fetched file data ONLY when file ID changes
  useEffect(() => {
    if (file) {
      setTitle(file.title || "");
      setDescription(file.description || "");
    }
  }, [file]);

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
        className="text-4xl font-semibold pl-16 w-full pt-4 border-0 focus:ring-0 outline-none"
        placeholder="Untitled"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            textareaRef.current?.focus();
          }
        }}
        value={title}
        onChange={handleTitleChange}
      />
      <Textarea
        className="focus-visible:ring-0 border-0 outline-none ring-0 pl-16 bg-transparent max-h-20 h-fit hide-scrollbar dark:bg-transparent"
        placeholder="Description (Eg: This doc describes the technical design of the postgres backend)"
        ref={textareaRef}
        value={description}
        onChange={handleDescriptionChange}
        />
    </div>
  );
};
