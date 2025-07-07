# WhatsApp Echo - Voice Note Transcription Service Architecture

**Revision Date:** July 7, 2025  
**Version:** 1.03  
**Status:** Production Ready with iOS Shortcut API Integration

---

## 🔄 1.03 Update: iOS Shortcut API Integration

**Release Date:** July 7, 2025

- **iOS Shortcut API Integration**: Added permanent API keys for every user enabling seamless iOS Shortcut integration for direct voice transcription
- **Programmatic API Endpoint**: New `/api/transcribe` endpoint with Bearer token authentication providing JSON responses for developers
- **API Key Management System**: Secure 32-character hex API keys with automatic generation, database storage, and dashboard management
- **Enhanced User Dashboard**: Added API key card component with copy/reveal functionality and iOS shortcut download button
- **Database Schema Enhancement**: Added `api_key` column to users table with unique constraint and automatic backfill for existing users
- **Authentication Layer**: New `auth-api-key.ts` module providing Bearer token validation and rate limiting integration
- **Middleware Updates**: Updated route protection to allow `/api/transcribe` endpoint with its own authentication system
- **Rate Limiting Integration**: API endpoints leverage existing webhook rate limiting system (5 requests/minute per user)
- **Privacy-First API Design**: Same zero-logging policy as email processing with JSON-only responses and no email side effects
- **Developer Experience**: Complete API documentation with curl examples, error handling, and usage instructions

## 🔄 1.0.2 Update: Documentation Enhancement & Verification

**Release Date:** July 5, 2025

- **Architecture Documentation Review**: Comprehensive review and verification of all system components and interactions
- **Component Inventory Verification**: Confirmed all frontend, backend, security, and infrastructure components are documented
- **Enhanced Error Handling Documentation**: Added documentation for the comprehensive error handling system with Sentry integration and user notification features
- **Data Flow Validation**: Verified all user registration, voice processing, and background enhancement flows are accurate
- **Security Architecture Review**: Confirmed all security measures, privacy protections, and risk assessments are current
- **Operational Considerations Update**: Verified scaling, resilience, observability, and cost optimization strategies

## 🔄 1.01 Update: Enhanced Email System & Markdown Rendering

**Release Date:** July 5, 2025

- **Beautiful HTML Email Templates for Enhancements**: All enhancement emails (cleaned, summary, quick summary) now use modern, styled HTML templates for a much better reading experience.
- **Markdown Rendering for Summaries**: Summaries and quick summaries are now delivered as formatted HTML, not plain text. Markdown is converted to HTML using the Showdown library.
- **Showdown Integration**: The Showdown library is used for robust markdown-to-HTML conversion in all enhancement emails, ensuring bullet points, headings, and formatting are preserved.
- **New Markdown Utility**: The new `src/lib/markdown.ts` utility provides secure, reusable markdown-to-HTML conversion for all enhancement emails.
- **Consistent Branding**: All enhancement emails now match the look and feel of other system emails.
- **Improved User Experience**: Enhanced emails are easier to read, with clear sections, bullet points, and action items.

---

## High-Level Overview

WhatsApp Echo is a production-ready voice note transcription service built with Next.js 14 that enables users to send audio files via email and receive AI-generated transcriptions with optional enhancements. The system uses a hybrid architecture combining Vercel's serverless platform for the web application with Cloudflare D1 for database services, OpenAI Whisper for transcription, and Mailgun for email processing. It features an innovative "Always Raw + Optional Enhancements" processing system with **background processing capabilities**, **iOS Shortcut API integration**, user preference management, comprehensive admin management, user approval workflows, and robust security measures optimized for the Vercel Hobby tier.

**iOS Shortcut Integration**: The system now provides permanent API keys for every user, enabling seamless iOS Shortcut integration for direct voice transcription. Users can record voice notes anywhere on their iPhone and receive instant JSON transcriptions without opening any app, using the secure `/api/transcribe` endpoint with Bearer token authentication.

**Privacy-First Design**: The architecture prioritizes user privacy with zero transcript content logging, in-memory-only audio processing, and no persistent storage of voice data. All transcript content is delivered directly via email or JSON response without being stored on servers, ensuring maximum privacy protection for sensitive voice communications.

**Background Processing Architecture**: The system implements a secure background processing system that separates raw transcription (immediate delivery) from enhancement processing (background execution), preventing serverless function timeouts while maintaining the "always raw" guarantee.

## Component Inventory

