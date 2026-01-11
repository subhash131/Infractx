export interface SnapGuide {
  type: "vertical" | "horizontal";
  position: number;
  matchType: "edge" | "center";
  color: string;
  bounds: {
    start: number;
    end: number;
  };
}

export interface ObjectBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface SnapConfig {
  enabled: boolean;
  threshold: number;
  showGuides: boolean;
  snapToCenter: boolean;
  snapToEdges: boolean;
}
