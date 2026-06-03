import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
 * This proxy handles:
 * 1. Supabase session cookie refresh (keeps sessions alive)
 * 2. Setting x-pathname header (used by AuthGuard for redirect-after-login)
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Inject x-pathname header so AuthGuard can build redirect URLs
  supabaseResponse.headers.set('x-pathname', request.nextUrl.pathname);

  // Refresh Supabase auth session cookies to prevent expiry
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Call getUser() to trigger session refresh. Do not cache this result.
  await supabase.auth.getUser();

  return supabaseResponse;
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
