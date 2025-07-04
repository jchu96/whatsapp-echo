// @ts-ignore
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// @ts-ignore
import Link from 'next/link';

export default function NotFoundPage() {
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
                <div className="text-3xl">🔍</div>
                {/* @ts-ignore */}
                <span>Page Not Found</span>
              {/* @ts-ignore */}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* @ts-ignore */}
            <div className="space-y-4">
              {/* @ts-ignore */}
              <p className="text-muted-foreground">
                The page you're looking for doesn't exist or has been moved.
              {/* @ts-ignore */}
              </p>

              {/* @ts-ignore */}
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <Button asChild>
                  <Link href="/">
                    Go Home
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">
                    Dashboard
                  </Link>
                </Button>
              {/* @ts-ignore */}
              </div>

              {/* @ts-ignore */}
              <div className="text-sm text-muted-foreground">
                {/* @ts-ignore */}
                <p>Need help? Here are some helpful links:</p>
                {/* @ts-ignore */}
                <ul className="mt-2 space-y-1">
                  {/* @ts-ignore */}
                  <li>
                    <Link href="/dashboard" className="text-blue-600 hover:underline">
                      Dashboard - View your voice notes
                    </Link>
                  {/* @ts-ignore */}
                  </li>
                  {/* @ts-ignore */}
                  <li>
                    <Link href="/admin" className="text-blue-600 hover:underline">
                      Admin - Manage users (admin only)
                    </Link>
                  {/* @ts-ignore */}
                  </li>
                {/* @ts-ignore */}
                </ul>
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