### Frontend Components
- **Next.js 14 App Router Application** - React-based web interface with SSR
- **Admin Dashboard** - User management interface with statistics and bulk operations
- **User Dashboard** - Personal voice note history and usage instructions with API key management
- **API Key Management Card** - React component for displaying, copying, and managing user API keys
- **User Preferences Page** - Interactive interface for managing enhancement preferences
- **Authentication Pages** - Google OAuth sign-in and error handling
- **UI Component Library** - shadcn/ui components with Tailwind CSS styling

### Backend Services
- **API Routes** - Next.js API routes for webhooks, admin operations, preferences, and auth
- **iOS Shortcut API Endpoint** - `/api/transcribe` endpoint with Bearer token authentication for programmatic access
- **API Key Authentication Service** - Bearer token validation and rate limiting for iOS Shortcut integration
- **User Preferences API** - RESTful endpoints for managing enhancement preferences
- **Smart Webhook Handler** - Processes inbound emails with always-raw + optional enhancements
- **Background Enhancement API** - Secure background processing for GPT-4.1 nano enhancements
- **Authentication Service** - NextAuth.js with Google OAuth integration
- **Database Layer** - Cloudflare D1 operations via REST API with preference management and API key storage
- **OpenAI Integration** - Whisper transcription + GPT-4.1 nano enhancement services
- **Multi-Email Service** - Mailgun SDK for sending raw transcripts and enhanced versions
- **Enhanced Error Handling** - `src/lib/enhanced-errors.ts` provides comprehensive error handling with Sentry integration, user notification, and metrics logging for production reliability
- **Markdown Utility** - `src/lib/markdown.ts` provides secure, reusable markdown-to-HTML conversion for all enhancement emails, leveraging Showdown for robust formatting.

### Security & Middleware
- **Route Protection Middleware** - Authentication and authorization enforcement with API endpoint bypass
- **API Key Authentication** - `src/lib/auth-api-key.ts` provides Bearer token validation for iOS Shortcut API
- **Rate Limiting System** - In-memory rate limiting with configurable windows for both webhook and API access
- **Security Headers** - CSRF protection, XSS prevention, and content security
- **Input Validation** - File type, size, and format validation for both email and API uploads
- **Error Handling** - Comprehensive error categorization and user feedback
- **Background API Security** - Token-based authentication for background processing
- **reCAPTCHA Integration** - v2 protection for contact forms against automated abuse

### Infrastructure & Configuration
- **Vercel Deployment** - Serverless hosting with function optimizations
- **Cloudflare D1 Database** - SQLite-based serverless database
- **Environment Management** - Centralized configuration with validation
- **Monitoring & Logging** - Sentry integration for error tracking
- **Database Migration** - Wrangler CLI for schema management

## Interaction Map

```mermaid
graph TB
    %% User interactions
    U[User] --> |Google OAuth| Auth[NextAuth.js]
    U --> |Sends voice email| MG[Mailgun]
    U --> |Views dashboard| WEB[Next.js Frontend]
    U --> |Manages preferences| PREFS[Preferences Page]
    
    %% Admin interactions  
    A[Admin] --> |Manages users| ADMIN[Admin Dashboard]
    A --> |Approval actions| API[Admin API]
    
    %% Email processing flow (Always Raw + Optional Enhancements)
    MG --> |Webhook| WH[Smart Webhook Handler]
    WH --> |Validates signature| SEC[Security Layer]
    WH --> |Looks up user| DB[Cloudflare D1]
    WH --> |Gets preferences| PREF_API[Preferences API]
    WH --> |Downloads audio| FILE[File Processing]
    FILE --> |Transcribes| WHISPER[OpenAI Whisper]
    WHISPER --> |Raw transcript| EMAIL[Email Service]
    EMAIL --> |Sends raw immediately| MG
    
    %% Background enhancement processing
    WH --> |Queues background| BG[Background Enhancement API]
    BG --> |Token validation| SEC
    BG --> |Re-transcribes| WHISPER
    BG --> |Enhances| GPT[GPT-4.1 nano]
    GPT --> |Cleanup/Summary| MD[Markdown Processor]
    MD --> |Showdown conversion| EMAIL[Email Service]
    EMAIL --> |Sends enhanced| MG
    
    %% Database operations
    Auth --> |User CRUD| DB
    API --> |User management| DB
    PREFS --> |Preferences CRUD| PREF_API
    PREF_API --> |Preference storage| DB
    WH --> |Voice event logging| DB
    BG --> |Enhancement tracking| DB
    
    %% Security layer
    MW[Middleware] --> |Rate limiting| RL[Rate Limiter]
    MW --> |Auth check| Auth
    MW --> |CSRF protection| SEC
    
    %% Monitoring
    WH --> |Error tracking| SENTRY[Sentry]
    API --> |Metrics| SENTRY
    BG --> |Enhancement metrics| SENTRY
    
    %% External services
    Auth --> |OAuth| GOOGLE[Google OAuth]
    EMAIL --> |SMTP| MG
    FILE --> |AI API| WHISPER
    GPT --> |LLM API| OPENAI[OpenAI API]
    
    subgraph "Vercel Edge"
        WEB
        PREFS
        API
        PREF_API
        WH
        BG
        Auth
        MW
    end
    
    subgraph "Cloudflare"
        DB
    end
    
    subgraph "External APIs"
        GOOGLE
        MG
        WHISPER
        OPENAI
        SENTRY
    end
```

