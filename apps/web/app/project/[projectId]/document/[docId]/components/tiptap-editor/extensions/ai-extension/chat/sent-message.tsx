import React from "react";

export const SentMessage = ({ message }: { message: string }) => {
  return (
    <div className="flex justify-end px-2 p-1 w-full">
      <div className="max-w-[90%] border w-fit rounded-md py-1 px-2">
        <p>{message}</p>
      </div>
    </div>
  );
};
