"use client";

import React from "react";
import { DesignCanvas } from "./components/design-canvas";
import { DesignElementsBar } from "./components/design-tools-bar";

export const DesignView = () => {
  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center relative">
      <DesignCanvas />
      <DesignElementsBar />
    </div>
  );
};
