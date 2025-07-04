// @ts-ignore
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-destructive">
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                {getErrorMessage(error)}
              </p>
              
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/auth/signin">
                    Try Sign In Again
                  </Link>
                </Button>
                
                <Button variant="outline" asChild className="w-full">
                  <Link href="/">
                    Go Home
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getErrorMessage(error?: string): string {
  switch (error) {
    case 'Configuration':
      return 'There is a problem with the server configuration. Please contact support.';
    case 'AccessDenied':
      return 'You do not have permission to sign in. Please contact an administrator.';
    case 'Verification':
      return 'The verification token has expired or has already been used. Please try signing in again.';
    case 'Default':
      return 'An unexpected error occurred during authentication. Please try again.';
    default:
      return 'An authentication error occurred. Please try signing in again.';
  }
} 