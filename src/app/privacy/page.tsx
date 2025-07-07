'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { markdownToHtmlWeb } from '@/lib/markdown';

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrivacyPolicy = async () => {
      try {
        setLoading(true);
        
        // Fetch the markdown content
        const response = await fetch('/legal/PRIVACY_POLICY.md');
        if (!response.ok) {
          throw new Error('Failed to load Privacy Policy');
        }
        
        let markdown = await response.text();
        
        // Get privacy email and company info from API
        const configResponse = await fetch('/api/config/privacy-email');
        const config = configResponse.ok 
          ? await configResponse.json()
          : {
              email: 'privacy@yourcompany.com',
              company: {
                name: 'Your Company',
                address: '123 Main Street',
                city: 'Los Angeles',
                state: 'CA',
                zipCode: '90027',
                fullAddress: '123 Main Street, Los Angeles, CA 90027'
              }
            };
        
        // Replace placeholders
        markdown = markdown.replace(/\{\{PRIVACY_EMAIL\}\}/g, config.email);
        markdown = markdown.replace(/\{\{COMPANY_NAME\}\}/g, config.company.name);
        markdown = markdown.replace(/\{\{COMPANY_FULL_ADDRESS\}\}/g, config.company.fullAddress);
        
        // Convert markdown to HTML for web display
        const html = markdownToHtmlWeb(markdown);
        setContent(html);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    fetchPrivacyPolicy();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading Privacy Policy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold text-red-800 mb-4">Error Loading Privacy Policy</h1>
            <p className="text-red-700">{error}</p>
            <p className="mt-4">
              <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
                Return to Home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Privacy First Summary */}
      <Card className="mb-8 border-green-200 bg-green-50">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold text-green-800 mb-4">Privacy-First Design</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-100 text-green-800">✅</Badge>
              <span className="text-sm">Audio files processed in memory only</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-100 text-green-800">✅</Badge>
              <span className="text-sm">Transcripts not stored on servers</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-100 text-green-800">✅</Badge>
              <span className="text-sm">Only metadata logged, never content</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-100 text-green-800">✅</Badge>
              <span className="text-sm">Auto-delete accounts after 6 months</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-8">
          <div 
            className="prose prose-lg max-w-none
              prose-headings:text-foreground prose-p:text-foreground 
              prose-strong:text-foreground prose-li:text-foreground
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-h1:border-b prose-h1:pb-4 prose-h1:mb-8
              prose-h2:border-b prose-h2:pb-2 prose-h2:mb-6 prose-h2:mt-8
              prose-h3:mb-4 prose-h3:mt-6
              prose-ul:space-y-2 prose-ol:space-y-2
              prose-li:marker:text-blue-600
              prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded
              prose-pre:bg-gray-100 prose-pre:border
              prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:pl-4"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground border-t pt-6 mt-8">
        <p className="mt-4">
          <Link href="/terms" className="text-blue-600 hover:text-blue-800 underline">Terms of Service</Link>
          {' • '}
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 underline">Dashboard</Link>
          {' • '}
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">Home</Link>
        </p>
      </div>
    </div>
  );
} 