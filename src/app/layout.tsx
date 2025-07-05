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
    title: 'Echo Scribe - Free your voice notes—fast, private, copy-ready text',
    description: 'Transform WhatsApp voice notes into copy-paste text. Email your audio and get AI-ready transcripts back instantly. Private, fast, and no apps required.',
    icons: {
      icon: '/favicon.ico',
    },
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
        <div className="min-h-screen bg-background flex flex-col">
          <div className="flex-1">
            {children}
          </div>
          <footer className="border-t bg-background">
            <div className="container mx-auto px-4 py-3">
              <div className="text-center text-xs text-muted-foreground">
                <div className="mb-2">
                  Echo Scribe - Voice Note Transcription v1.0.2 • July 2025
                </div>
                <div className="space-x-4">
                  <a href="/privacy" className="hover:text-foreground underline">Privacy Policy</a>
                  <a href="/terms" className="hover:text-foreground underline">Terms of Service</a>
                  <a href="/contact" className="hover:text-foreground underline">Contact</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
} 