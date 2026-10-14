import { NextResponse, type NextRequest } from "next/server";
import { toUserRole, UserRole } from "@/types/enums";
import { COOKIE_NAMES, ROLE_BASE, ROUTES, roleHome } from "@/utils/constant";

const SIGNED_IN_PREFIXES = [
  ROLE_BASE[UserRole.BUYER],
  ROLE_BASE[UserRole.VENDOR],
];

/**
 * First line of defence: pages that need a session redirect to sign-in when the refresh cookie is
 * missing. This is a convenience, not security: the cookie is only checked for presence here,
 * and every API call is authorised by the backend.
 *
 * "/" is not a page. Signed out it leads to sign-in; signed in it leads to the buyer or vendor
 * home, picked from the role hint cookie (a wrong hint is corrected by RoleGate on arrival).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasUserSession = req.cookies.has(COOKIE_NAMES.userRefresh);
  const hasAdminSession = req.cookies.has(COOKIE_NAMES.adminRefresh);
  const userHome = roleHome(
    toUserRole(req.cookies.get(COOKIE_NAMES.userRole)?.value) ?? UserRole.BUYER,
  );

  if (pathname === "/admin") {
    return NextResponse.redirect(
      new URL(
        hasAdminSession ? ROUTES.adminDashboard : ROUTES.adminLogin,
        req.url,
      ),
    );
  }
  if (pathname.startsWith("/admin")) {
    if (pathname === ROUTES.adminLogin) {
      return hasAdminSession
        ? NextResponse.redirect(new URL(ROUTES.adminDashboard, req.url))
        : NextResponse.next();
    }
    return hasAdminSession
      ? NextResponse.next()
      : NextResponse.redirect(new URL(ROUTES.adminLogin, req.url));
  }

  if (pathname === ROUTES.home) {
    return NextResponse.redirect(
      new URL(hasUserSession ? userHome : ROUTES.login, req.url),
    );
  }

  if (pathname === ROUTES.login || pathname === ROUTES.signup) {
    return hasUserSession
      ? NextResponse.redirect(new URL(userHome, req.url))
      : NextResponse.next();
  }

  if (
    SIGNED_IN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    if (hasUserSession) return NextResponse.next();
    const login = new URL(ROUTES.login, req.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/buyer/:path*",
    "/vendor/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
