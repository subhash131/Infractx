import { Doc, Id } from "@workspace/backend/_generated/dataModel";

export interface Guide {
  lineGuide: number;
  offset: number;
  orientation: "V" | "H";
  snap: string;
}
export interface FrameData {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  type: Doc<"shapes">["type"];
}
export interface SectionData {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  type: Doc<"shapes">["type"];
  parentShapeId?: Id<"shapes"> | null;
}

export interface FrameProps extends FrameData {
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: Partial<FrameData>) => void;
  frames: FrameData[];
  children?: React.ReactNode;
}

export interface ShapeData {
  id: string;
  type: Doc<"shapes">["type"];
  x: number;
  y: number;
  frameId: string;
  text?: string;
  fontSize?: number;
  radius?: number;
  width?: number;
  height?: number;
  fill?: string;
  opacity?: number;
  parentShapeId?: string;
}

export type ShapeNode = Doc<"shapes"> & {
  children: ShapeNode[];
};
