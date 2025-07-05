import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { AppSession } from '@/types';
import { getUserByEmail, createUser, generateUniqueSlug } from '@/lib/database';
import { getEnvConfig, isAdminEmail } from '@/utils/env';
import { sendAdminNotification } from '@/lib/mailgun';

const config = getEnvConfig();

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
    }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔍 [AUTH] SignIn callback triggered');
      console.log('🔍 [AUTH] User:', user);
      console.log('🔍 [AUTH] Account:', account);
      console.log('🔍 [AUTH] Environment:', process.env.NODE_ENV);
      
      // Only allow Google OAuth sign-ins
      if (account?.provider !== 'google') {
        console.error('🚨 [AUTH] Non-Google provider rejected:', account?.provider);
        return false;
      }

      // Ensure we have an email
      if (!user.email) {
        console.error('🚨 [AUTH] No email provided');
        return false;
      }

      console.log('🔍 [AUTH] Processing sign-in for email:', user.email);

      // Add these debug lines:
      console.log('🔍 [AUTH] ADMIN_EMAILS env var:', process.env.ADMIN_EMAILS);
      console.log('🔍 [AUTH] Admin email check for', user.email, ':', isAdminEmail(user.email));

      // In development, allow sign-in without database if no valid credentials
      if (process.env.NODE_ENV === 'development' && (!config.D1_URL || config.D1_URL.includes('ACCOUNT_ID'))) {
        console.log('✅ [AUTH] Development mode: Skipping database operations');
        return true;
      }

      try {
        console.log('🔍 [AUTH] Checking if user exists...');
        
        // Check if user exists
        const existingUser = await getUserByEmail(user.email);
        
        console.log('🔍 [AUTH] getUserByEmail result:', existingUser);
        
        if (!existingUser.success) {
          console.log('🔍 [AUTH] User does not exist, creating new user...');
          
          // User doesn't exist, create them
          const slug = await generateUniqueSlug();
          console.log('🔍 [AUTH] Generated slug:', slug);
          
          const isAdmin = isAdminEmail(user.email);
          console.log('🔍 [AUTH] Is admin:', isAdmin);
          
          const newUser = await createUser({
            google_email: user.email,
            slug,
            approved: isAdmin, // Auto-approve admin emails
          });

          console.log('🔍 [AUTH] createUser result:', newUser);

          if (!newUser.success) {
            console.error('🚨 [AUTH] Failed to create user:', newUser.error);
            return false;
          }

          console.log('✅ [AUTH] User created successfully');
          
          // Send admin notification for new user signup (only for non-admin users)
          if (!isAdmin) {
            console.log('📧 [AUTH] Sending admin notification for new user');
            try {
              const notificationSent = await sendAdminNotification(
                user.email,
                slug,
                user.name || undefined
              );
              console.log('📧 [AUTH] Admin notification result:', notificationSent);
            } catch (error) {
              console.error('❌ [AUTH] Failed to send admin notification:', error);
              // Don't fail the sign-in if notification fails
            }
          }
        } else {
          console.log('✅ [AUTH] Existing user found');
        }

        console.log('✅ [AUTH] Sign-in successful');
        return true;
      } catch (error) {
        console.error('🚨 [AUTH] Sign-in error:', error);
        // In development, allow sign-in even if database fails
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ [AUTH] Development mode: Allowing sign-in despite database error');
          return true;
        }
        return false;
      }
    },

    async session({ session, token }) {
      console.log('🔍 [AUTH] Session callback triggered for:', session.user?.email);
      
      if (session.user?.email) {
        // In development, create a mock session if database is not available
        if (process.env.NODE_ENV === 'development' && (!config.D1_URL || config.D1_URL.includes('ACCOUNT_ID'))) {
          const mockSession: AppSession = {
            user: {
              id: 'dev-user-id',
              email: session.user.email,
              slug: 'devuser',
              approved: true,
              isAdmin: isAdminEmail(session.user.email),
              name: session.user.name || undefined,
              image: session.user.image || undefined,
            },
            expires: session.expires,
          };
          console.log('✅ [AUTH] Development mock session created');
          return mockSession;
        }

        try {
          console.log('🔍 [AUTH] Fetching user data for session:', session.user.email);
          const userResult = await getUserByEmail(session.user.email);
          
          if (userResult.success && userResult.data) {
            const user = userResult.data;
            console.log('✅ [AUTH] User found for session:', user.google_email);
            
            // Create extended session with our custom data
            const appSession: AppSession = {
              user: {
                id: user.id,
                email: user.google_email,
                slug: user.slug,
                approved: Boolean(user.approved),
                isAdmin: isAdminEmail(user.google_email),
                name: session.user.name || undefined,
                image: session.user.image || undefined,
              },
              expires: session.expires,
            };

            return appSession;
          } else {
            console.warn('⚠️ [AUTH] User not found in database for session, but session exists');
            console.warn('⚠️ [AUTH] This might indicate a race condition or database sync issue');
            
            // Create a minimal session with fallback data to prevent redirect loop
            const fallbackSession: AppSession = {
              user: {
                id: 'temp-user-id',
                email: session.user.email,
                slug: 'temp-slug',
                approved: false, // Default to not approved
                isAdmin: isAdminEmail(session.user.email),
                name: session.user.name || undefined,
                image: session.user.image || undefined,
              },
              expires: session.expires,
            };
            
            console.log('✅ [AUTH] Fallback session created to prevent redirect loop');
            return fallbackSession;
          }
        } catch (error) {
          console.error('🚨 [AUTH] Session callback error:', error);
          
          // Create a minimal session with fallback data to prevent redirect loop
          const fallbackSession: AppSession = {
            user: {
              id: 'temp-user-id',
              email: session.user.email,
              slug: 'temp-slug',
              approved: false, // Default to not approved
              isAdmin: isAdminEmail(session.user.email),
              name: session.user.name || undefined,
              image: session.user.image || undefined,
            },
            expires: session.expires,
          };
          
          console.log('✅ [AUTH] Error fallback session created');
          return fallbackSession;
        }
      }

      // Fallback to default session
      console.log('⚠️ [AUTH] No email in session, returning default session');
      return session;
    },

    async jwt({ token, user, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      
      return token;
    },
  },

  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  secret: config.NEXTAUTH_SECRET,
};

/**
 * Type guard to check if session is our extended AppSession
 * @param session - Session object
 * @returns boolean - True if session is AppSession
 */
export function isAppSession(session: any): session is AppSession {
  return (
    session &&
    session.user &&
    typeof session.user.id === 'string' &&
    typeof session.user.email === 'string' &&
    typeof session.user.slug === 'string' &&
    typeof session.user.approved === 'boolean' &&
    typeof session.user.isAdmin === 'boolean'
  );
}

/**
 * Get user from session with type safety
 * @param session - Session object
 * @returns User data or null
 */
export function getSessionUser(session: any) {
  if (isAppSession(session)) {
    return session.user;
  }
  return null;
}

/**
 * Check if user is admin from session
 * @param session - Session object
 * @returns boolean - True if user is admin
 */
export function isSessionAdmin(session: any): boolean {
  const user = getSessionUser(session);
  return user?.isAdmin || false;
}

/**
 * Check if user is approved from session
 * @param session - Session object
 * @returns boolean - True if user is approved
 */
export function isSessionApproved(session: any): boolean {
  const user = getSessionUser(session);
  return user?.approved || false;
}

/**
 * Get user slug from session
 * @param session - Session object
 * @returns string - User slug or empty string
 */
export function getSessionSlug(session: any): string {
  const user = getSessionUser(session);
  return user?.slug || '';
} 