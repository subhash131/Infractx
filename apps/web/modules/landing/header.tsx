import React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MagicWand01Icon } from "@hugeicons/core-free-icons";
import { Label } from "@workspace/ui/components/label";
import Link from "next/link";

export const Header = () => {
  return (
    <div className="h-16 fixed top-0 w-full flex justify-between px-40 items-center backdrop-blur-2xl">
      <div className="flex gap-4">
        <HugeiconsIcon icon={MagicWand01Icon} size={30} className="rotate-90" />
        <Label className="text-xl font-semibold">AI Store</Label>
      </div>
      <div className="flex gap-2 items-center">
        <Link href="/sign-up" className="text-sm px-6 py-2 rounded-full hover:bg-white hover:text-black transition! bg-transparent">
          Register
        </Link>
        <Link href="/sign-in" className="text-sm px-6 py-2 rounded-full bg-white text-black hover:bg-gray-200 transition">
          Login
        </Link>
      </div>
    </div>
  );
};
