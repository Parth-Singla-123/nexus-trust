import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/transactions", "/profile", "/analytics"];
const authPaths = ["/login", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("fhs_session")?.value;
  const hasSession = Boolean(sessionCookie);

  if (protectedPaths.some((path) => pathname.startsWith(path)) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (authPaths.some((path) => pathname.startsWith(path)) && hasSession) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/transactions/:path*", "/profile/:path*", "/login", "/signup"],
};
