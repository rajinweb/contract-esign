import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPages = ['/login', '/register', '/forgot-password'];
export function middleware(req: NextRequest) {
  const token = req.cookies.get('token'); 
  if (token && publicPages.includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/register', '/forgot-password'],
};
