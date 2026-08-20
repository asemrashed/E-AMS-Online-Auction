import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BUYER_ONLY = ['/cart', '/checkout'];
const SELLER_PREFIX = ['/dashboard/listings', '/dashboard/bank', '/dashboard/sales', '/dashboard/payouts'];
const DASHBOARD = '/dashboard';
const ADMIN = '/admin';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = request.cookies.get('eams_auth')?.value === '1';
  const role = request.cookies.get('eams_role')?.value;

  const needsAuth =
    pathname.startsWith(DASHBOARD) ||
    pathname.startsWith(ADMIN) ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/checkout');

  if (needsAuth && !authed) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith(ADMIN) && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (BUYER_ONLY.some((p) => pathname.startsWith(p)) && role && role !== 'BUYER') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (SELLER_PREFIX.some((p) => pathname.startsWith(p)) && role && role !== 'SELLER') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (pathname === '/admin/admins' || pathname === '/admin/commission-report') {
    if (role !== 'SUPER_ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/notifications', '/cart', '/checkout/:path*'],
};