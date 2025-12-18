import React from "react";

export const Arrow = ({
  className,
  color = "#D9D9D9",
}: {
  className?: string;
  color?: string;
}) => {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 96 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M0 0L96 49.5L0 100L18.083 62.7268C22.1311 54.3829 22.0925 44.636 17.9787 36.3243L0 0Z"
        fill={color}
      />
    </svg>
  );
};
