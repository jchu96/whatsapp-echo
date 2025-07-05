# Security Policy

## 🔒 Security Overview

WhatsApp Echo is built with a **privacy-first architecture** that prioritizes user data protection and security. This document outlines our security measures, privacy protections, and how to report security vulnerabilities.

## 🛡️ Security Measures

### Authentication & Authorization
- **Google OAuth Integration**: Secure authentication using Google's OAuth 2.0 flow
- **JWT Session Management**: NextAuth.js handles secure session tokens
- **Role-Based Access Control**: Separate admin and user permissions
- **Token-Based Background API**: SHA256 authentication for background processing
- **CSRF Protection**: Token-based request validation for all forms

### Data Protection
- **Zero Transcript Logging**: Voice transcript content is NEVER logged to console, files, or monitoring systems
- **In-Memory Processing**: Audio files are processed entirely in memory without disk writes
- **No Persistent Storage**: Voice transcripts are not stored in database - only delivered via email
- **Metadata-Only Logging**: System logs contain only technical data (file size, processing time, success/failure)
- **Privacy-Safe Error Handling**: Error objects contain only technical metadata, never transcript content

### Input Validation & Sanitization
- **File Type Validation**: Strict audio format checking (M4A, MP3, WAV, OGG)
- **File Size Limits**: Maximum 15MB file size to prevent abuse
- **Email Format Validation**: Proper email address validation
- **SQL Injection Prevention**: Parameterized queries for all database operations
- **XSS Prevention**: Input sanitization and Content Security Policy headers

### Rate Limiting & Abuse Prevention
- **Per-User Rate Limiting**: 5 voice notes per minute per user
- **API Rate Limiting**: 100 requests per minute per IP for general APIs
- **Admin API Protection**: 30 requests per minute for admin operations
- **Authentication Rate Limiting**: 10 login attempts per 15 minutes per IP
- **In-Memory Rate Limiting**: Fast, efficient rate limiting with automatic cleanup

### Security Headers
- **Content Security Policy (CSP)**: Prevents XSS attacks
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Strict-Transport-Security**: Enforces HTTPS connections
- **X-XSS-Protection**: Browser XSS protection

### Infrastructure Security
- **TLS Encryption**: All connections use HTTPS with automatic certificate management
- **Environment Variable Protection**: All sensitive credentials stored in environment variables
- **Secure Background Processing**: Token-based authentication for background enhancement API
- **Webhook Security**: Mailgun HMAC signature verification (implementation pending)

## 🔐 Privacy Guarantees

### What We DON'T Store
- ❌ **Voice transcript content** - Never stored in database or logs
- ❌ **Audio files** - Processed in memory only, never written to disk
- ❌ **Sensitive user data** - Only metadata and account information stored
- ❌ **Processing content** - AI enhancement results not logged or stored

### What We DO Store
- ✅ **User account information** - Google email, approval status, created date
- ✅ **Processing metadata** - File size, duration, processing time, success/failure
- ✅ **User preferences** - Enhancement settings (cleanup, summary options)
- ✅ **Technical logs** - Performance metrics, error counts (no content)

### Privacy-First Design Principles
1. **Immediate Delivery**: Transcripts delivered via email, not stored on servers
2. **Memory-Only Processing**: Audio files processed entirely in memory
3. **Content Exclusion**: Monitoring systems (Sentry) exclude transcript content
4. **Minimal Data Collection**: Only essential metadata collected
5. **Automatic Cleanup**: In-memory data automatically garbage collected

## 🔍 Security Monitoring

### Error Tracking
- **Sentry Integration**: Error monitoring with transcript content exclusion
- **Performance Monitoring**: Function execution times and memory usage
- **Rate Limit Monitoring**: Abuse detection and prevention
- **Failed Authentication Tracking**: Login attempt monitoring

### Audit Logging
- **Database Operations**: All user and preference changes logged
- **Authentication Events**: Login/logout events tracked
- **Admin Actions**: User approval/revocation actions logged
- **Processing Metrics**: Voice note processing success/failure rates

## 🚨 Security Vulnerabilities

### Reporting Security Issues
If you discover a security vulnerability, please report it responsibly:

1. **Email**: Send details to the repository maintainer
2. **Do NOT**: Create public GitHub issues for security vulnerabilities
3. **Include**: Detailed description, reproduction steps, and potential impact
4. **Expect**: Acknowledgment within 48 hours and status updates

