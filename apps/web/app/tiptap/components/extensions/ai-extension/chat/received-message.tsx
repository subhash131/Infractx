import React, { Fragment } from "react";

export const ReceivedMessage = ({ message }: { message: string }) => {
  const parseMsg = (msg: string) => {
    try {
      return JSON.parse(msg.trim()) as { stage: string; message: string };
    } catch {
      return msg as string;
    }
  };

  const messages = message.split("|");

  return (
    <div className="max-w-[90%] w-fit bg-accent px-2 py-1 rounded-md flex overflow-x-clip flex-col gap-1">
      {messages.map((msg, i) => {
        const parsedMsg = parseMsg(msg);
        return (
          <Fragment key={i}>
            {typeof parsedMsg === "string" ? (
              <p>{parsedMsg}</p>
            ) : (
              <>
                {parsedMsg.message !== "Analyzed user intent generic" && (
                  <label>{parsedMsg.message}</label>
                )}
              </>
            )}
          </Fragment>
        );
      })}
    </div>
  );
};
