import React from "react";
import { Header } from "./header";
import { Intro } from "./intro";

export const Landing = () => {
  return (
    <div className="max-w-screen overflow-x-hidden min-h-screen size-full">
      <Header />
      <Intro />
    </div>
  );
};
