// @ts-ignore
import { NextResponse } from 'next/server';
// @ts-ignore
import type { NextRequest } from 'next/server';
// @ts-ignore
import { getToken } from 'next-auth/jwt';
import { isAdminEmail } from '@/utils/env';
import { getUserByEmail } from '@/lib/database';

// Declare process for middleware
declare var process: {
  env: Record<string, string | undefined>;
};

/**
 * Middleware to protect routes and enforce authentication
 * @param request - Next.js request object
 * @returns NextResponse - Response or redirect
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for auth routes, static files, and API routes that don't need protection
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/auth/signin' ||
    pathname === '/auth/error'
  ) {
    return NextResponse.next();
  }

  // Get the user's session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/about',
    '/contact',
  ];

  // Check if the current path is public
  const isPublicRoute = publicRoutes.indexOf(pathname) !== -1;

  // If user is not authenticated and trying to access a protected route
  if (!token && !isPublicRoute) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    // Must be authenticated to access admin routes
    if (!token) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Check if user is admin
    const userEmail = token.email as string;
    if (!userEmail || !isAdminEmail(userEmail)) {
      // Redirect non-admin users to dashboard or home
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Protected routes that require approval
  const approvalRequiredRoutes = [
    '/dashboard',
    '/profile',
    '/api/voice',
  ];

  const requiresApproval = approvalRequiredRoutes.some(route => 
    pathname.startsWith(route)
  );

  if (requiresApproval && token) {
    try {
      // Get user data to check approval status
      const userEmail = token.email as string;
      const userResult = await getUserByEmail(userEmail);

      if (userResult.success && userResult.data) {
        const user = userResult.data;
        
        // If user is not approved and not an admin, redirect to approval page
        if (!user.approved && !isAdminEmail(userEmail)) {
          return NextResponse.redirect(new URL('/approval-pending', request.url));
        }
      }
    } catch (error) {
      console.error('Middleware error checking user approval:', error);
      // Continue without blocking on error
    }
  }

  return NextResponse.next();
}

/**
 * Middleware configuration
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 