'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface ApiKeyCardProps {
  apiKey: string;
  isAdmin?: boolean;
  userEmail?: string;
}

export function ApiKeyCard({ apiKey, isAdmin, userEmail }: ApiKeyCardProps) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy API key:', error);
    }
  };

  const maskedKey = `${apiKey.slice(0, 8)}${'•'.repeat(16)}${apiKey.slice(-8)}`;
  const shortcutUrl = process.env.NEXT_PUBLIC_IOS_SHORTCUT || '#';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📱 iOS Shortcut API Key
            {isAdmin && userEmail && (
              <Badge variant="secondary" className="text-xs">
                Admin View: {userEmail}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* API Key Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Your Personal API Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-gray-100 px-3 py-2 rounded border font-mono break-all">
                  {revealed ? apiKey : maskedKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRevealed(!revealed)}
                  className="whitespace-nowrap"
                >
                  {revealed ? '👁️ Hide' : '👁️ Show'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyKey}
                  className="whitespace-nowrap"
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </Button>
              </div>
            </div>

            {/* iOS Shortcut Download */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                iOS Shortcut Integration
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={shortcutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                >
                  ⬇️ Download Shortcut
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInstructions(true)}
                  className="whitespace-nowrap"
                >
                  📖 Setup Instructions
                </Button>
              </div>
              <p className="text-sm text-gray-600">
                One-tap voice transcription from your iPhone
              </p>
            </div>

            {/* Usage Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-2 text-blue-900">🚀 Quick Setup:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Download the iOS Shortcut using the button above</li>
                <li>Click "Setup Instructions" to see how to configure your API key</li>
                <li>Record voice notes directly from your iPhone</li>
                <li>Get instant transcriptions without opening any app</li>
              </ol>
            </div>

            {/* Technical Details */}
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                🔧 Advanced: API Usage
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded border text-xs space-y-2">
                <div>
                  <strong>Endpoint:</strong> <code>POST /api/transcribe</code>
                </div>
                <div>
                  <strong>Auth:</strong> <code>Authorization: Bearer {revealed ? apiKey : '&lt;your-api-key&gt;'}</code>
                </div>
                <div>
                  <strong>Body:</strong> <code>multipart/form-data</code> with <code>file</code> field
                </div>
                <div>
                  <strong>Response:</strong> <code>{"{"}"text": "transcribed content"{"}"}</code>
                </div>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">iOS Shortcut Setup Instructions</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInstructions(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  After downloading the shortcut, you'll need to paste your API key in the configuration. 
                  Here's where to add it:
                </p>
                <div className="relative">
                  <Image
                    src="/images/PasteAPIHere.png"
                    alt="iOS Shortcut API Key Setup Instructions"
                    width={600}
                    height={999}
                    className="w-full h-auto rounded border"
                    style={{ maxHeight: '60vh', objectFit: 'contain' }}
                  />
                </div>
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>Tip:</strong> Copy your API key above, then paste it in the "Text" field shown in the image.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 