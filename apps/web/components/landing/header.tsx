import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MagicWand01Icon } from "@hugeicons/core-free-icons";
import { Label } from "@workspace/ui/components/label";
import { Button } from "@workspace/ui/components/button";

export const Header = () => {
  return (
    <div className="h-16 fixed top-0 w-full flex justify-between px-20 items-center backdrop-blur-2xl">
      <div className="flex gap-4">
        <HugeiconsIcon icon={MagicWand01Icon} size={30} className="rotate-90" />
        <Label className="text-xl font-semibold">AI Store</Label>
      </div>
      <div className="flex gap-4">
        <Button variant={"link"}>Docs</Button>
        <Button variant={"link"}>GitHub</Button>
      </div>
    </div>
  );
};
