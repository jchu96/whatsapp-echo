'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SignInFormProps {
  providers: Record<string, any> | null;
  callbackUrl?: string;
}

export function SignInForm({ providers, callbackUrl }: SignInFormProps) {
  const handleSignIn = async (providerId: string) => {
    try {
      await signIn(providerId, {
        callbackUrl: callbackUrl || '/dashboard',
      });
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  if (!providers) {
    return (
              <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <p className="text-sm text-muted-foreground">
              Loading authentication providers...
            </p>
          </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose your sign-in method</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a provider to continue to the voice transcription service
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.values(providers).map((provider: any) => (
          <div key={provider.name}>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSignIn(provider.id)}
            >
              <svg
                className="mr-2 h-4 w-4"
                aria-hidden="true"
                focusable="false"
                data-prefix="fab"
                data-icon="google"
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 488 512"
              >
                <path
                  fill="currentColor"
                  d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h240z"
                ></path>
              </svg>
              Sign in with {provider.name}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
} 