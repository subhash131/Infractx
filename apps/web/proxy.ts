import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/public(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const session = await auth();

  // 1. If user is signed in and tries to access auth pages, send them home
  if (session.userId && isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/projects", req.url));
  }

  // 2. Protect non-public routes
  if (!isPublicRoute(req) && !session.userId) {
    return session.redirectToSignIn(); // Use Clerk's built-in helper
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
