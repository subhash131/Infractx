import { useState } from "react";
import { ShapeData } from "../types";

export const useShapes = () => {
  const [shapes, setShapes] = useState<ShapeData[]>([
    {
      id: "s1",
      type: "TEXT",
      x: 10,
      y: 10,
      frameId: "1",
      text: "Frame 1",
      fontSize: 16,
    },
    {
      id: "s2",
      type: "CIRCLE",
      x: 50,
      y: 50,
      frameId: "1",
      radius: 30,
      fill: "#ff9800",
      opacity: 0.7,
    },
    {
      id: "s3",
      type: "RECT",
      x: 0,
      y: 0,
      frameId: "1",
      width: 60,
      height: 60,
      fill: "#ff9800",
      opacity: 0.7,
    },
  ]);

  // Will become: const shapes = useQuery(api.shapes.list);

  const updateShape = (id: string, attrs: Partial<ShapeData>) => {
    setShapes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...attrs } : s)),
    );
    // Will become: updateShapeMutation({ id, ...attrs });
  };

  return { shapes, updateShape };
};
