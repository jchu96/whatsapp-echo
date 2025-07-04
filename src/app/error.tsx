'use client';

// @ts-ignore
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // @ts-ignore
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    // @ts-ignore
    <div className="min-h-screen flex items-center justify-center bg-background">
      {/* @ts-ignore */}
      <div className="container max-w-lg mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {/* @ts-ignore */}
              <div className="flex items-center space-x-2">
                {/* @ts-ignore */}
                <div className="text-3xl">⚠️</div>
                {/* @ts-ignore */}
                <span>Something went wrong</span>
              {/* @ts-ignore */}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* @ts-ignore */}
            <div className="space-y-4">
              {/* @ts-ignore */}
              <p className="text-muted-foreground">
                We encountered an unexpected error. Please try again or contact support if the problem persists.
              {/* @ts-ignore */}
              </p>

              {isDevelopment && (
                // @ts-ignore
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  {/* @ts-ignore */}
                  <h4 className="font-semibold text-red-800 mb-2">Development Error Details:</h4>
                  {/* @ts-ignore */}
                  <p className="text-sm text-red-700 font-mono break-all">
                    {error.message}
                  {/* @ts-ignore */}
                  </p>
                  {error.digest && (
                    // @ts-ignore
                    <p className="text-xs text-red-600 mt-2">
                      Digest: {error.digest}
                    {/* @ts-ignore */}
                    </p>
                  )}
                {/* @ts-ignore */}
                </div>
              )}

              {/* @ts-ignore */}
              <div className="flex space-x-2">
                <Button onClick={reset}>
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = '/'}
                >
                  Go Home
                </Button>
              {/* @ts-ignore */}
              </div>
            {/* @ts-ignore */}
            </div>
          </CardContent>
        </Card>
      {/* @ts-ignore */}
      </div>
    {/* @ts-ignore */}
    </div>
  );
} 