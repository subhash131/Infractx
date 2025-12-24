import { Id } from "@workspace/backend/_generated/dataModel";
import { FabricObject, SerializedObjectProps } from "fabric";
import { CanvasTool } from "./modules/design/ui/constants";

declare module "fabric" {
  interface FabricObject {
    id?: Id<"canvasObjects">;
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
    obj_type?: CanvasTool;
    points?: { x: number; y: number }[];
  }
  interface SerializedObjectProps {
    id?: Id<"canvasObjects">;
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
    obj_type?: CanvasTool;
    points?: { x: number; y: number }[];
  }
}
