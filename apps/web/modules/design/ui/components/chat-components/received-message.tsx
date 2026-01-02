import React from "react";

export const ReceivedMessage = ({ message }: { message: string }) => {
  return (
    <div className="max-w-[90%] w-fit bg-accent px-2 py-1 rounded-md flex">
      <p>{message}</p>
    </div>
  );
};
