import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

        {/* GitHub Section */}
        <div className="mb-16">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center space-x-3 group">
              <div className="relative w-8 h-8 transform group-hover:scale-110 transition-transform duration-200">
                <Image
                  src="/images/github.png"
                  alt="GitHub"
                  fill
                  className="object-contain"
                />
              </div>
              <a
                href="https://github.com/jchu96/whatsapp-echo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 hover:underline"
              >
                Open Source on GitHub
              </a>
            </div>
            <p className="text-xs text-gray-500 text-center">
              This project is open source and available on GitHub
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
                    <h3 className="font-semibold text-gray-900 mb-2">Always Raw + Optional AI Enhancements</h3>
                    <p className="text-gray-600 text-sm">Get your raw transcript first (15-30 seconds), then choose from AI-powered cleanup, summaries, or both. Each version arrives as a separate email.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-blue-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Copy-paste—and AI-ready—transcripts</h3>
                    <p className="text-gray-600 text-sm">Raw transcripts are instantly usable. Enhanced versions include cleaned formatting, grammar fixes, and intelligent summaries—all ready for documents or AI tools.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-purple-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Smart Enhancement Options</h3>
                    <p className="text-gray-600 text-sm">Choose <strong>Cleanup</strong> for grammar & formatting fixes, <strong>Summary</strong> for key points & action items, or both. All configurable in your dashboard preferences.</p>
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
                    <p className="text-gray-600 text-sm">Just send an email—no uploads, settings, or log-ins required. Configure your enhancement preferences once in the dashboard.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-red-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Fast & Reliable Processing</h3>
                    <p className="text-gray-600 text-sm">Raw transcripts arrive in 15-30 seconds. Enhanced versions follow in background processing, ensuring you never wait for basic transcription.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-indigo-600 font-bold">✓</span>
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

        {/* Enhancement Options Section */}
        <div className="max-w-4xl mx-auto mb-16 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-blue-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900">AI-Powered Enhancement Options</h2>
              <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                Always get your raw transcript first, then choose which AI enhancements you want. Each version arrives as a separate, clearly labeled email.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <span className="text-green-600 font-bold text-xl">📝</span>
                </div>
                <h3 className="font-bold text-lg mb-3 text-gray-900">Raw Transcript</h3>
                <p className="text-gray-600 text-sm mb-3">Always delivered first in 15-30 seconds</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>• Exactly as spoken</div>
                  <div>• Basic punctuation</div>
                  <div>• Immediate delivery</div>
                  <div>• No waiting</div>
                </div>
              </div>
              
              <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <span className="text-blue-600 font-bold text-xl">✨</span>
                </div>
                <h3 className="font-bold text-lg mb-3 text-gray-900">Cleaned Transcript</h3>
                <p className="text-gray-600 text-sm mb-3">Grammar & formatting improvements</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>• Fixed punctuation</div>
                  <div>• Proper capitalization</div>
                  <div>• Removed filler words</div>
                  <div>• Paragraph breaks</div>
                </div>
              </div>
              
              <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                  <span className="text-purple-600 font-bold text-xl">📋</span>
                </div>
                <h3 className="font-bold text-lg mb-3 text-gray-900">Summary</h3>
                <p className="text-gray-600 text-sm mb-3">Key points & action items extracted</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>• Main topic</div>
                  <div>• Key points</div>
                  <div>• Action items</div>
                  <div>• Important details</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
              <h3 className="font-bold text-lg text-gray-900 mb-3 text-center">How It Works</h3>
              <div className="grid md:grid-cols-4 gap-4 text-center">
                <div className="group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">📧</div>
                  <div className="text-sm font-semibold mb-1">Send Voice Note</div>
                  <div className="text-xs text-gray-600">Email your audio file</div>
                </div>
                <div className="group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">⚡</div>
                  <div className="text-sm font-semibold mb-1">Get Raw (15-30s)</div>
                  <div className="text-xs text-gray-600">Immediate transcript</div>
                </div>
                <div className="group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">🤖</div>
                  <div className="text-sm font-semibold mb-1">AI Processing</div>
                  <div className="text-xs text-gray-600">Background enhancements</div>
                </div>
                <div className="group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">📬</div>
                  <div className="text-sm font-semibold mb-1">Receive Enhanced</div>
                  <div className="text-xs text-gray-600">Separate labeled emails</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <div className="max-w-4xl mx-auto mb-16 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Perfect for…</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="group flex items-center space-x-3 hover:transform hover:translate-x-1 transition-transform duration-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                <span className="text-gray-700">Skimming long voice notes with instant summaries</span>
              </div>
              <div className="group flex items-center space-x-3 hover:transform hover:translate-x-1 transition-transform duration-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                <span className="text-gray-700">Getting clean, copy-pastable text for documents</span>
              </div>
              <div className="group flex items-center space-x-3 hover:transform hover:translate-x-1 transition-transform duration-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                <span className="text-gray-700">Extracting action items from meeting recordings</span>
              </div>
              <div className="group flex items-center space-x-3 hover:transform hover:translate-x-1 transition-transform duration-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                <span className="text-gray-700">Feeding enhanced transcripts to AI tools</span>
              </div>
              <div className="group flex items-center space-x-3 hover:transform hover:translate-x-1 transition-transform duration-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                <span className="text-gray-700">Keeping searchable records of voice conversations</span>
              </div>
              <div className="group flex items-center space-x-3 hover:transform hover:translate-x-1 transition-transform duration-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-150 transition-transform duration-200"></div>
                <span className="text-gray-700">Converting voice notes to structured text for emails</span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="max-w-4xl mx-auto mb-16 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-green-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900">Privacy-First by Design</h2>
              <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                Your voice notes are private. We built this service with privacy as the foundation, not an afterthought.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-green-600 font-bold">🚫</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Zero Content Logging</h3>
                    <p className="text-gray-600 text-sm">Your transcript content is NEVER logged to our servers, files, or monitoring systems. We only track technical metadata like file size and processing time.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-blue-600 font-bold">🧠</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Memory-Only Processing</h3>
                    <p className="text-gray-600 text-sm">Audio files are processed entirely in computer memory—never written to disk. Once transcribed and emailed, everything is automatically discarded.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-purple-600 font-bold">💾</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">No Data Storage</h3>
                    <p className="text-gray-600 text-sm">Voice transcripts are not stored in our database. We only keep processing metadata (duration, file size, timestamps) for system analytics.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-orange-600 font-bold">📧</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Direct Email Delivery</h3>
                    <p className="text-gray-600 text-sm">Transcripts are delivered straight to your email inbox. No cloud storage, no databases, no intermediate steps where your data could be compromised.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-red-600 font-bold">🛡️</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Error-Safe Design</h3>
                    <p className="text-gray-600 text-sm">Even when errors occur, only technical metadata is captured—never your voice content. Privacy protection extends to all error handling and monitoring.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-indigo-600 font-bold">⚡</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Instant Deletion</h3>
                    <p className="text-gray-600 text-sm">Audio files and transcript content are automatically deleted from our systems immediately after email delivery. Nothing lingers.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-green-200">
              <h3 className="font-bold text-lg text-gray-900 mb-3 text-center">Our Privacy Promise</h3>
              <p className="text-gray-700 text-center leading-relaxed">
                We designed this service from the ground up to <strong>never see your voice content</strong>. 
                Your conversations stay between you and your recipients—we're just the private, secure pipeline that gets your words to text.
              </p>
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