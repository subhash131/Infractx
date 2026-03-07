import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ArchPhase = "questions" | "tech_plan_approval" | "plan_approval" | "executing" | "done";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// ─── upsertSession ─────────────────────────────────────────────────────────────
// Creates a fresh session for a conversationId, or replaces an existing one.
export const upsertSession = mutation({
  args: {
    docId: v.string(),
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    sessionToken: v.string(),
    streamKey: v.string(),
    questions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Delete any stale session for this conversation first
    const existing = await ctx.db
      .query("architecture_sessions")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (existing) await ctx.db.delete(existing._id);

    return await ctx.db.insert("architecture_sessions", {
      docId: args.docId,
      conversationId: args.conversationId,
      phase: "questions",
      userMessage: args.userMessage,
      sessionToken: args.sessionToken,
      streamKey: args.streamKey,
      qa: args.questions.map((question) => ({ question })),
    });
  },
});

// ─── getSession ────────────────────────────────────────────────────────────────
export const getSession = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("architecture_sessions")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
  },
});

// ─── addAnswer ─────────────────────────────────────────────────────────────────
// Sets the answer on the first unanswered QA pair.
// Returns { answeredCount, totalQuestions, allAnswered, nextQuestion, nextIndex }
export const addAnswer = mutation({
  args: {
    conversationId: v.id("conversations"),
    answer: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("architecture_sessions")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (!session) throw new Error("No active architecture session for conversation: " + args.conversationId);

    // Find the first unanswered question
    const firstUnanswered = session.qa.findIndex((item) => item.answer === undefined);
    if (firstUnanswered === -1) {
      // The frontend might accidentally send the last answer twice. 
      // Return gracefully so the background job doesn't crash and stream an error.
      return { alreadyAnswered: true, answeredCount: session.qa.length, totalQuestions: session.qa.length, allAnswered: true, nextQuestion: null, nextIndex: null };
    }

    const updatedQA = session.qa.map((item, i) =>
      i === firstUnanswered ? { ...item, answer: args.answer } : item
    );

    await ctx.db.patch(session._id, { qa: updatedQA });

    const answeredCount = updatedQA.filter((item) => item.answer !== undefined).length;
    const totalQuestions = updatedQA.length;
    const allAnswered = answeredCount === totalQuestions;

    return {
      alreadyAnswered: false,
      answeredCount,
      totalQuestions,
      allAnswered,
      nextQuestion: (!allAnswered && updatedQA[answeredCount]) ? updatedQA[answeredCount].question : null,
      nextIndex: !allAnswered ? answeredCount : null,
    };
  },
});

// ─── setTechPlan ──────────────────────────────────────────────────────────────
// Transitions to tech_plan_approval phase, storing the generated technology plan JSON.
export const setTechPlan = mutation({
  args: {
    conversationId: v.id("conversations"),
    techPlanJson: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("architecture_sessions")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (!session) throw new Error("No active architecture session for conversation: " + args.conversationId);
    await ctx.db.patch(session._id, { phase: "tech_plan_approval", techPlan: args.techPlanJson });
  },
});

// ─── setPlan ──────────────────────────────────────────────────────────────────
// Transitions to plan_approval phase, storing the generated structure plan JSON.
export const setPlan = mutation({
  args: {
    conversationId: v.id("conversations"),
    planJson: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("architecture_sessions")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (!session) throw new Error("No active architecture session for conversation: " + args.conversationId);
    await ctx.db.patch(session._id, { phase: "plan_approval", plan: args.planJson });
  },
});

// ─── setPhase ─────────────────────────────────────────────────────────────────
// Generic phase transition. When moving to "done", schedules auto-deletion 1 day later.
export const setPhase = mutation({
  args: {
    conversationId: v.id("conversations"),
    phase: v.union(
      v.literal("questions"),
      v.literal("tech_plan_approval"),
      v.literal("plan_approval"),
      v.literal("executing"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("architecture_sessions")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (!session) throw new Error("No active architecture session for conversation: " + args.conversationId);

    await ctx.db.patch(session._id, { phase: args.phase });

    // Schedule cleanup 1 day after execution completes
    if (args.phase === "done") {
      await ctx.scheduler.runAfter(
        ONE_DAY_MS,
        internal.requirements.architectureSessions.deleteSessionInternal,
        { sessionId: session._id }
      );
    }
  },
});

// ─── deleteSession (manual — called on user rejection) ────────────────────────
export const deleteSession = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("architecture_sessions")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first();
    if (session) await ctx.db.delete(session._id);
  },
});

// ─── deleteSessionInternal (Convex scheduler only) ────────────────────────────
export const deleteSessionInternal = internalMutation({
  args: { sessionId: v.id("architecture_sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    // Safety check: only delete if still in "done" (don't wipe a restarted session)
    if (session && session.phase === "done") {
      await ctx.db.delete(args.sessionId);
      console.log("🗑️ Architecture session auto-deleted after 1 day:", args.sessionId);
    }
  },
});
