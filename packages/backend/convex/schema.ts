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
    left: v.number(),
    top: v.number(),
    width: v.number(),
    height: v.number(),

    // Rotation and scaling
    angle: v.number(),
    scaleX: v.number(),
    scaleY: v.number(),

    // Styling
    fill: v.optional(v.string()),
    stroke: v.optional(v.string()),
    strokeWidth: v.number(),
    opacity: v.number(),

    // Text-specific properties
    text: v.optional(v.string()),
    fontSize: v.optional(v.number()),
    fontFamily: v.optional(v.string()),
    fontWeight: v.optional(v.string()),
    textAlign: v.optional(v.string()),

    // Image-specific properties
    imageUrl: v.optional(v.string()),

    // Shape-specific properties
    radius: v.optional(v.number()),
    rx: v.optional(v.number()),
    ry: v.optional(v.number()),

    // Advanced properties
    shadow: v.optional(v.string()),
    data: v.optional(v.any()), // Store arbitrary fabric.js object data

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

  // Collaborators for shared canvases
  collaborators: defineTable({
    canvasId: v.id("canvases"),
    userId: v.string(),
    role: v.string(), // "owner", "editor", "viewer"
    addedAt: v.number(),
  })
    .index("by_canvas", ["canvasId"])
    .index("by_canvas_user", ["canvasId", "userId"]),

  // Comments and annotations
  comments: defineTable({
    canvasId: v.id("canvases"),
    objectId: v.optional(v.string()),
    userId: v.string(),
    content: v.string(),
    resolved: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_canvas", ["canvasId"])
    .index("by_object", ["objectId"]),

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
