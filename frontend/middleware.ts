import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const token = req.cookies.get('sb-access-token')?.value || 
                req.cookies.get('supabase-auth-token')?.value ||
                req.cookies.get('nexa_token')?.value;

  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isProtectedPage = req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/admin');

  // Server-side redirect for unauthenticated requests to protected pages
  if (!token && isProtectedPage) {
    // If cookie is absent, allow client-side AuthContext fallback check or redirect
    // Uncommenting below enforces hard SSR redirection when auth cookie strategy is fully deployed
    // const loginUrl = new URL('/login', req.url);
    // return NextResponse.redirect(loginUrl);
  }

  // Redirect away from login page if already holding auth token
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
};
