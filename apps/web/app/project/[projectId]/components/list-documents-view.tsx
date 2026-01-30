import React from "react";
import { DocumentDisplayCard } from "./document-display-card";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export const ListDocumentsView = () => {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,260px))] gap-4 p-4">
      <DocumentDisplayCard
        name="subhash"
        updatedAt={
          dayjs(Date.now()).fromNow() === "a few seconds ago"
            ? "Just now"
            : dayjs(Date.now()).fromNow()
        }
      />
    </div>
  );
};