### What to Report
- Authentication bypass vulnerabilities
- Data exposure or privacy violations
- Injection attacks (SQL, XSS, etc.)
- Rate limiting bypass
- Token or session management issues
- File upload vulnerabilities

### What NOT to Report
- Issues requiring physical access to servers
- Social engineering attacks
- Denial of service attacks
- Issues in third-party dependencies (report to maintainers)

## 🛠️ Security Best Practices for Deployment

### Environment Variables
- **Use Strong Secrets**: Generate cryptographically secure keys
- **Rotate Regularly**: Change API keys and secrets periodically
- **Separate Environments**: Use different credentials for dev/staging/prod
- **Secure Storage**: Use Vercel's environment variable encryption

### Database Security
- **API Key Protection**: Secure Cloudflare D1 API keys
- **Access Control**: Limit database permissions to necessary operations
- **Regular Backups**: Implement automated database backups
- **Monitoring**: Monitor database access patterns

### API Security
- **HTTPS Only**: Never deploy without TLS encryption
- **Rate Limiting**: Implement appropriate rate limits for your use case
- **Input Validation**: Validate all inputs before processing
- **Authentication**: Secure all admin endpoints with proper authentication

### Monitoring & Alerting
- **Error Monitoring**: Set up Sentry alerts for critical errors
- **Performance Monitoring**: Monitor function execution times
- **Rate Limit Alerts**: Alert on unusual rate limiting patterns
- **Failed Authentication Alerts**: Monitor for brute force attempts

## 🔄 Security Updates

### Current Status
- ✅ **Background Processing**: Secure token-based authentication implemented
- ✅ **Privacy Audit**: Zero transcript logging verified
- ✅ **Input Validation**: Comprehensive validation implemented
- ✅ **Rate Limiting**: Production-ready rate limiting active
- 🔄 **Webhook Security**: Mailgun HMAC signature verification pending

### Planned Security Enhancements
- **Complete Webhook Signature Verification**: Implement full Mailgun HMAC validation
- **Advanced Rate Limiting**: Redis-based distributed rate limiting
- **Database Encryption**: Implement field-level encryption for sensitive data
- **Audit Logging**: Enhanced audit trail for all user actions
- **Security Scanning**: Automated vulnerability scanning integration

## 📋 Security Checklist for Administrators

### Pre-Deployment
- [ ] All environment variables configured with strong, unique values
- [ ] Google OAuth redirect URIs properly configured
- [ ] Mailgun webhook URLs use HTTPS
- [ ] Database API keys have minimal required permissions
- [ ] Admin email addresses verified and secure

### Post-Deployment
- [ ] HTTPS certificate automatically provisioned
- [ ] Rate limiting functioning correctly
- [ ] Error monitoring active and configured
- [ ] Authentication flow tested
- [ ] Admin dashboard access verified

### Ongoing Security
- [ ] Regular security updates applied
- [ ] Environment variables rotated quarterly
- [ ] Access logs reviewed monthly
- [ ] Error patterns monitored weekly
- [ ] Rate limiting effectiveness assessed monthly

## 🔧 Security Configuration Examples

### Strong NextAuth Secret Generation
```bash
# Generate a cryptographically secure secret
openssl rand -base64 32
```

### Secure Environment Variable Template
```env
# Use strong, unique values for all secrets
NEXTAUTH_SECRET=your-very-secure-random-32-character-secret
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
D1_API_KEY=your-cloudflare-d1-api-key
MAILGUN_API_KEY=your-mailgun-api-key
OPENAI_API_KEY=your-openai-api-key
```

### Rate Limiting Configuration
```typescript
// Example rate limit configuration
const rateLimits = {
  webhook: { requests: 5, window: 60 }, // 5 requests per minute per user
  adminAPI: { requests: 30, window: 60 }, // 30 requests per minute per admin
  generalAPI: { requests: 100, window: 60 }, // 100 requests per minute per IP
  auth: { requests: 10, window: 900 } // 10 attempts per 15 minutes per IP
};
```

## 📚 Additional Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **Next.js Security**: https://nextjs.org/docs/app/building-your-application/authentication
- **Vercel Security**: https://vercel.com/docs/security
- **Cloudflare D1 Security**: https://developers.cloudflare.com/d1/

## 📞 Contact

For security-related questions or concerns, please contact the repository maintainers through appropriate channels. Do not post security issues publicly.

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Review Schedule**: Quarterly security review and updates 