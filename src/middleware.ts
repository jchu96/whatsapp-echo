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
  try {
    const { pathname } = request.nextUrl;
    
    console.log('🔍 [MIDDLEWARE] Processing:', pathname);
    console.log('🔍 [MIDDLEWARE] Full URL:', request.url);
    console.log('🔍 [MIDDLEWARE] Method:', request.method);

    // Check each condition individually for debugging
    const isApiAuth = pathname.startsWith('/api/auth');
    const isApiInbound = pathname.startsWith('/api/inbound');
    const isApiBackground = pathname.startsWith('/api/background');
    const isApiContact = pathname.startsWith('/api/contact');
    const isApiTranscribe = pathname.startsWith('/api/transcribe');
    const isNext = pathname.startsWith('/_next');
    const isFavicon = pathname.startsWith('/favicon.ico');
    const isSignin = pathname === '/auth/signin';
    const isError = pathname === '/auth/error';
    const isApprovalPending = pathname === '/approval-pending';
    
    console.log('🔍 [MIDDLEWARE] Condition checks:', {
      isApiAuth,
      isApiInbound,
      isApiBackground,
      isApiContact,
      isApiTranscribe,
      isNext,
      isFavicon,
      isSignin,
      isError,
      isApprovalPending
    });

    // Skip middleware for auth routes, static files, and API routes that don't need protection
    if (isApiAuth || isApiInbound || isApiBackground || isApiContact || isApiTranscribe || isNext || isFavicon || isSignin || isError || isApprovalPending) {
      console.log('🔍 [MIDDLEWARE] Skipping middleware for:', pathname);
      return NextResponse.next();
    }
    
    console.log('🔍 [MIDDLEWARE] Continuing with middleware for:', pathname);

    // Get the user's session token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    
    console.log('🔍 [MIDDLEWARE] Token exists:', !!token);

    // Public routes that don't require authentication
    const publicRoutes = [
      '/',
      '/about',
      '/contact',
      '/terms',
      '/privacy',
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
      '/api/user',  // User-specific API routes like preferences
    ];

    const requiresApproval = approvalRequiredRoutes.some(route => 
      pathname.startsWith(route)
    );

    if (requiresApproval && token) {
      console.log('🔍 [MIDDLEWARE] Checking approval for:', pathname);
      try {
        // Get user data to check approval status
        const userEmail = token.email as string;
        const userResult = await getUserByEmail(userEmail);
        
        console.log('🔍 [MIDDLEWARE] User result:', userResult.success, userResult.data?.approved);
        console.log('🔍 [MIDDLEWARE] User email:', userEmail);
        console.log('🔍 [MIDDLEWARE] Raw user data:', JSON.stringify(userResult.data, null, 2));

        if (userResult.success && userResult.data) {
          const user = userResult.data;
          
          // Log detailed approval information
          console.log('🔍 [MIDDLEWARE] Approval check:', {
            email: user.google_email,
            approved: user.approved,
            approvedType: typeof user.approved,
            booleanValue: Boolean(user.approved),
            isAdmin: isAdminEmail(userEmail)
          });
          
          // If user is not approved and not an admin, redirect to approval page
          if (!Boolean(user.approved) && !isAdminEmail(userEmail)) {
            console.log('🔍 [MIDDLEWARE] Redirecting to approval-pending');
            return NextResponse.redirect(new URL('/approval-pending', request.url));
          }
        }
      } catch (error) {
        console.error('Middleware error checking user approval:', error);
        // Continue without blocking on error
      }
    }

    console.log('🔍 [MIDDLEWARE] Returning NextResponse.next() for:', pathname);
    return NextResponse.next();
  } catch (error) {
    console.error('🚨 [MIDDLEWARE] Error in middleware:', error);
    console.error('🚨 [MIDDLEWARE] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    // Return next() to avoid blocking requests
    return NextResponse.next();
  }
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
     * - images (public images)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|images|public).*)',
  ],
}; 