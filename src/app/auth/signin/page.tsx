// @ts-ignore
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// @ts-ignore
import { redirect } from 'next/navigation';
// @ts-ignore
import { getProviders } from 'next-auth/react';
import { SignInForm } from '@/components/auth/signin-form';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  const session = await getServerSession(authOptions);
  
  // If user is already signed in, redirect to dashboard or callback URL
  if (session) {
    const callbackUrl = searchParams.callbackUrl || '/dashboard';
    redirect(callbackUrl);
  }

  const providers = await getProviders();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Sign In</h1>
          <p className="text-muted-foreground">
            Sign in with your Google account to access the voice transcription service
          </p>
        </div>

        {searchParams.error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-md">
            <p className="text-sm text-destructive font-medium">
              {getErrorMessage(searchParams.error)}
            </p>
          </div>
        )}

        <SignInForm 
          providers={providers} 
          callbackUrl={searchParams.callbackUrl}
        />

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            By signing in, you agree to our terms of service and privacy policy.
          </p>
          <p className="mt-2">
            New users require admin approval before accessing the service.
          </p>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: string): string {
  switch (error) {
    case 'OAuthSignin':
      return 'Error occurred during OAuth sign-in. Please try again.';
    case 'OAuthCallback':
      return 'Error occurred during OAuth callback. Please try again.';
    case 'OAuthCreateAccount':
      return 'Could not create OAuth account. Please try again.';
    case 'EmailCreateAccount':
      return 'Could not create account. Please try again.';
    case 'Callback':
      return 'Error occurred during callback. Please try again.';
    case 'OAuthAccountNotLinked':
      return 'Account not linked. Please use the same account you used to sign up.';
    case 'EmailSignin':
      return 'Error occurred during email sign-in. Please try again.';
    case 'CredentialsSignin':
      return 'Invalid credentials. Please check your login details.';
    case 'SessionRequired':
      return 'Please sign in to access this page.';
    default:
      return 'An error occurred during sign-in. Please try again.';
  }
} 