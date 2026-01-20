import { Doc } from "@workspace/backend/_generated/dataModel";

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
  parentId?: string;
}

export type ShapeNode = Doc<"shapes"> & {
  children: ShapeNode[];
};
