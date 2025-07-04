// @ts-ignore
import { getServerSession } from 'next-auth';
import { authOptions, getSessionUser } from '@/lib/auth';
// @ts-ignore
import { redirect } from 'next/navigation';
// @ts-ignore
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignOutButton } from '@/components/auth/signout-button';

export default async function ApprovalPendingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  const user = getSessionUser(session);
  if (!user) {
    redirect('/auth/signin');
  }

  // If user is already approved, redirect to dashboard
  if (Boolean(user.approved)) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Account Approval Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
              
              <p className="text-muted-foreground mb-4">
                Your account is currently pending approval from an administrator.
              </p>
              
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <p className="text-sm">
                  <strong>Your email:</strong> {user.email}
                </p>
                <p className="text-sm mt-1">
                  <strong>Status:</strong> Pending Approval
                </p>
              </div>
              
              <p className="text-sm text-muted-foreground mb-6">
                You will receive an email notification once your account has been approved.
                This usually takes 1-2 business days.
              </p>
              
              <div className="space-y-2">
                <SignOutButton />
                
                <Button variant="outline" asChild className="w-full">
                  <a href="mailto:admin@example.com">
                    Contact Support
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 