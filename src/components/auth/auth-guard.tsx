import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/services/auth-service';
import type { UserRole } from '@/types/auth';

interface AuthGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

/**
 * Server Component that guards routes based on authentication and role
 *
 * Features:
 * - Runs in Node.js runtime (proper connection pooling)
 * - Type-safe role validation with TypeScript
 * - Preserves redirect URL for post-login navigation
 * - Centralized auth logic (DRY principle)
 *
 * Usage:
 * ```tsx
 * export default function ProtectedLayout({ children }) {
 *   return (
 *     <AuthGuard allowedRoles={['admin', 'kitchen']}>
 *       {children}
 *     </AuthGuard>
 *   );
 * }
 * ```
 */
export async function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || headersList.get('referer') || '/';

  // Extract pathname from full URL if referer is a full URL
  let cleanPathname = pathname;
  try {
    if (pathname.startsWith('http')) {
      cleanPathname = new URL(pathname).pathname;
    }
  } catch {
    // If URL parsing fails, use the original pathname
  }

  // Get current authenticated user with profile
  const user = await getCurrentUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(cleanPathname)}`);
  }

  // Redirect to unauthorized if account is inactive
  if (!user.isActive) {
    redirect('/unauthorized');
  }

  // Redirect to unauthorized if user role is not in allowed list
  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }

  // User is authenticated and authorized - render children
  return <>{children}</>;
}
