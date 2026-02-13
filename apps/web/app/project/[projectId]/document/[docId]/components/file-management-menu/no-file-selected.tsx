import React from 'react'
import { Button } from "@workspace/ui/components/button";
import { FolderOpen, MessageCircle, PlusIcon } from "lucide-react";

export const NoFileSelected = () => {
  return (
    <div className="w-full h-screen overflow-hidden hide-scrollbar p-4 min-h-screen max-h-screen">
        <div>
          <h1 className="text-2xl font-bold">InfraBro</h1>
          <p className="text-gray-400">Draft your technical design</p>
        </div>
        <div className="size-full flex pt-40 justify-center gap-4">
          <Button className="p-2" variant={"outline"}>
            <PlusIcon />
            New File
          </Button>
          <Button className="p-2" variant={"outline"}>
            <MessageCircle />
            Chat with AI
          </Button>
          <Button className="p-2" variant={"outline"}>
            <FolderOpen />
            Open File
          </Button>
        </div>
      </div>
  )
}
