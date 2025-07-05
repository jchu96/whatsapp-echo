import { getServerSession } from 'next-auth';
import { authOptions, getSessionUser } from '@/lib/auth';
import { getVoiceEventsByUser } from '@/lib/database';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatBytes, formatDuration } from '@/lib/utils';
import { getMailgunConfig } from '@/utils/env';
import { SignOutButton } from '@/components/auth/signout-button';
import Link from 'next/link';

interface DashboardPageProps {
  searchParams: {
    page?: string;
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin');
  }

  const user = getSessionUser(session);
  if (!user) {
    redirect('/auth/signin');
  }

  // Parse pagination parameters
  const currentPage = parseInt(searchParams.page || '1');
  const itemsPerPage = 10;

  // Fetch user's voice events with pagination
  const eventsResult = await getVoiceEventsByUser(user!.id, currentPage, itemsPerPage);
  const events = eventsResult.success ? eventsResult.data : [];
  const pagination = eventsResult.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
  
  const config = getMailgunConfig();
  const userEmailAlias = `${user!.slug}@${config.domain}`;
  
  // For TypeScript null safety
  const safeUser = user;

  // Helper function to get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

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

      {/* Status, Email Alias, and Account Management */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant={Boolean(safeUser!.approved) ? "default" : "secondary"}>
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

        <Card>
          <CardHeader>
            <CardTitle>
              Account Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Need to delete your account?</p>
                <Badge variant="secondary" className="mb-2">
                  Coming Soon - Account Deletion
                </Badge>
                <p className="text-xs">
                  Full account deletion functionality will be available soon to comply with privacy regulations.
                </p>
              </div>
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

      {/* Voice Events History with Table and Pagination */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Voice Notes History
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Total: {pagination.total} voice notes
            </div>
          </div>
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
              {/* Voice Notes Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event: any, index: number) => {
                      const voiceNoteNumber = pagination.total - ((currentPage - 1) * itemsPerPage) - index;
                      return (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">
                            #{voiceNoteNumber}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                {formatDate(event.received_at)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {event.duration_sec ? formatDuration(event.duration_sec) : '-'}
                          </TableCell>
                          <TableCell>
                            {event.bytes ? formatBytes(event.bytes) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(event.status)}>
                              {event.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {event.processing_type ? (
                              <span className="text-sm capitalize">{event.processing_type}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} voice notes
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Previous Page */}
                    {currentPage > 1 && (
                      <Link href={`/dashboard?page=${currentPage - 1}`}>
                        <Button variant="outline" size="sm">
                          ← Previous
                        </Button>
                      </Link>
                    )}
                    
                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const startPage = Math.max(1, currentPage - 2);
                        const pageNumber = startPage + i;
                        
                        if (pageNumber > pagination.totalPages) return null;
                        
                        return (
                          <Link key={pageNumber} href={`/dashboard?page=${pageNumber}`}>
                            <Button 
                              variant={pageNumber === currentPage ? "default" : "outline"} 
                              size="sm"
                              className="w-8 h-8 p-0"
                            >
                              {pageNumber}
                            </Button>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Next Page */}
                    {currentPage < pagination.totalPages && (
                      <Link href={`/dashboard?page=${currentPage + 1}`}>
                        <Button variant="outline" size="sm">
                          Next →
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 