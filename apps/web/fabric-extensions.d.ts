import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { FabricObject, SerializedObjectProps } from "fabric";

declare module "fabric" {
  interface FabricObject {
    _id?: Id<"layers">;
    parentLayerId?: Id<"layers">;
    rx?: number;
    ry?: number;
    data?: any;
    fontFamily?: string;
    text?: string;
    textAlign?: string;
    imageUrl?: string;
    visible?: boolean;
    locked?: boolean;
    zIndex?: number;
    fontSize?: number;
    fontWeight?: string;
    radius?: number;
    obj_type?: Doc<"layers">["type"];
    points?: { x: number; y: number }[];
    fontStyle: string;
    linethrough?: boolean;
    name: string;
    overline: boolean;
    underline: boolean;
    _pendingChildPositions: {
      top: number;
      left: number;
      obj: FabricObject;
    }[];
  }
  interface SerializedObjectProps {
    _id?: Id<"layers">;
    parentLayerId?: Id<"layers">;
    rx?: number;
    ry?: number;
    data?: any;
    fontFamily?: string;
    text?: string;
    textAlign?: string;
    imageUrl?: string;
    visible?: boolean;
    locked?: boolean;
    zIndex?: number;
    fontSize?: number;
    fontWeight?: string;
    radius?: number;
    obj_type?: Doc<"layers">["type"];
    points?: { x: number; y: number }[];
    fontStyle: string;
    linethrough?: boolean;
    name: string;
    overline: boolean;
    underline: boolean;
    _pendingChildPositions: { top: number; left: number; obj: FabricObject }[];
  }
}
