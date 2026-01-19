export interface Guide {
  lineGuide: number;
  offset: number;
  orientation: "V" | "H";
  snap: string;
}
export interface FrameData {
  id: string;
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
  type: "text" | "circle" | "rect";
  x: number;
  y: number;
  frameId: string;
  // Shape-specific properties
  text?: string;
  fontSize?: number;
  radius?: number;
  width?: number;
  height?: number;
  fill?: string;
  opacity?: number;
  parentId?: string;
}
