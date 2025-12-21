import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/builder', '/profile', '/settings'];

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

  const isPublicAuthRoute = ['/login', '/register', '/forgot-password'].includes(path);

  const token = req.cookies.get('token')?.value;

  // If user is logged in, redirect from auth pages or the root landing page to the dashboard
  if (token && (isPublicAuthRoute || path === '/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // If user is not logged in and tries to access a protected route, redirect to login
  if (!token && isProtectedRoute) {
    const url = new URL('/login', req.url)
    if (path.startsWith('/sign')) {
      // if user is trying to sign a document, redirect to login with a callback url
      url.searchParams.set('callbackUrl', path)
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};