import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userId = request.cookies.get("userId")?.value;

  console.log(`[PROXY] Path: ${pathname}, User: ${userId || "NO USER"}`);

  // Public routes (exact list - NO subpaths unless needed)
  const publicRoutes = ["/", "/login", "/register"];
  const isPublicRoute = publicRoutes.includes(pathname);

  // BLOCK all non-public routes if no userId
  if (!userId && !isPublicRoute) {
    console.log(`[PROXY] BLOCKING ${pathname} -> /login`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect logged-in users AWAY from auth pages
  if (userId && publicRoutes.includes(pathname)) {
    console.log(`[PROXY] Auth user on public route ${pathname} -> /files`);
    return NextResponse.redirect(new URL("/files", request.url));
  }

  console.log(`[PROXY] ALLOW ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match EVERYTHING except static/API
    "/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
