import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge guard for the admin UI. This is a convenience redirect layer — it checks
 * only for the PRESENCE of the session cookie so unauthenticated users are sent
 * to the login page quickly. It is NOT the security boundary: the cookie's HMAC
 * signature and role are verified server-side (src/lib/auth.ts) on every admin
 * API call and page render. A forged/absent cookie cannot pass those checks.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the login page and the auth API through.
  if (pathname === "/admin/login") return NextResponse.next();

  if (pathname.startsWith("/admin")) {
    const hasCookie = req.cookies.has("beskar_session");
    if (!hasCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
