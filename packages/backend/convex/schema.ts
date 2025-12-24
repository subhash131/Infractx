import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table for authentication
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"])
    .index("by_expiry", ["expiresAt"]),

  // Canvas documents store the main canvas state
  canvases: defineTable({
    // Metadata
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Canvas dimensions and settings
    width: v.number(),
    height: v.number(),
    backgroundColor: v.optional(v.string()),

    // Canvas state
    zoom: v.number(),
    offsetX: v.number(),
    offsetY: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_created", ["ownerId", "createdAt"]),

  // Canvas objects store individual elements (rectangles, circles, text, images, etc.)
  canvasObjects: defineTable({
    canvasId: v.id("canvases"),
    // Object properties
    type: v.string(), // "rect", "circle", "triangle", "text", "image", "path", etc.
    objectId: v.string(), // Unique ID within the canvas

    // Position and dimensions
    left: v.float64(),
    top: v.float64(),
    width: v.float64(),
    height: v.float64(),
    points: v.optional(
      v.array(
        v.object({
          x: v.number(),
          y: v.number(),
        })
      )
    ),

    // Rotation and scaling
    angle: v.float64(),
    scaleX: v.float64(),
    scaleY: v.float64(),

    // Styling
    fill: v.optional(v.string()),
    stroke: v.optional(v.string()),
    strokeWidth: v.float64(),
    opacity: v.float64(),

    // Text-specific properties
    text: v.optional(v.string()),
    fontSize: v.optional(v.float64()),
    fontFamily: v.optional(v.string()),
    fontWeight: v.optional(v.string()),
    textAlign: v.optional(v.string()),
    fontStyle: v.optional(v.string()),
    underline: v.optional(v.boolean()),
    linethrough: v.optional(v.boolean()),
    overline: v.optional(v.boolean()),

    // Image-specific properties
    imageUrl: v.optional(v.string()),

    // Shape-specific properties
    radius: v.optional(v.float64()),
    rx: v.optional(v.float64()),
    ry: v.optional(v.float64()),

    // Advanced properties
    shadow: v.optional(v.string()),
    data: v.optional(v.any()), // Store arbitrary fabric.js object data
    strokeUniform: v.optional(v.boolean()),
    cornerColor: v.optional(v.string()),
    cornerSize: v.optional(v.float64()),
    cornerStrokeColor: v.optional(v.string()),
    borderColor: v.optional(v.string()),
    borderScaleFactor: v.optional(v.float64()),

    // Metadata
    zIndex: v.number(),
    locked: v.boolean(),
    visible: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_canvas", ["canvasId"])
    .index("by_canvas_zindex", ["canvasId", "zIndex"]),

  // Layers for organizing canvas objects
  layers: defineTable({
    canvasId: v.id("canvases"),
    name: v.string(),
    visible: v.boolean(),
    locked: v.boolean(),
    opacity: v.number(),
    zIndex: v.number(),
    createdAt: v.number(),
  }).index("by_canvas", ["canvasId"]),

  // Layer objects - relationship between objects and layers
  layerObjects: defineTable({
    layerId: v.id("layers"),
    objectId: v.id("canvasObjects"),
  })
    .index("by_layer", ["layerId"])
    .index("by_object", ["objectId"]),

  // Canvas history for undo/redo functionality
  canvasHistory: defineTable({
    canvasId: v.id("canvases"),
    action: v.string(), // "create", "update", "delete", "move", etc.
    objectId: v.optional(v.string()),
    previousState: v.optional(v.any()),
    newState: v.optional(v.any()),
    timestamp: v.number(),
    userId: v.string(),
  })
    .index("by_canvas", ["canvasId"])
    .index("by_canvas_timestamp", ["canvasId", "timestamp"]),

  // Design templates
  templates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
    canvasData: v.any(), // Store complete canvas state
    thumbnail: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_public", ["isPublic"]),
});
