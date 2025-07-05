import { getServerSession } from 'next-auth';
import { authOptions, getSessionUser } from '@/lib/auth';
import { getVoiceEventsByUser } from '@/lib/database';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatBytes, formatDuration } from '@/lib/utils';
import { getMailgunConfig } from '@/utils/env';
import { SignOutButton } from '@/components/auth/signout-button';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  const user = getSessionUser(session);
  if (!user) {
    redirect('/auth/signin');
  }

  // Fetch user's voice events  
  const eventsResult = await getVoiceEventsByUser(user!.id, 1, 20);
  const events = eventsResult.success ? eventsResult.data : [];
  
  const config = getMailgunConfig();
  const userEmailAlias = `${user!.slug}@${config.domain}`;
  
  // For TypeScript null safety
  const safeUser = user;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {safeUser!.email}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/preferences">
            <Button variant="outline">
              ⚙️ Preferences
            </Button>
          </Link>
          <SignOutButton />
        </div>
      </div>

      {/* Status and Email Alias */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant={Boolean(safeUser!.approved) ? "success" : "secondary"}>
                {Boolean(safeUser!.approved) ? "Approved" : "Pending Approval"}
              </Badge>
              {!Boolean(safeUser!.approved) && (
                <p className="text-sm text-muted-foreground">
                  Your account is pending approval. You'll receive an email when approved.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Your Email Alias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <code className="text-sm bg-muted px-2 py-1 rounded block">
                {userEmailAlias}
              </code>
              <p className="text-sm text-muted-foreground">
                Send voice notes to this email address
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhancement Options */}
      <Card>
        <CardHeader>
          <CardTitle>
            ✨ AI-Powered Enhancement Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-3 text-blue-900">Always Raw + Optional Enhancements</h4>
              <p className="text-sm text-blue-800 mb-4">
                You always get your raw transcript first (15-30 seconds), then you can choose which AI enhancements to receive. 
                Each version arrives as a separate, clearly labeled email.
              </p>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white/80 rounded-lg border border-blue-100">
                  <div className="text-xl mb-2">📝</div>
                  <h5 className="font-semibold mb-1 text-sm">Raw Transcript</h5>
                  <p className="text-xs text-muted-foreground">Always sent first • Exactly as spoken • No AI changes</p>
                </div>
                <div className="text-center p-4 bg-white/80 rounded-lg border border-blue-100">
                  <div className="text-xl mb-2">✨</div>
                  <h5 className="font-semibold mb-1 text-sm">Cleaned Version</h5>
                  <p className="text-xs text-muted-foreground">Fixed grammar • Proper punctuation • Removed fillers</p>
                </div>
                <div className="text-center p-4 bg-white/80 rounded-lg border border-blue-100">
                  <div className="text-xl mb-2">📋</div>
                  <h5 className="font-semibold mb-1 text-sm">Smart Summary</h5>
                  <p className="text-xs text-muted-foreground">Key points • Action items • Important details</p>
                </div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-orange-900 mb-1">Configure Your Preferences</h4>
                  <p className="text-sm text-orange-800">
                    Choose which enhancements you want to receive for every voice note.
                  </p>
                </div>
                <Link href="/dashboard/preferences">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                    ⚙️ Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>
            How to Transcribe WhatsApp Voice Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">📱</div>
                <h3 className="font-semibold mb-2">Send Voice Note</h3>
                <p className="text-sm text-muted-foreground">
                  Forward from WhatsApp or attach to email
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-semibold mb-2">Get Raw (15-30s)</h3>
                <p className="text-sm text-muted-foreground">
                  Receive immediate raw transcript
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">🤖</div>
                <h3 className="font-semibold mb-2">AI Processing</h3>
                <p className="text-sm text-muted-foreground">
                  Background enhancement (if enabled)
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">📬</div>
                <h3 className="font-semibold mb-2">Receive Enhanced</h3>
                <p className="text-sm text-muted-foreground">
                  Get cleaned/summary versions separately
                </p>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-900">Guidelines for Best Results:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• File size: Under 10MB (15MB max)</li>
                <li>• Duration: Under 25 minutes for optimal processing</li>
                <li>• Formats: .m4a (WhatsApp standard), .mp3, .wav, .ogg</li>
                <li>• Quality: Original audio quality from WhatsApp</li>
                <li>• Language: English for best accuracy</li>
              </ul>
            </div>

            {/* WhatsApp Specific Tips */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-green-900">💡 Enhancement Tips:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Raw transcript arrives first - no waiting for enhancements</li>
                <li>• Enhanced versions follow in 30-60 seconds if enabled</li>
                <li>• Each enhancement arrives as a separate, labeled email</li>
                <li>• Configure preferences once - applies to all future voice notes</li>
                <li>• You can change enhancement preferences anytime</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Events History */}
      <Card>
        <CardHeader>
          <CardTitle>
            Recent Voice Notes ({events.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-4">🎤</div>
              <p>No voice notes yet</p>
              <p className="text-sm">Send your first voice note to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event: any, index: number) => (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">
                      Voice Note #{events.length - index}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(event.received_at)}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {event.duration_sec && (
                      <div className="text-sm">
                        {formatDuration(event.duration_sec)}
                      </div>
                    )}
                    {event.bytes && (
                      <div className="text-sm text-muted-foreground">
                        {formatBytes(event.bytes)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 