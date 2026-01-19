import React from "react";
import { Group, Line } from "react-konva";

export const GridPattern: React.FC = () => (
  <Group>
    {Array.from({ length: 50 }).map((_, i) => (
      <Group key={`grid-${i}`}>
        <Line
          points={[i * 100, -5000, i * 100, 5000]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
        <Line
          points={[-5000, i * 100, 5000, i * 100]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
      </Group>
    ))}
  </Group>
);
