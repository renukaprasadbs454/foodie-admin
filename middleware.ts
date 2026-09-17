import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get('foodie_access_token')?.value;
  const refreshToken = request.cookies.get('foodie_refresh_token')?.value;
  const hasAuth = Boolean(accessToken || refreshToken);

  // If visiting /login:
  if (pathname === '/login') {
    if (hasAuth) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // If visiting protected routes while unauthenticated, redirect to /login
  if (!hasAuth) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
};
