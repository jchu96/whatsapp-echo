# Changelog

## v1.03 (2025-07-07)

- **iOS Shortcut API Integration**: Added permanent API keys for every user enabling direct iOS Shortcut integration
- **Programmatic API Endpoint**: New `/api/transcribe` endpoint with Bearer token authentication for developers
- **API Key Management**: Secure 32-character hex API keys with automatic generation and dashboard management
- **Enhanced Dashboard**: Added API key card with copy/reveal functionality and iOS shortcut download button
- **Database Migration**: Added `api_key` column to users table with automatic backfill for existing users
- **Rate Limiting Integration**: API endpoints use existing webhook rate limiting (5 requests/minute per user)
- **Privacy-First API**: Same zero-logging policy as email processing with JSON-only responses
- **Developer Experience**: Complete API documentation with curl examples and error handling

## v1.0.2 (2025-07-05)

- **Documentation Enhancement**: Comprehensive review and alignment of README and Architecture documentation
- **Project Structure Verification**: Confirmed all components, features, and integrations are properly documented
- **Security Policy Updates**: Verified all security measures and privacy guarantees are accurately documented
- **Deployment Guide Consistency**: Ensured all deployment instructions are complete and accurate
- **Development Workflow Optimization**: Confirmed all development modes and testing procedures are documented

## v1.01 (2025-07-05)

- **Beautiful HTML Email Templates for Enhancements**: Enhanced emails (cleaned, summary, quick summary) now use modern, styled HTML templates for a much better reading experience
- **Markdown Rendering for Summaries**: Summaries and quick summaries are now delivered as formatted HTML, not plain text. Markdown is converted to HTML using the Showdown library
- **Showdown Integration**: Added Showdown for robust markdown-to-HTML conversion in all enhancement emails
- **New Markdown Utility**: Added `src/lib/markdown.ts` for reusable, secure markdown-to-HTML conversion across the codebase
- **Consistent Branding**: All enhancement emails now match the look and feel of other system emails
- **Improved User Experience**: Enhanced emails are easier to read, with clear sections, bullet points, and action items
