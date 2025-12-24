"use client";
import { api } from "@workspace/backend/_generated/api";
import { useMutation } from "convex/react";
import { Id } from "@workspace/backend/_generated/dataModel";
import { CanvasTool, TOOLS } from "../constants";

export type CanvasObjectData = {
  _id?: Id<"canvasObjects">;
  canvasId: Id<"canvases">;
  objectId: string;
  type?: CanvasTool;
  left: number;
  top: number;
  width: number;
  height: number;
  angle?: number;
  scaleX?: number;
  scaleY?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  underline?: boolean;
  linethrough?: boolean;
  overline?: boolean;
  padding?: number;
  fontStyle?: string;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  imageUrl?: string;
  radius?: number;
  rx?: number;
  ry?: number;
  shadow?: string;
  data?: any;
  strokeUniform?: boolean;
  cornerColor?: string;
  cornerSize?: number;
  cornerStrokeColor?: string;
  borderColor?: string;
  borderScaleFactor?: number;
  zIndex?: number;
  locked?: boolean;
  visible?: boolean;
  points?: {
    x: number;
    y: number;
  }[];
};

export const useUpsertCanvasObject = () => {
  const createObject = useMutation(api.canvasObjects.createObject);
  const updateObject = useMutation(api.canvasObjects.updateObject);

  const upsertObject = async (objectData: CanvasObjectData) => {
    const { _id, ...data } = objectData;

    // If _id exists, update the existing object
    if (_id) {
      return await updateObject({
        _id: _id,
        objectId: data.objectId,
        type: data.type ? data.type : TOOLS.RECT,
        left: data.left,
        top: data.top,
        width: data.width,
        height: data.height,
        angle: data.angle ?? 0,
        scaleX: data.scaleX ?? 1,
        scaleY: data.scaleY ?? 1,
        strokeWidth: data.strokeWidth ?? 0,
        opacity: data.opacity ?? 1,
        fill: data.fill,
        stroke: data.stroke,
        text: data.text,
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        fontWeight: data.fontWeight,
        textAlign: data.textAlign,
        imageUrl: data.imageUrl,
        radius: data.radius,
        rx: data.rx,
        ry: data.ry,
        shadow: data.shadow,
        data: data.data,
        strokeUniform: data.strokeUniform,
        cornerColor: data.cornerColor,
        cornerSize: data.cornerSize,
        cornerStrokeColor: data.cornerStrokeColor,
        borderColor: data.borderColor,
        borderScaleFactor: data.borderScaleFactor,
        zIndex: data.zIndex,
        locked: data.locked,
        visible: data.visible,
        points: data.points,
      });
    }

    // Otherwise, create a new object
    return await createObject({
      canvasId: data.canvasId,
      objectId: data.objectId,
      type: data.type ? data.type : TOOLS.RECT,
      left: data.left,
      top: data.top,
      width: data.width,
      height: data.height,
      angle: data.angle ?? 0,
      scaleX: data.scaleX ?? 1,
      scaleY: data.scaleY ?? 1,
      strokeWidth: data.strokeWidth ?? 0,
      opacity: data.opacity ?? 1,
      fill: data.fill,
      stroke: data.stroke,
      text: data.text,
      fontSize: data.fontSize,
      fontFamily: data.fontFamily,
      fontWeight: data.fontWeight,
      textAlign: data.textAlign,
      imageUrl: data.imageUrl,
      radius: data.radius,
      rx: data.rx,
      ry: data.ry,
      shadow: data.shadow,
      data: data.data,
      strokeUniform: data.strokeUniform,
      cornerColor: data.cornerColor,
      cornerSize: data.cornerSize,
      cornerStrokeColor: data.cornerStrokeColor,
      borderColor: data.borderColor,
      borderScaleFactor: data.borderScaleFactor,
      zIndex: data.zIndex,
      locked: data.locked,
      visible: data.visible,
      points: data.points,
    });
  };

  return upsertObject;
};
