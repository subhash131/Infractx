import * as fabric from "fabric";

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

//object snapping
export interface ObjectSnapGuide {
  type: "vertical" | "horizontal";
  position: number; // Global canvas coordinate
  matchType: "edge-to-edge" | "edge-aligned" | "center" | "edge-to-center";
  priority: number; // Lower = higher priority
  bounds: {
    start: number;
    end: number;
  };
  targetObjectId: string;
  color: string;
}

export interface SnapCandidate {
  axis: "x" | "y";
  delta: number;
  position: number;
  matchType: "edge-to-edge" | "edge-aligned" | "center" | "edge-to-center";
  priority: number;
  targetObject: fabric.FabricObject;
  guideStart: number;
  guideEnd: number;
}

export interface ObjectSnapPriority {
  center: number;
  edgeToEdge: number;
  edgeAligned: number;
  edgeToCenter: number;
}

export interface ObjectSnapConfig {
  enabled: boolean;
  threshold: number;
  maxNearbyObjects: number;
  showGuides: boolean;
  priority: ObjectSnapPriority;
}
