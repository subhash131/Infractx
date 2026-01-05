import { api } from "../../_generated/api";
import { Doc } from "../../_generated/dataModel";
import { WorkflowStateType } from "../designAgent";

export const validateFrame = async (state: WorkflowStateType) => {
  console.log("Entering validateFrame", state.frameId);
  let frameId = state.frameId;

  if (state.frameId) {
    // Frame ID exists - validate it
    const frame = await state.convexState.runQuery(
      api.design.layers.getLayerById,
      {
        frameId: state.frameId,
      }
    );
    console.log("validateFrame - existing frame check:", frame);

    if (!frame || frame.type !== "FRAME") {
      // Frame is invalid - create new one
      frameId = await state.convexState.runMutation(
        api.design.layers.createObject,
        {
          layerObject: {
            name: "New Frame",
            type: "FRAME",
            pageId: state.pageId,
            width: 800,
            height: 600,
            fill: "#ffffff",
            left: state.canvasWidth / 2 - 100,
            top: state.canvasHeight / 2 - 300,
          },
        }
      );
      console.log("validateFrame - created new frame (invalid):", frameId);
    }
  } else {
    // ✅ No frame ID provided - create new one
    frameId = await state.convexState.runMutation(
      api.design.layers.createObject,
      {
        layerObject: {
          name: "New Frame",
          type: "FRAME",
          pageId: state.pageId,
          width: 800,
          height: 600,
          fill: "#ffffff",
          left: state.canvasWidth / 2 - 400,
          top: state.canvasHeight / 2 - 300,
        },
      }
    );
    console.log("validateFrame - created new frame (none existed):", frameId);
  }

  console.log("exiting validateFrame", frameId);
  return { frameId };
};

export const insertLayer = async (
  layer: Doc<"layers">,
  state: WorkflowStateType
) => {
  const layerId = await state.convexState.runMutation(
    api.design.layers.createObject,
    {
      layerObject: layer,
    }
  );
  return layerId;
};
