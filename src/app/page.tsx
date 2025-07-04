// @ts-ignore
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// @ts-ignore
import { redirect } from 'next/navigation';
// @ts-ignore
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  // If user is authenticated, redirect to dashboard
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Voice Note Transcription Service
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Transform your voice notes into text with AI-powered transcription
        </p>
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-card p-6 rounded-lg border mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              🎯 How It Works
            </h2>
            <ul className="text-left space-y-2 mb-6">
              <li>✅ Sign in with your Google account</li>
              <li>✅ Get approved by an administrator</li>
              <li>✅ Send voice notes to your personal email</li>
              <li>✅ Receive transcriptions back instantly</li>
              <li>✅ View your history in the dashboard</li>
            </ul>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/auth/signin">
                  Get Started
                </Link>
              </Button>
              
              <Button variant="outline" size="lg" asChild>
                <Link href="/auth/signin">
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>
              New users require admin approval. Contact your administrator for access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 