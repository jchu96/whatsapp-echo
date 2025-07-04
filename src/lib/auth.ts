import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { AppSession } from '@/types';
import { getUserByEmail, createUser, generateUniqueSlug } from '@/lib/database';
import { getEnvConfig, isAdminEmail } from '@/utils/env';

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
      // Only allow Google OAuth sign-ins
      if (account?.provider !== 'google') {
        return false;
      }

      // Ensure we have an email
      if (!user.email) {
        return false;
      }

      try {
        // Check if user exists
        const existingUser = await getUserByEmail(user.email);
        
        if (!existingUser.success) {
          // User doesn't exist, create them
          const slug = await generateUniqueSlug();
          const isAdmin = isAdminEmail(user.email);
          
          const newUser = await createUser({
            google_email: user.email,
            slug,
            approved: isAdmin, // Auto-approve admin emails
          });

          if (!newUser.success) {
            console.error('Failed to create user:', newUser.error);
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error('Sign-in error:', error);
        return false;
      }
    },

    async session({ session, token }) {
      if (session.user?.email) {
        try {
          const userResult = await getUserByEmail(session.user.email);
          
          if (userResult.success && userResult.data) {
            const user = userResult.data;
            
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
          }
        } catch (error) {
          console.error('Session callback error:', error);
        }
      }

      // Fallback to default session
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