"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import React from "react";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

export const FilesView = () => {
  const files = useQuery(api.design.files.getDesignFilesByOrgId, {
    organizationId: "123",
  });
  const create = useMutation(api.design.files.createDesignFile);
  return (
    <div>
      FilesView
      <Button
        onClick={() => {
          create({
            name: "demo",
            description: "test",
            organizationId: "123",
          });
        }}
      >
        Create
      </Button>
      <div className="flex flex-col gap-2 p-4">
        {files?.map((file) => {
          return (
            <Link href={`/design/${file._id}`} key={file._id}>
              {file.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
