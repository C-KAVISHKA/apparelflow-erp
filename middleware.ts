import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Role-based route access map
const roleRoutes: Record<string, string[]> = {
  cutting_supervisor: ["/dashboard/supervisor"],
  cutting_verifier: ["/dashboard/verifier"],
  sewing_supervisor: ["/dashboard/sewing"],
};

export default async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users to login
  if (!session) {
    if (pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const role = session.user?.role as string;

  // Block wrong role from accessing wrong dashboard
  if (pathname.startsWith("/dashboard/supervisor") && role !== "cutting_supervisor") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (pathname.startsWith("/dashboard/verifier") && role !== "cutting_verifier") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  if (pathname.startsWith("/dashboard/sewing") && role !== "sewing_supervisor") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login") {
    const redirectMap: Record<string, string> = {
      cutting_supervisor: "/dashboard/supervisor",
      cutting_verifier: "/dashboard/verifier",
      sewing_supervisor: "/dashboard/sewing",
    };
    return NextResponse.redirect(new URL(redirectMap[role] || "/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