## Runtime / Deployment View

### Vercel Serverless Functions
- **Edge Runtime**: Middleware for routing and authentication
- **Node.js Runtime**: API routes with 60-second timeout for webhook processing
- **Background Functions**: Separate serverless functions for enhancement processing
- **Static Generation**: Frontend pages with SSR for authenticated content
- **Regional Deployment**: Primary region `iad1` (US East)

### Database & Storage
- **Cloudflare D1**: SQLite database accessed via REST API
- **No File Storage**: Audio files processed in memory, not persisted
- **Session Storage**: JWT tokens managed by NextAuth.js
- **Status Tracking**: Enhanced voice_events table with processing status

### External Service Integration
- **Google OAuth**: Identity provider for authentication
- **Mailgun**: Email service for inbound webhooks and outbound notifications  
- **OpenAI Whisper**: AI transcription service with streaming support
- **Sentry**: Error monitoring and performance tracking

### Security Boundaries
- **TLS Termination**: Vercel Edge with automatic HTTPS
- **API Gateway**: Vercel's built-in request routing and rate limiting
- **CSRF Protection**: In-memory token validation
- **Input Sanitization**: File type and size validation before processing
- **Background API Security**: SHA256 token-based authentication

## Data Flow & Storage

### User Registration Flow
```mermaid
sequenceDiagram
    participant U as User
    participant G as Google OAuth
    participant A as NextAuth
    participant D as Database
    participant E as Email Service
    participant M as Admin
    
    U->>G: OAuth sign-in
    G->>A: User profile
    A->>D: Check existing user
    alt New user
        A->>D: Create user (pending)
        A->>E: Send admin notification
        E->>M: New user alert
        M->>D: Approve user
        D->>E: Send approval email
        E->>U: Account approved
    else Existing user
        A->>D: Return user data
        A->>U: Sign-in complete
    end
```

### Voice Processing Pipeline (Always Raw + Background Enhancements)
```mermaid
sequenceDiagram
    participant U as User
    participant M as Mailgun
    participant W as Smart Webhook
    participant D as Database  
    participant F as File Processor
    participant AI as OpenAI Whisper
    participant E as Email Service
    participant BG as Background Enhancement API
    participant GPT as GPT-4.1 nano
    
    U->>M: Email with voice attachment
    M->>W: Webhook with FormData
    W->>W: Verify signature
    W->>D: Look up user by slug
    W->>D: Get user preferences
    
    %% Always process raw transcript first
    W->>F: Validate audio file
    F->>AI: Transcribe audio (raw)
    AI->>F: Return raw transcript
    F->>D: Log voice event (status: processing)
    F->>E: Send raw transcript email
    E->>U: Raw transcript delivered (15-30s)
    
    %% Optional enhancements in background
    alt Enhancements enabled
        W->>BG: Queue background processing (non-blocking)
        BG->>BG: Validate authentication token
        BG->>AI: Re-transcribe audio
        AI->>BG: Return transcript
        
        par Cleanup enhancement
            BG->>GPT: Clean transcript
            GPT->>BG: Cleaned version
            BG->>E: Send cleaned email
            E->>U: Cleaned transcript (30-60s)
        and Summary enhancement
            BG->>GPT: Summarize transcript
            GPT->>BG: Summary version
            BG->>E: Send summary email
            E->>U: Summary transcript (30-60s)
        end
        
        BG->>D: Update enhancement status (completed)
    end
    
    note over W,AI: 55-second timeout (raw only)
    note over BG,GPT: Background processing (no timeout impact)
    note over F: In-memory processing only
```

