import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * ORA Next.js 16+ Route & Request Proxy (`proxy.ts`)
 * Protects dashboard routes from unauthenticated users and forwards /api requests to NestJS.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionId = request.cookies.get('sessionId')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const isAuthenticated = Boolean(sessionId || refreshToken);

  const isAuthRoute = pathname.startsWith('/auth');

  // All protected dashboard and command center routes
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/agent') ||
    pathname.startsWith('/live-desk') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/conversations') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/profile');

  // 1. Unauthenticated user attempting to access dashboard -> Redirect to /auth
  if (isProtectedRoute && !isAuthenticated) {
    const authUrl = new URL('/auth', request.url);
    authUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(authUrl);
  }

  // 2. Authenticated user attempting to access /auth -> Redirect to /dashboard
  // If the request contains a 'from' query parameter (e.g. redirected from client auth failure),
  // do not redirect back to /dashboard to avoid an infinite loop.
  const hasFromParam = request.nextUrl.searchParams.has('from');
  if (isAuthRoute && isAuthenticated && !hasFromParam) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Proxy /api requests to NestJS backend on port 5000
  if (pathname.startsWith('/api/')) {
    const backendUrl = process.env.NESTJS_BACKEND_URL || 'http://localhost:5000';
    const destination = new URL(pathname, backendUrl);
    destination.search = request.nextUrl.search;

    return NextResponse.rewrite(destination, {
      request: {
        headers: request.headers,
      },
    });
  }

  return NextResponse.next();
}

export const middleware = proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
