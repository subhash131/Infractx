"use client";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useState } from "react";
import "./styles.css";

export default function Editor() {
  const editor = useCreateBlockNote();
  const [windowLoaded, setWindowLoaded] = useState(false);
  useEffect(() => {
    setWindowLoaded(true);
  }, []);

  if (!windowLoaded) return;

  return (
    <BlockNoteView
      editor={editor}
      className="h-screen w-full rounded-none"
      style={{
        height: "100vh",
      }}
    />
  );
}
