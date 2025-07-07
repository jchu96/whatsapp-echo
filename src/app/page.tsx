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
      {/* Friends & Family Banner */}
      <div className="bg-blue-50/80 border-b border-blue-200/50 px-4 py-2">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-blue-700">
            <span className="mr-1">👋</span>
            <span className="hidden sm:inline">Personal project for friends & family — interested in trying it? Just reach out to Jeremy!</span>
            <span className="sm:hidden">Personal project for friends & family — reach out to Jeremy!</span>
          </p>
        </div>
      </div>

      {/* Navigation Header */}
      <nav className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="relative w-20 h-12 transform group-hover:scale-105 transition-transform duration-200">
                <Image
                  src="/images/logo.png"
                  alt="Echo Scribe Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/jchu96/whatsapp-echo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 group"
              >
                <div className="relative w-5 h-5 transform group-hover:scale-110 transition-transform duration-200">
                  <Image
                    src="/images/github.png"
                    alt="GitHub"
                    fill
                    className="object-contain"
                  />
                </div>
              </a>
              
              {session ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Immediate CTA */}
      <div className="container mx-auto px-4 py-16 relative">
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
            Free your voice notes—fast, private, copy-ready text powered by OpenAI Whisper.
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

        {/* Three Unified Badges Section */}
        <div className="mb-16">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Flicker Ventures Badge */}
              <div className="flex flex-col items-center justify-center space-y-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="relative w-28 h-10">
                  <Image
                    src="/images/flickerventures.png"
                    alt="Flicker Ventures"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">Built with ❤️</div>
                  <div className="text-xs text-gray-600">by Flicker Ventures</div>
                </div>
              </div>

              {/* OpenAI Whisper Badge */}
              <div className="flex flex-col items-center justify-center space-y-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="relative w-20 h-5">
                  <Image
                    src="/images/OpenAI_Logo.svg"
                    alt="OpenAI"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">Powered by Whisper-1</div>
                  <div className="text-xs text-gray-600">99%+ accuracy</div>
                </div>
              </div>

              {/* GitHub Open Source Badge */}
              <div className="flex flex-col items-center justify-center space-y-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-6">
                <a
                  href="https://github.com/jchu96/whatsapp-echo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center space-y-3 group w-full"
                >
                  <div className="relative w-7 h-7 transform group-hover:scale-110 transition-transform duration-200">
                    <Image
                      src="/images/github.png"
                      alt="GitHub"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">Open Source</div>
                    <div className="text-xs text-gray-600">View on GitHub</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="max-w-4xl mx-auto mb-16 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Overview</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              WhatsApp's built-in transcripts stay locked inside the app—you can't copy or paste them. 
              This service fixes that: email your voice note or use our iOS Shortcut and get a fully copy-pastable transcript back in moments using OpenAI's industry-leading Whisper-1 model.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Key Features */}
              <div className="space-y-6">
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Always Instant + Optional AI Enhancements</h3>
                    <p className="text-gray-600 text-sm">Get your instant transcript first (15-30 seconds), then choose from AI-powered cleanup, summaries, or both. Works via email or iOS Shortcut.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-blue-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Copy-paste—and AI-ready—transcripts</h3>
                    <p className="text-gray-600 text-sm">Instant transcripts are immediately usable. Enhanced versions include cleaned formatting, grammar fixes, and intelligent summaries—all ready for documents or AI tools.</p>
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
                    <p className="text-gray-600 text-sm">Just send an email or use the iOS Shortcut—no uploads, settings, or complex setup required. Configure your enhancement preferences once in the dashboard.</p>
                  </div>
                </div>
                
                <div className="group flex items-start space-x-4 hover:transform hover:translate-x-1 transition-transform duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <span className="text-red-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Fast & Reliable Processing</h3>
                    <p className="text-gray-600 text-sm">Instant transcripts arrive in 15-30 seconds. Enhanced versions follow in background processing, ensuring you never wait for basic transcription.</p>
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
                Always get your instant OpenAI Whisper transcript first, then choose which AI enhancements you want. Use email or iOS Shortcut—each version is delivered clearly labeled.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-xl border border-blue-200">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <span className="text-green-600 font-bold text-xl">📝</span>
                </div>
                <h3 className="font-bold text-lg mb-3 text-gray-900">Instant Transcript</h3>
                <p className="text-gray-600 text-sm mb-3">OpenAI Whisper-1 transcription in 15-30 seconds</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>• Industry-leading accuracy</div>
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
                  <div className="text-xs text-gray-600">OpenAI Whisper processing</div>
                </div>
                <div className="group">
                  <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">⚡</div>
                  <div className="text-sm font-semibold mb-1">Get Instant (15-30s)</div>
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

        {/* iOS Shortcut Showcase Section */}
        <div className="max-w-4xl mx-auto mb-16 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 backdrop-blur-sm rounded-2xl shadow-xl p-8 md:p-12 border border-orange-200">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <span className="text-orange-600 text-3xl">📱</span>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-gray-900">iOS Shortcut Integration</h2>
              <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                One-tap voice transcription directly from your iPhone. Record from anywhere, get instant text—no app switching required.
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Demo Video */}
              <div className="order-2 lg:order-1">
                <div className="relative bg-white rounded-2xl shadow-lg p-4 max-w-xs mx-auto">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-auto rounded-xl shadow-lg"
                    style={{ aspectRatio: '222/480' }}
                  >
                    <source src="/images/VoiceNoteForwardDemo.mp4" type="video/mp4" />
                    <Image
                      src="/images/VoiceNoteForwarding.gif"
                      alt="Voice Note Forwarding Demo"
                      width={222}
                      height={480}
                      className="w-full h-auto rounded-xl"
                    />
                  </video>
                  <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    Live Demo
                  </div>
                </div>
              </div>
              
              {/* Features */}
              <div className="order-1 lg:order-2 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold text-sm">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Receive Voice Note</h3>
                      <p className="text-gray-600 text-sm">Get a voice message in any app (WhatsApp, iMessage, etc.)</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold text-sm">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Share via Shortcut</h3>
                      <p className="text-gray-600 text-sm">Tap share button, select "Echo Scribe" shortcut</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 font-bold text-sm">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Instant Transcription</h3>
                      <p className="text-gray-600 text-sm">Get clean, copy-ready text in 15-30 seconds</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-orange-200">
                  <h3 className="font-bold text-lg text-gray-900 mb-3">What You Get</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>Personal API key for secure access</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>One-click shortcut download</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>Visual setup instructions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">✓</span>
                      <span>Same privacy guarantees as email</span>
                    </div>
                  </div>
                </div>
                
                {session ? (
                  <Button asChild size="lg" className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                    <Link href="/dashboard">
                      Get Your iOS Shortcut
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                    <Link href="/auth/signin">
                      Sign Up for iOS Shortcut
                    </Link>
                  </Button>
                )}
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

        {/* Access Note */}
        <div className="max-w-2xl mx-auto transform hover:scale-[1.01] transition-transform duration-300">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <span className="text-blue-600 font-bold text-xl">👋</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Personal project for friends & family</h3>
            <p className="text-gray-600">
              Reach out to Jeremy for approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 