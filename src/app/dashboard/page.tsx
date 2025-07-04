import { getServerSession } from 'next-auth';
import { authOptions, getSessionUser } from '@/lib/auth';
import { getVoiceEventsByUser } from '@/lib/database';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatBytes, formatDuration } from '@/lib/utils';
import { getMailgunConfig } from '@/utils/env';

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
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {safeUser!.email}
        </p>
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

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>
            How to Send Voice Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">📱</div>
                <h3 className="font-semibold mb-2">Record</h3>
                <p className="text-sm text-muted-foreground">
                  Record voice note on your phone or computer
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">📧</div>
                <h3 className="font-semibold mb-2">Email</h3>
                <p className="text-sm text-muted-foreground">
                  Attach file and send to your alias
                </p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl mb-2">📝</div>
                <h3 className="font-semibold mb-2">Receive</h3>
                <p className="text-sm text-muted-foreground">
                  Get transcript back via email
                </p>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-blue-900">Guidelines for Best Results:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• File size: Under 10MB (15MB max)</li>
                <li>• Duration: Under 5 minutes for optimal speed</li>
                <li>• Formats: .m4a, .mp3, .wav, .ogg</li>
                <li>• Quality: Clear audio with minimal background noise</li>
                <li>• Language: English for best accuracy</li>
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