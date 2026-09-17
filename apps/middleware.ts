import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from 'foodie-shared-web/auth';

/**
 * Middleware route protection — Blueprint §15.2 / System Design §5.3.
 * Cookie presence gate for (dashboard). Role claims are restored via login /
 * refresh identity (GAP-API-13).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const hasAuth = Boolean(accessToken || refreshToken);

  // Allow visiting /login freely so users can switch admin role personas
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // If visiting protected routes while unauthenticated, redirect to /login
  if (!hasAuth && pathname !== '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static files (.svg, .png, .jpg, .css, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
