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
  const userRole = request.cookies.get('userRole')?.value;
  const isAuthenticated = Boolean(sessionId || refreshToken);

  const isAuthRoute = pathname.startsWith('/auth');

  // Merchant dashboard routes
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/agent') ||
    pathname.startsWith('/live-desk') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/conversations') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/profile');

  // Admin command center routes
  const isAdminRoute = pathname.startsWith('/admin');

  const isProtectedRoute = isDashboardRoute || isAdminRoute;

  // 1. Unauthenticated user attempting to access protected route -> Redirect to /auth
  if (isProtectedRoute && !isAuthenticated) {
    const authUrl = new URL('/auth', request.url);
    authUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(authUrl);
  }

  // 2. Role-based route isolation for authenticated sessions
  if (isAuthenticated && userRole) {
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';
    const isMerchant = userRole === 'owner' || userRole === 'staff';
    const isRegularUser = userRole === 'user';

    // Regular 'user' role without active subscription cannot access /admin, /dashboard, or merchant routes
    if (isRegularUser && (isAdminRoute || isDashboardRoute)) {
      return NextResponse.redirect(new URL('/pricing', request.url));
    }

    // Admin & SuperAdmin can ONLY access /admin
    if (isAdmin && isDashboardRoute) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // Merchant (owner & staff) can ONLY access /dashboard
    if (isMerchant && isAdminRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 3. Authenticated user attempting to access /auth -> Redirect based on role
  const hasFromParam = request.nextUrl.searchParams.has('from');
  if (isAuthRoute && isAuthenticated && !hasFromParam) {
    let target = '/dashboard';
    if (userRole === 'admin' || userRole === 'super_admin') {
      target = '/admin';
    } else if (userRole === 'user') {
      target = '/pricing';
    }
    return NextResponse.redirect(new URL(target, request.url));
  }

  // 4. Proxy /api requests to NestJS backend on port 5000
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
