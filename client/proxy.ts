import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * ORA Next.js 16+ Route & Request Proxy (`proxy.ts`)
 * Protects dashboard routes from unauthenticated users and forwards /api requests to NestJS.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Embedded Shopify routes authenticate client-side via App Bridge session tokens;
  // bypass edge cookie checking to avoid 3rd-party cookie redirect loops in iframes.
  if (pathname.startsWith('/shopify')) {
    return NextResponse.next();
  }

  // When Shopify Admin frames the app using the root URL (e.g. CLI tunnel in dev),
  // rewrite root requests carrying Shopify params directly to the embedded UI route.
  if (
    pathname === '/' &&
    (request.nextUrl.searchParams.has('shop') ||
      request.nextUrl.searchParams.has('embedded') ||
      request.nextUrl.searchParams.has('id_token'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/shopify';
    return NextResponse.rewrite(url);
  }

  const sessionId = request.cookies.get('sessionId')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const userRole = request.cookies.get('userRole')?.value;
  const isAuthenticated = Boolean(sessionId || refreshToken);

  const isAuthRoute = pathname.startsWith('/auth');

  // Merchant dashboard routes
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/setup') ||
    pathname.startsWith('/agent') ||
    pathname.startsWith('/live-desk') ||
    pathname.startsWith('/customers') ||
    pathname.startsWith('/conversations') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/notifications') ||
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

  // 3. Authenticated user attempting to access /auth -> Redirect active roles (admin/owner/staff)
  const hasFromParam = request.nextUrl.searchParams.has('from');
  const hasModeParam = request.nextUrl.searchParams.has('mode');
  if (isAuthRoute && isAuthenticated && !hasFromParam && !hasModeParam) {
    if (userRole === 'admin' || userRole === 'super_admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (userRole === 'owner' || userRole === 'staff') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Unsubscribed 'user' role is allowed to view /auth (e.g. to sign up, sign in, or switch accounts)
  }

  // 4. Proxy /api requests to NestJS backend on port 5000
  if (pathname.startsWith('/api/')) {
    const backendUrl = process.env.NESTJS_BACKEND_URL || 'http://127.0.0.1:5000';
    const destination = new URL(pathname, backendUrl);
    destination.search = request.nextUrl.search;

    const requestHeaders = new Headers(request.headers);
    if (!requestHeaders.has('x-client-origin')) {
      requestHeaders.set('x-client-origin', request.nextUrl.origin);
    }
    requestHeaders.set('x-forwarded-host', request.nextUrl.host);
    requestHeaders.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

    return NextResponse.rewrite(destination, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
