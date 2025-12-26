import React from "react";
import useCanvas from "../../store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";

export const CanvasLayersList = () => {
  const { activeFileId } = useCanvas();
  const pages = useQuery(
    api.design.pages.getFilePages,
    activeFileId ? { fileId: activeFileId as Id<"files"> } : "skip"
  );

  const addPage = useMutation(api.design.pages.createPage);
  const file = useQuery(
    api.design.files.getFile,
    activeFileId
      ? {
          fileId: activeFileId as Id<"files">,
        }
      : "skip"
  );
  const layers = useQuery(
    api.design.layers.getLayersByPage,
    file?.activePage ? { pageId: file?.activePage as Id<"pages"> } : "skip"
  );

  const setActiveLayer = useMutation(api.design.files.setActivePage);

  return (
    <div className="w-44 h-full border-r bg-sidebar absolute left-0 z-99 overflow-y-auto p-4 flex flex-col gap-2">
      {pages?.map((page) => {
        return (
          <Button
            variant={file?.activePage === page._id ? "outline" : "ghost"}
            key={page._id}
            onClick={() => {
              setActiveLayer({
                fileId: activeFileId as Id<"files">,
                pageId: page._id,
              });
            }}
          >
            {page.name}
          </Button>
        );
      })}
      {pages && (
        <Button
          onClick={() => {
            addPage({
              fileId: activeFileId as Id<"files">,
              name: `Page ${pages?.length + 1}`,
            });
          }}
        >
          Add Page
        </Button>
      )}
      {layers?.map((layer) => {
        return <Button key={layer._id}>{layer.name}</Button>;
      })}
    </div>
  );
};
