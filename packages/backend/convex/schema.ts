import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { DESIGN_TOOLS_TYPE, MESSAGE_CONTEXT_TYPE } from "./design/constants";

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

  files: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(),
    organizationId: v.optional(v.string()), // TODO: add Organization
    activePage: v.optional(v.id("pages")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_organization", ["organizationId"])
    .index("by_owner_organization", ["ownerId", "organizationId"]),

  pages: defineTable({
    name: v.string(),
    fileId: v.id("files"),
    layersCount: v.number(),
    bgColor: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_file", ["fileId"]),

  // Canvas documents store the main canvas state
  canvases: defineTable({
    // Metadata
    pageId: v.id("pages"),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Canvas dimensions and settings
    width: v.number(),
    height: v.number(),
    backgroundColor: v.optional(v.string()),

    // Canvas state
    zoom: v.number(),
    order: v.number(),
    offsetX: v.number(),
    offsetY: v.number(),
  }).index("by_page", ["pageId"]),

  // Canvas objects store individual elements (rectangles, circles, text, images, etc.)
  layers: defineTable({
    // Object properties
    type: DESIGN_TOOLS_TYPE, // "rect", "circle", "triangle", "text", "image", "path", etc.
    parentLayerId: v.optional(v.id("layers")),
    parentType: v.optional(v.union(v.literal("PAGE"), v.literal("CANVAS"))),

    pageId: v.id("pages"),
    name: v.string(),

    // Position and dimensions
    padding: v.optional(v.number()),
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
    zIndex: v.optional(v.number()),
    locked: v.optional(v.boolean()),
    visible: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_page", ["pageId"])
    .index("by_page_zindex", ["pageId", "zIndex"])
    .index("by_type", ["type"])
    .index("by_parent", ["parentLayerId"]),
  // Design templates
  templates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
    org_id: v.string(),
    frameDate: v.string(),
    thumbnail: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPublic: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_public", ["isPublic"])
    .index("by_organization", ["org_id"]),

  conversations: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    title: v.string(),
  }),

  messages: defineTable({
    conversationId: v.id("conversations"),
    message: v.object({
      content: v.string(),
      context: MESSAGE_CONTEXT_TYPE,
      role: v.union(v.literal("USER"), v.literal("AI"), v.literal("SYSTEM")),
    }),
  }).index("by_conversation", ["conversationId"]),
});
