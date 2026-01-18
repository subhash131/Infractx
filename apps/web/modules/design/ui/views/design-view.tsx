"use client";

import React, { useEffect } from "react";
import { DesignCanvas } from "../components/design-canvas";
import { DesignToolsBar } from "../components/design-tools-bar";
import { EditSelectedItemBar } from "../components/edit-selected-item-bar";
import useCanvas from "../../store";
import { CanvasLayersList } from "../components/canvas-layers-list";
import { ChatWindow } from "../components/chat-window";

export const DesignView = ({ designId }: { designId: string }) => {
  const { setActiveDesignId } = useCanvas();
  useEffect(() => {
    if (!designId) return;
    setActiveDesignId(designId);
    return () => {
      setActiveDesignId(null);
    };
  }, [designId]);
  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center relative">
      <DesignCanvas />
      <DesignToolsBar />
      <EditSelectedItemBar />
      <CanvasLayersList />
      <ChatWindow />
    </div>
  );
};
