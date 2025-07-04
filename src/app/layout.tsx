import './globals.css';
import React from 'react';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export function generateMetadata(): Metadata {
  // Conditionally get Sentry trace data only in production
  const getSentryTraceData = () => {
    if (process.env.NODE_ENV === 'production') {
      try {
        // Dynamic import to avoid Edge Runtime issues in development
        const Sentry = require('@sentry/nextjs');
        return Sentry.getTraceData();
      } catch (error) {
        console.warn('Failed to get Sentry trace data:', error);
        return {};
      }
    }
    return {};
  };

  return {
    title: 'Voice Note Transcription Service',
    description: 'A Next.js 14 application for voice note transcription with Google authentication and Cloudflare D1 database integration.',
    other: {
      ...getSentryTraceData()
    }
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  );
} 