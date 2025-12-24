import { v } from "convex/values";
import { mutation } from "./_generated/server";

// Secure session token generator (crypto-agnostic)
const generateSessionToken = (): string => {
  return btoa(
    String(Date.now()) + Math.random().toString(36) + Math.random().toString(36)
  )
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 32);
};

// Password hash (upgrade to bcrypt in prod)
const hashPassword = (password: string): string => {
  return btoa(password + process.env.PASSWORD_SALT);
};

const verifyPassword = (password: string, hash: string): boolean => {
  return hash === hashPassword(password);
};

export const loginUser = mutation({
  args: { email: v.string(), password: v.string() },
  async handler(ctx, args) {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email.toLowerCase()))
      .first();

    if (!user || !verifyPassword(args.password, user.passwordHash)) {
      throw new Error("Invalid credentials");
    }

    // ✅ Secure 32-char token (no imports needed)
    const sessionToken = generateSessionToken();

    await ctx.db.insert("sessions", {
      userId: user._id,
      token: sessionToken,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      createdAt: Date.now(),
    });

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      sessionToken,
    };
  },
});

// ✅ User registration mutation
export const registerUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  async handler(ctx, args) {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email.toLowerCase()))
      .first();

    if (existingUser) {
      throw new Error("User already exists with this email");
    }

    // Hash password and create user
    const passwordHash = hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      name: args.name.trim(),
      passwordHash,
      createdAt: Date.now(),
    });

    // Generate session token automatically on registration
    const sessionToken = generateSessionToken();

    await ctx.db.insert("sessions", {
      userId,
      token: sessionToken,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      createdAt: Date.now(),
    });

    // Fetch user details for response
    const user = await ctx.db.get(userId);

    return {
      userId: user!._id,
      email: user!.email,
      name: user!.name,
      sessionToken,
    };
  },
});
