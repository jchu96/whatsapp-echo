// @ts-ignore
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// @ts-ignore
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation Header */}
      <header className="absolute top-0 right-0 z-20 p-4">
        <div className="flex items-center space-x-4">
          {session ? (
            <Button asChild variant="ghost">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section with Immediate CTA */}
      <div className="container mx-auto px-4 py-16 relative">
        {/* Logo */}
        <div className="absolute top-0 left-4 md:left-8 z-10">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="relative w-24 h-14 md:w-32 md:h-20 transform group-hover:scale-105 transition-transform duration-200">
              <Image
                src="/images/logo.png"
                alt="Echo Scribe Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-8 -left-4 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="text-center mb-8">
          <span className="inline-block text-blue-600 text-sm font-semibold tracking-wider uppercase mb-4 animate-fade-in">
            Introducing
          </span>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-gradient-x">
            Echo Scribe
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed italic animate-fade-in-up mb-8">
            Free your voice notes—fast, private, copy-ready text.
          </p>

          {/* Immediate CTA */}
          <div className="max-w-2xl mx-auto mb-16 transform hover:scale-[1.01] transition-transform duration-300">
            <div className="bg-gradient-to-r from-blue-700 via-purple-700 to-blue-700 rounded-2xl shadow-xl p-8 md:p-12 text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/10 bg-[size:20px_20px] opacity-40"></div>
              <h2 className="text-3xl font-bold mb-4 relative text-white drop-shadow-md">That's really it</h2>
              <div className="text-2xl font-semibold mb-8 relative text-white/90">
                send voice note ➜ get clean, AI-ready text back
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center relative">
                {session ? (
                  <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold min-w-[160px] text-lg">
                    <Link href="/dashboard">
                      Go to Dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold min-w-[160px] text-lg">
                      <Link href="/auth/signin">
                        Get Started
                      </Link>
                    </Button>
                    <Button variant="outline" size="lg" asChild className="bg-blue-800/20 backdrop-blur-sm border-2 border-white text-white hover:bg-white hover:text-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold min-w-[160px] text-lg">
                      <Link href="/auth/signin">
                        Sign In
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Flicker Ventures Section - Moved up */}
        <div className="mb-16">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-32 h-12">
              <Image
                src="/images/flickerventures.png"
                alt="Flicker Ventures"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-sm text-gray-600">
              Built with ❤️ by Flicker Ventures
            </p>
          </div>
        </div>

        {/* Overview Section */}
        <div className="max-w-4xl mx-auto mb-16 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Overview</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              WhatsApp's built-in transcripts stay locked inside the app—you can't copy or paste them. 
              This service fixes that: email your voice note and get a fully copy-pastable transcript back in moments.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Key Features */}
              <div className="space-y-6">
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Turns your WhatsApp voice notes into free-to-use text</h3>
                    <p className="text-gray-600 text-sm">Forward or attach the audio (M4A, MP3, WAV, etc., up to ≈ 25 minutes) to the special address we give you.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-blue-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Copy-paste—and AI-ready—transcripts</h3>
                    <p className="text-gray-600 text-sm">The reply arrives as plain email text, ready to highlight, copy, drop into any document, or feed straight into your favourite AI engine.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-purple-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Fast turnaround</h3>
                    <p className="text-gray-600 text-sm">Most files come back in under a minute, already tidied up for easy reading.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-orange-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">No extra apps or tech know-how</h3>
                    <p className="text-gray-600 text-sm">Just send an email—no uploads, settings, or log-ins required.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-red-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Private by design, temporary by default</h3>
                    <p className="text-gray-600 text-sm">Built from the ground up for privacy: we log only minimal metadata, never see message content, and delete audio and transcript immediately after delivery.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="max-w-4xl mx-auto mb-16 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Great for…</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="group flex items-center space-x-3 hover:transform hover:translate-x-1 transition-transform duration-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                <span className="text-gray-700">Skimming long voice notes instead of listening</span>
              </div>
              <div className="group flex items-center space-x-3 hover:transform hover:translate-x-1 transition-transform duration-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                <span className="text-gray-700">Quoting parts of conversations in chats or docs</span>
              </div>
              <div className="group flex items-center space-x-3 hover:transform hover:translate-x-1 transition-transform duration-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                <span className="text-gray-700">Sending audio snippets to AI tools for summaries or chat</span>
              </div>
              <div className="group flex items-center space-x-3 hover:transform hover:translate-x-1 transition-transform duration-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                <span className="text-gray-700">Keeping searchable records of discussions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Note - Updated */}
        <div className="text-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto transform hover:scale-[1.01] transition-transform duration-300">
            <p className="text-sm text-yellow-800">
              Contact Jeremy for access approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 