### Database Schema
```sql
-- Users table with approval workflow and API key support
CREATE TABLE users (
  id           TEXT PRIMARY KEY,          -- cuid() identifier  
  google_email TEXT UNIQUE NOT NULL,     -- Google OAuth email
  slug         TEXT UNIQUE NOT NULL,      -- 6-char email alias
  api_key      TEXT UNIQUE NOT NULL,      -- 32-char hex API key for iOS Shortcut integration
  approved     INTEGER NOT NULL DEFAULT 0, -- 0=pending, 1=approved
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User preferences for enhancement options
CREATE TABLE user_preferences (
  user_id                   TEXT PRIMARY KEY,          -- Reference to users.id
  transcript_processing     TEXT DEFAULT 'raw',        -- Legacy: 'raw', 'cleanup', 'summary'
  send_cleaned_transcript   INTEGER DEFAULT 0,         -- 0=disabled, 1=enabled
  send_summary             INTEGER DEFAULT 0,         -- 0=disabled, 1=enabled
  created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Voice events metadata with enhancement tracking
CREATE TABLE voice_events (
  id                    TEXT PRIMARY KEY,          -- cuid() identifier
  user_id              TEXT NOT NULL,             -- Foreign key to users
  received_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_sec         INTEGER,                   -- Audio duration
  bytes                INTEGER,                   -- File size
  status               TEXT DEFAULT 'pending',    -- 'pending', 'processing', 'completed', 'failed'
  processing_type      TEXT DEFAULT 'raw',        -- 'raw', 'cleanup', 'summary', 'api'
  completed_at         DATETIME,                  -- When processing completed
  error_message        TEXT,                      -- Error details if failed
  enhancements_requested TEXT,                    -- JSON array of requested enhancements
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

## Tech Stack Table

| Component | Language/Framework | Infrastructure/Tooling |
|-----------|-------------------|------------------------|
| **Frontend** | TypeScript, React 18, Next.js 14 | Vercel Edge, Tailwind CSS |
| **Backend API** | TypeScript, Next.js API Routes | Vercel Serverless Functions |
| **iOS Shortcut API** | TypeScript, Next.js API Routes | Bearer token auth, multipart/form-data |
| **API Key Authentication** | TypeScript, Custom validation | 32-char hex keys, rate limiting |
| **Background Processing** | TypeScript, Next.js API Routes | Separate Vercel Functions |
| **Database** | SQL, SQLite | Cloudflare D1 via REST API |
| **Authentication** | NextAuth.js v4 | Google OAuth 2.0 |
| **Email Processing** | Mailgun SDK | Mailgun API, Webhook validation |
| **AI Transcription** | OpenAI SDK | Whisper-1 model via REST API |
| **AI Enhancement** | OpenAI SDK | GPT-4.1 nano model for cleanup/summary |
| **User Preferences** | TypeScript, React State | RESTful API with form validation |
| **Background Processing** | Node.js, Promise-based | Secure token-based authentication |
| **UI Components** | shadcn/ui, Radix UI | Tailwind CSS, CSS Modules |
| **Security** | Custom middleware | CSRF tokens, Rate limiting, Background API tokens, reCAPTCHA v2 |
| **Monitoring** | Sentry SDK | Error tracking, Performance monitoring |
| **Development** | TypeScript 5.6, ESLint | Wrangler CLI, Vercel CLI |
| **Deployment** | Vercel Projects | GitHub integration, Environment variables |

## Operational Considerations

### Scaling & Performance
- **Horizontal Scaling**: Vercel's automatic scaling for serverless functions
- **Database Scaling**: Cloudflare D1 scales automatically with usage
- **Rate Limiting**: Per-user limits prevent abuse (5 voice notes/minute)
- **Timeout Optimization**: 55-second processing window with 5-second safety margin
- **Memory Optimization**: In-memory audio processing to avoid disk I/O
- **Background Processing**: Separate functions prevent timeout issues

### Resilience & Reliability  
- **Error Recovery**: Comprehensive error categorization with user-friendly messages
- **Circuit Breaker**: Graceful degradation when external services fail
- **Retry Logic**: Mailgun webhooks automatically retry failed requests
- **Fallback Authentication**: Development mode continues with database failures
- **Input Validation**: Multi-layer validation prevents malformed requests
- **Background Processing**: Independent enhancement processing with status tracking

### Observability
- **Structured Logging**: Detailed console logs with request tracing
- **Error Tracking**: Sentry integration with source maps and user context
- **Performance Monitoring**: Function execution time and memory usage
- **Rate Limit Metrics**: In-memory statistics for monitoring abuse
- **Processing Analytics**: Success rates and timeout tracking
- **Status Tracking**: Database-based enhancement progress monitoring

### Security Measures
- **Authentication**: Google OAuth with JWT session management
- **Authorization**: Role-based access control (admin vs user)
- **Input Sanitization**: File type, size, and content validation  
- **Rate Limiting**: Per-endpoint limits with exponential backoff
- **Security Headers**: CSP, HSTS, XSS protection, clickjacking prevention
- **CSRF Protection**: Token-based request validation
- **Background API Security**: SHA256 token-based authentication for background processing
- **Webhook Security**: HMAC signature verification for Mailgun (implementation pending)
- **reCAPTCHA v2**: Contact form protection against automated abuse and spam bots

### Privacy Protection
- **Zero Content Logging**: Transcript content is NEVER logged to console, files, or monitoring systems
- **Metadata-Only Logging**: Only technical metadata (file size, processing time, success/failure) is logged
- **In-Memory Processing**: Audio files are processed entirely in memory without disk writes
- **No Transcript Storage**: Voice transcripts are not stored in database - only delivered via email
- **Error Safety**: Error objects contain only technical metadata (length, processing type), never transcript content
- **Privacy-First Design**: System architecture prioritizes user privacy over debugging convenience
- **Monitoring Exclusion**: Sentry error reporting excludes all transcript content and sensitive user data

### Cost Optimization
- **Vercel Hobby Tier**: Optimized for free tier limits (60-second functions)
- **Cloudflare D1**: Pay-per-use SQLite with generous free tier
- **No File Storage**: In-memory processing eliminates storage costs
- **Efficient Database Queries**: Indexed lookups and pagination
- **OpenAI Usage**: Optimized audio format recommendations to reduce costs
- **Background Processing**: Efficient use of serverless function quotas

## Open Questions / Risks

### Technical Risks
- **Function Timeout**: Large audio files (>10MB) may exceed 60-second Vercel limit
- **Memory Constraints**: Processing very large files could hit memory limits
- **Database Limits**: Cloudflare D1 has query limits that could affect scaling
- **Rate Limiting**: In-memory rate limiting doesn't persist across deployments
- **OpenAI Reliability**: Dependency on third-party AI service availability
- **Background Processing**: Potential for orphaned background processes

### Security Considerations
- **Email Security**: Mailgun webhook signature validation is critical (implementation pending)
- **User Data**: Voice transcripts are not stored but passed through system
- **Admin Access**: Admin email list is environment-based, not role-based
- **Session Security**: JWT tokens need proper rotation and expiration
- **Input Validation**: Audio file content validation beyond file type checking
- **Background API Security**: Token-based authentication requires secure key management
- **Contact Form Security**: reCAPTCHA v2 prevents automated abuse and spam submissions

### Operational Concerns
- **Monitoring Gaps**: Limited visibility into Cloudflare D1 performance
- **Backup Strategy**: No automated backup for D1 database
- **Disaster Recovery**: No multi-region deployment strategy
- **User Support**: No built-in help desk or support ticket system
- **Compliance**: No specific GDPR or data retention policies implemented
- **Background Processing Monitoring**: Limited visibility into background function execution

### Scalability Limitations
- **Single Region**: Vercel deployment limited to one region (`iad1`)
- **Database Contention**: SQLite may have concurrency limits at scale
- **Email Volume**: Mailgun webhook processing is sequential, not parallel
- **Admin Interface**: No bulk operations for large user datasets
- **Analytics**: Limited historical data retention and reporting
- **Background Processing**: No queue management for high-volume scenarios

### Future Architecture Considerations
- **Multi-region Deployment**: Consider edge deployment for global users
- **Database Migration**: Plan for potential move to PostgreSQL for scale
- **Caching Layer**: Add Redis for session and rate limit persistence
- **File Storage**: Consider temporary file storage for large audio processing
- **API Rate Limiting**: Implement distributed rate limiting for production scale
- **Queue Management**: Implement proper job queue for background processing
- **Webhook Security**: Complete Mailgun signature verification implementation

## Implementation Status

### ✅ Completed Features
- **Background Processing**: Secure token-based background enhancement API
- **Status Tracking**: Enhanced database schema with processing status
- **Token Authentication**: SHA256-based authentication for background API
- **Middleware Updates**: Background API route protection
- **Error Handling**: Comprehensive error handling for background processing
- **reCAPTCHA Integration**: v2 protection for contact forms with server-side verification

### 🔄 Pending Implementation
- **Webhook Signature Verification**: Complete Mailgun HMAC signature validation
- **Queue Management**: Implement proper job queue for high-volume scenarios
- **Background Monitoring**: Enhanced monitoring for background function execution
- **Retry Logic**: Implement retry mechanisms for failed background processing

### 🚀 Production Readiness
The system is production-ready with the current background processing implementation. The main remaining security enhancement is completing the webhook signature verification for Mailgun webhooks to ensure end-to-end security. 