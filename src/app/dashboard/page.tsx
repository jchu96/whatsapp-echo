// @ts-ignore
import { getServerSession } from 'next-auth';
import { authOptions, getSessionUser } from '@/lib/auth';
import { getVoiceEventsByUser } from '@/lib/database';
// @ts-ignore
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
  // @ts-ignore - user is checked for null above
  const safeUser = user;

  return (
    // @ts-ignore
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      {/* @ts-ignore */}
      <div>
        {/* @ts-ignore */}
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {/* @ts-ignore */}
                          <p className="text-muted-foreground">
            Welcome back, {safeUser!.email}
         {/* @ts-ignore */}
         </p>
      {/* @ts-ignore */}
      </div>

      {/* Status and Email Alias */}
      {/* @ts-ignore */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              Account Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* @ts-ignore */}
            <div className="space-y-2">
                             <Badge variant={safeUser!.approved ? "success" : "secondary"}>
                 {safeUser!.approved ? "Approved" : "Pending Approval"}
               </Badge>
               {!safeUser!.approved && (
                // @ts-ignore
                <p className="text-sm text-muted-foreground">
                  Your account is pending approval. You'll receive an email when approved.
                {/* @ts-ignore */}
                </p>
              )}
            {/* @ts-ignore */}
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
            {/* @ts-ignore */}
            <div className="space-y-2">
              {/* @ts-ignore */}
              <code className="text-sm bg-muted px-2 py-1 rounded block">
                {userEmailAlias}
              {/* @ts-ignore */}
              </code>
              {/* @ts-ignore */}
              <p className="text-sm text-muted-foreground">
                Send voice notes to this email address
              {/* @ts-ignore */}
              </p>
            {/* @ts-ignore */}
            </div>
          </CardContent>
        </Card>
      {/* @ts-ignore */}
      </div>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>
            How to Send Voice Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* @ts-ignore */}
          <div className="space-y-4">
            {/* @ts-ignore */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* @ts-ignore */}
              <div className="text-center p-4 border rounded-lg">
                {/* @ts-ignore */}
                <div className="text-2xl mb-2">📱</div>
                {/* @ts-ignore */}
                <h3 className="font-semibold mb-2">Record</h3>
                {/* @ts-ignore */}
                <p className="text-sm text-muted-foreground">
                  Record voice note on your phone or computer
                {/* @ts-ignore */}
                </p>
              {/* @ts-ignore */}
              </div>
              {/* @ts-ignore */}
              <div className="text-center p-4 border rounded-lg">
                {/* @ts-ignore */}
                <div className="text-2xl mb-2">📧</div>
                {/* @ts-ignore */}
                <h3 className="font-semibold mb-2">Email</h3>
                {/* @ts-ignore */}
                <p className="text-sm text-muted-foreground">
                  Attach file and send to your alias
                {/* @ts-ignore */}
                </p>
              {/* @ts-ignore */}
              </div>
              {/* @ts-ignore */}
              <div className="text-center p-4 border rounded-lg">
                {/* @ts-ignore */}
                <div className="text-2xl mb-2">📝</div>
                {/* @ts-ignore */}
                <h3 className="font-semibold mb-2">Receive</h3>
                {/* @ts-ignore */}
                <p className="text-sm text-muted-foreground">
                  Get transcript back via email
                {/* @ts-ignore */}
                </p>
              {/* @ts-ignore */}
              </div>
            {/* @ts-ignore */}
            </div>

            {/* Guidelines */}
            {/* @ts-ignore */}
            <div className="bg-blue-50 p-4 rounded-lg">
              {/* @ts-ignore */}
              <h4 className="font-semibold mb-2 text-blue-900">Guidelines for Best Results:</h4>
              {/* @ts-ignore */}
              <ul className="text-sm text-blue-800 space-y-1">
                {/* @ts-ignore */}
                <li>• File size: Under 10MB (15MB max)</li>
                {/* @ts-ignore */}
                <li>• Duration: Under 5 minutes for optimal speed</li>
                {/* @ts-ignore */}
                <li>• Formats: .m4a, .mp3, .wav, .ogg</li>
                {/* @ts-ignore */}
                <li>• Quality: Clear audio with minimal background noise</li>
                {/* @ts-ignore */}
                <li>• Language: English for best accuracy</li>
              {/* @ts-ignore */}
              </ul>
            {/* @ts-ignore */}
            </div>
          {/* @ts-ignore */}
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
            // @ts-ignore
            <div className="text-center py-8 text-muted-foreground">
              {/* @ts-ignore */}
              <div className="text-4xl mb-4">🎤</div>
              {/* @ts-ignore */}
              <p>No voice notes yet</p>
              {/* @ts-ignore */}
              <p className="text-sm">Send your first voice note to get started!</p>
            {/* @ts-ignore */}
            </div>
          ) : (
            // @ts-ignore
            <div className="space-y-4">
              {events.map((event: any, index: number) => (
                // @ts-ignore
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                  {/* @ts-ignore */}
                  <div className="space-y-1">
                    {/* @ts-ignore */}
                    <div className="font-medium">
                      Voice Note #{events.length - index}
                    {/* @ts-ignore */}
                    </div>
                    {/* @ts-ignore */}
                    <div className="text-sm text-muted-foreground">
                      {formatDate(event.received_at)}
                    {/* @ts-ignore */}
                    </div>
                  {/* @ts-ignore */}
                  </div>
                  {/* @ts-ignore */}
                  <div className="text-right space-y-1">
                    {event.duration_sec && (
                      // @ts-ignore
                      <div className="text-sm">
                        {formatDuration(event.duration_sec)}
                      {/* @ts-ignore */}
                      </div>
                    )}
                    {event.bytes && (
                      // @ts-ignore
                      <div className="text-sm text-muted-foreground">
                        {formatBytes(event.bytes)}
                      {/* @ts-ignore */}
                      </div>
                    )}
                  {/* @ts-ignore */}
                  </div>
                {/* @ts-ignore */}
                </div>
              ))}
            {/* @ts-ignore */}
            </div>
          )}
        </CardContent>
      </Card>
    {/* @ts-ignore */}
    </div>
  );
} 