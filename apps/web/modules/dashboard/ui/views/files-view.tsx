"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import React from "react";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

export const FilesView = () => {
  const canvases = useQuery(api.canvases.getUserCanvases);
  const create = useMutation(api.canvases.createCanvas);
  return (
    <div>
      FilesView
      <Button
        onClick={() => {
          create({
            height: 100,
            width: 100,
            name: "subhash",
          });
        }}
      >
        Create
      </Button>
      <div className="flex flex-col gap-2 p-4">
        {canvases?.map((canvas) => {
          return (
            <Link href={`/design/${canvas._id}`} key={canvas._id}>
              {canvas.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
