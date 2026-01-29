import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { DESIGN_TOOLS_TYPE, MESSAGE_CONTEXT_TYPE } from "./design/constants";
import { shapeInsertValidator } from "./design/utils";

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

  designs: defineTable({
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
    designId: v.id("designs"),
    layersCount: v.number(),
    bgColor: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_design", ["designId"]),

  // Canvas objects store individual elements (rectangles, circles, text, images, etc.)
  //Old - for fabric-js
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
        }),
      ),
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
    layerRef: v.optional(v.string()),
    parentLayerRef: v.optional(v.string()),
  })
    .index("by_page", ["pageId"])
    .index("by_page_zindex", ["pageId", "zIndex"])
    .index("by_type", ["type"])
    .index("by_parent", ["parentLayerId"]),

  //new - for konva.js
  shapes: defineTable(shapeInsertValidator)
    .index("by_page", ["pageId"])
    .index("by_parent_order", ["parentShapeId", "order"])
    .index("by_type", ["type"])
    .index("by_parent", ["parentShapeId"]),

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

  requirements: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    docId: v.string(),
    preview: v.optional(v.string()),
  }).index("by_docId", ["docId"]),

  blocks: defineTable({
    // --- 1. Identity (from Block.id) ---
    // The specific UUID generated by BlockNote
    blockId: v.string(),

    // Links this block to a specific Document
    docId: v.string(),

    // --- 2. Hierarchy (from Block.children) ---
    // Instead of storing a nested array of children, we store the 'parentId'.
    // If this block is inside a Column or List, this points to that container.
    // Top-level blocks have parentId: null (or undefined).
    parentId: v.optional(v.string()),

    // --- 3. Type (from Block.type) ---
    // e.g. "paragraph", "heading", "bulletListItem", "image", "table"
    type: v.string(),

    // --- 4. Properties (from Block.props) ---
    // The docs define this as Record<string, boolean | number | string>
    // This is where 'level', 'textColor', 'backgroundColor', 'textAlignment' live.
    // We use v.any() because the keys change based on the block type.
    props: v.any(),

    // --- 5. Content (from Block.content) ---
    // The docs define this as InlineContent[] | TableContent | undefined
    // This holds the text array: [{ type: "text", text: "Hello", styles: { bold: true } }]
    // It also holds Table rows if type === "table".
    content: v.any(),

    // --- 6. Ordering (External to BlockNote, but required for DB) ---
    // You need this to know which block comes first.
    // Use a Lexorank string (e.g. "0|a001")
    rank: v.string(),
  })
    // Index for "Get the whole document tree"
    .index("by_doc", ["docId"])
    // Index for "Get children of a specific block" (e.g. items inside a list)
    .index("by_parent_rank", ["docId", "parentId", "rank"])
    // Index for "AI Context Search" (Find block by ID quickly)
    .index("by_blockId", ["blockId"]),
});
