import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const token = req.cookies.get('sb-access-token')?.value || req.cookies.get('supabase-auth-token')?.value;

  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/admin');

  // If trying to access protected route without token, redirect to login
  if (!token && isDashboardPage) {
    // Note: Client-side AuthContext also performs backup route protection
    // return NextResponse.redirect(new URL('/login', req.url));
  }

  // If already authenticated and on login page, redirect to dashboard
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
};
