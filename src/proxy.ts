import { NextResponse, type NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy (formerly middleware.ts)
 *
 * Authentication has been moved to Server Layout Guards for security and performance:
 * - Fixes CVE-2025-29927 (auth bypass under load)
 * - Proper connection pooling (Node.js runtime)
 * - Better performance and scalability
 *
 * Auth guards are now in:
 * - src/components/auth/auth-guard.tsx (reusable guard component)
 * - src/app/(kitchen)/layout.tsx (kitchen + admin roles)
 * - src/app/admin/layout.tsx (admin role only)
 * - src/app/(cashier)/layout.tsx (cashier + admin roles)
 *
 * This proxy now only handles static file serving.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - Images (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
