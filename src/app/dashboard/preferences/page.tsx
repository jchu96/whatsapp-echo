'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UserPreferences {
  send_cleaned_transcript: boolean;
  send_summary: boolean;
}

interface PreferencesResponse {
  success: boolean;
  data: UserPreferences & { user_id: string };
  error?: string;
}

export default function PreferencesPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences>({
    send_cleaned_transcript: false,
    send_summary: false
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/preferences');
      const data: PreferencesResponse = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin');
          return;
        }
        throw new Error(data.error || 'Failed to load preferences');
      }
      
      if (data.success && data.data) {
        setPreferences({
          send_cleaned_transcript: data.data.send_cleaned_transcript,
          send_summary: data.data.send_summary
        });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preferences');
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setError(error instanceof Error ? error.message : 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setSaved(false); // Reset saved state when changes are made
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Voice Note Preferences</h1>
          <p className="text-muted-foreground mt-2">
            Customize how your voice notes are processed and delivered.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 font-medium">Error</div>
            <div className="text-red-700 text-sm mt-1">{error}</div>
            <Button 
              onClick={fetchPreferences} 
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Processing Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Always Raw Section */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <input 
                  type="checkbox" 
                  checked 
                  disabled 
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-blue-900">Raw Transcript (Always Included)</div>
                  <div className="text-sm text-blue-700 mt-1">
                    Get the transcript exactly as transcribed - sent immediately in ~15-30 seconds
                  </div>
                  <div className="text-xs text-blue-600 mt-2 p-2 bg-blue-100 rounded italic">
                    Example: "um, so I was thinking about, you know, the project and how we should, like, approach the timeline..."
                  </div>
                </div>
              </div>
            </div>

            {/* Optional Enhancements */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Optional Enhancements
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (sent as additional emails)
                </span>
              </h3>
              
              <div className="space-y-4">
                {/* Cleaned Transcript Option */}
                <div className={`border rounded-lg p-4 transition-all cursor-pointer hover:bg-gray-50 ${
                  preferences.send_cleaned_transcript ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}>
                  <label className="cursor-pointer">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={preferences.send_cleaned_transcript}
                        onChange={(e) => updatePreference('send_cleaned_transcript', e.target.checked)}
                        className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Cleaned Transcript</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Improved grammar, punctuation, and formatting (delivered in ~30-60 seconds)
                        </div>
                        <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded italic">
                          Example: "So I was thinking about the project and how we should approach the timeline. We need to consider the current pace and whether it might delay the launch."
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Summary Option */}
                <div className={`border rounded-lg p-4 transition-all cursor-pointer hover:bg-gray-50 ${
                  preferences.send_summary ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}>
                  <label className="cursor-pointer">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={preferences.send_summary}
                        onChange={(e) => updatePreference('send_summary', e.target.checked)}
                        className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Summary</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Concise summary with key points and action items (delivered in ~30-60 seconds)
                        </div>
                        <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-100 rounded italic">
                          Example: "<strong>Main topic:</strong> Project timeline discussion<br/>
                          <strong>Key points:</strong><br/>
                          • Current pace may delay launch<br/>
                          • Need team input on approach<br/>
                          <strong>Action items:</strong><br/>
                          • Schedule team meeting this week"
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Save Section */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {(() => {
                    const emailCount = 1 + (preferences.send_cleaned_transcript ? 1 : 0) + (preferences.send_summary ? 1 : 0);
                    return `You'll receive ${emailCount} email${emailCount === 1 ? '' : 's'} per voice note`;
                  })()}
                </div>
                <div className="flex items-center space-x-3">
                  {saved && (
                    <span className="text-green-600 text-sm font-medium">✓ Saved!</span>
                  )}
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className={saving ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">📋 How it works:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Raw transcript</strong> arrives in your inbox within 15-30 seconds</li>
                <li>• <strong>Enhanced versions</strong> (if enabled) arrive in separate emails within 30-60 seconds</li>
                <li>• All emails are clearly labeled so you know which version you're reading</li>
                <li>• Changes apply to new voice notes only</li>
                <li>• You can enable both enhancements for maximum value</li>
              </ul>
            </div>

            {/* Back to Dashboard */}
            <div className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard')}
              >
                ← Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 