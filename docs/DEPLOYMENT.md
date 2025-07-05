# Production Deployment Guide

This guide covers deploying the Voice Note Transcription Service to production on Vercel Hobby tier with all Phase 1-3 features.

## 🎯 Deployment Overview

The application is optimized for **Vercel Hobby tier** with:
- 60-second function timeout limits
- In-memory rate limiting (no external dependencies)
- Serverless architecture with optimal cold start performance
- Production security headers and CSRF protection

## 🛠️ Prerequisites

### Required Accounts
1. **Vercel Account** (Hobby tier or higher)
2. **Google Cloud Platform** (for OAuth)
3. **Cloudflare Account** (for D1 database)
4. **OpenAI Account** (for Whisper API)
5. **Mailgun Account** (for email processing)

### Required Tools
```bash
# Install required CLI tools
npm install -g vercel wrangler
```

## 📋 Step-by-Step Deployment

### Step 1: Repository Setup
```bash
# Clone and prepare repository
git clone <your-repository-url>
cd whatsapp-echo
npm install

# Verify build works locally
npm run build
npm run type-check
```

### Step 2: Cloudflare D1 Database Setup

#### Create Database
```bash
# Login to Cloudflare
wrangler login

# Create production database
wrangler d1 create voice-transcription-prod

# Note the database ID from output
```

#### Initialize Schema
```bash
# Apply database schema
wrangler d1 execute voice-transcription-prod --file=./sql/schema.sql --remote

# Verify tables created
wrangler d1 execute voice-transcription-prod \
  --command="SELECT name FROM sqlite_master WHERE type='table';" --remote
```

#### Configure Wrangler for Database Management
```bash
# Create wrangler.toml for database management (not deployment)
# This file is used only for managing the D1 database
# The actual app deployment uses Vercel
```

#### Get Database Credentials
```bash
# Get account ID from Cloudflare dashboard
# Create API token with D1 permissions
# Format database URL:
# https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/d1/database/DATABASE_ID/query
```

### Step 3: Google OAuth Configuration

#### Create OAuth Application
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API and OAuth consent screen
4. Create OAuth 2.0 Client ID credentials
5. Configure authorized redirect URIs:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```

#### Configure OAuth Consent Screen
- Add your domain to authorized domains
- Set application name and logo
- Add privacy policy and terms of service URLs
- Submit for verification (if needed)

### Step 4: OpenAI API Setup

#### Get API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create API key with Whisper access
3. Set usage limits and monitoring
4. Test API access:
   ```bash
   curl -H "Authorization: Bearer sk-your-key" \
     "https://api.openai.com/v1/models" | grep whisper
   ```

### Step 5: Mailgun Email Service

#### Domain Setup
1. Add domain to Mailgun account
2. Configure DNS records (MX, TXT, CNAME)
3. Verify domain ownership
4. Get API credentials

#### Webhook Configuration
1. Set up inbound route pattern: `*@your-domain.com`
2. Configure webhook URL: `https://your-domain.vercel.app/api/inbound`
3. Set HTTP method to POST
4. Test webhook with Mailgun's testing tool

### Step 6: Environment Variables

Create production environment configuration:

```env
# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-very-secure-secret-key-32-chars-min

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudflare D1 Database
D1_URL=https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/d1/database/DATABASE_ID/query
D1_DATABASE_ID=your-d1-database-id
D1_API_KEY=your-cloudflare-api-token

# OpenAI Whisper
OPENAI_API_KEY=sk-your-openai-api-key

# Mailgun
MAILGUN_DOMAIN=your-domain.com
MAILGUN_API_KEY=key-your-mailgun-api-key

# Admin Configuration
ADMIN_EMAILS=admin@your-domain.com,admin2@your-domain.com

# Production Settings
NODE_ENV=production
```

### Step 7: Vercel Deployment

#### Initial Deployment
```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Note the deployment URL
```

#### Configure Environment Variables
1. Go to Vercel dashboard
2. Select your project
3. Navigate to Settings > Environment Variables
4. Add all environment variables from above
5. Set environment to "Production"
6. Redeploy to apply changes

#### Custom Domain (Optional)
1. Go to Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update environment variables with new domain
5. Update OAuth redirect URIs
6. Update Mailgun webhook URL

### Step 8: Verification & Testing

#### Test Authentication
1. Visit your deployed application
2. Test Google OAuth sign-in flow
3. Verify admin users are auto-approved
4. Test user approval workflow

#### Test Admin Dashboard
1. Login with admin account
2. Navigate to `/admin`
3. Verify user management works
4. Test user approval/revocation

#### Test Voice Processing
1. Send test email with audio attachment to user alias
2. Monitor Vercel function logs
3. Verify transcription email response
4. Check database for voice_events entry

#### Test Error Handling
1. Send oversized file (> 15MB)
2. Send invalid file format
3. Test with non-approved user
4. Verify error emails and responses

## 🔒 Security Configuration

### Production Security Checklist
- [ ] NEXTAUTH_SECRET is cryptographically secure (32+ characters)
- [ ] All API keys are properly secured
- [ ] OAuth redirect URIs are HTTPS only
- [ ] Mailgun webhook uses HTTPS
- [ ] Admin emails are properly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are applied
- [ ] CSRF protection is active

### Security Best Practices
```bash
# Generate secure NextAuth secret
openssl rand -base64 32

# Verify security headers
curl -I https://your-domain.vercel.app

# Test rate limiting
for i in {1..110}; do curl https://your-domain.vercel.app/api/inbound; done
```

## 📊 Monitoring & Maintenance

### Production Monitoring
```bash
# Check Vercel function logs
vercel logs --follow

# Monitor specific functions
vercel logs --follow --since=1h

# Check deployment status
vercel ls
```

### Database Maintenance
```bash
# Check database size
wrangler d1 execute voice-transcription-prod \
  --command="SELECT COUNT(*) as total_users FROM users;"

# View recent voice events
wrangler d1 execute voice-transcription-prod \
  --command="SELECT * FROM voice_events ORDER BY received_at DESC LIMIT 10;"

# Clean up old events (optional)
wrangler d1 execute voice-transcription-prod \
  --command="DELETE FROM voice_events WHERE received_at < datetime('now', '-30 days');"
```

### Performance Monitoring
- Monitor Vercel function execution times
- Track OpenAI API usage and costs
- Monitor Mailgun sending quotas
- Watch Cloudflare D1 request limits

## 🚨 Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Check build locally
npm run build

# Fix TypeScript errors
npm run type-check

# Check dependencies
npm audit fix
```

#### Environment Variable Issues
- Verify all required variables are set
- Check variable names match exactly
- Ensure no trailing spaces or quotes
- Test with Vercel CLI: `vercel env pull`

#### Database Connection Errors
- Verify D1 credentials and permissions
- Check API token has D1 access
- Test connection manually with wrangler
- Ensure database ID is correct

#### Authentication Problems
- Check OAuth configuration
- Verify redirect URIs match deployment URL
- Test NextAuth secret generation
- Clear browser cookies and retry

#### Webhook Processing Issues
- Verify Mailgun webhook URL
- Check function timeout settings (60s max)
- Monitor Vercel function logs
- Test with smaller audio files

## 📈 Scaling Considerations

### Vercel Hobby Limits
- **Function Duration**: 60 seconds max
- **Memory**: 1024MB max
- **Executions**: 100GB-hours per month
- **Bandwidth**: 100GB per month

### Optimization Strategies
- **File Size Limits**: Keep under 10MB for optimal performance
- **Processing Time**: Target 30-45 seconds total
- **Error Handling**: Fail fast for invalid requests
- **Rate Limiting**: Prevent abuse with in-memory limits

### Upgrade Considerations
If you exceed Hobby limits, consider:
- **Vercel Pro**: Higher limits and analytics
- **Database Optimization**: Add indexes for large datasets
- **CDN**: Use for static assets if needed
- **External Storage**: For large file processing

## 🔄 Backup & Recovery

### Database Backup
```bash
# Export all data
wrangler d1 execute voice-transcription-prod \
  --command=".dump" > backup.sql

# Backup specific tables
wrangler d1 execute voice-transcription-prod \
  --command="SELECT * FROM users;" > users_backup.csv
```

### Environment Backup
- Export all environment variables from Vercel dashboard
- Store securely in password manager
- Document all external service configurations

## 📝 Post-Deployment Checklist

### Final Verification
- [ ] Application loads correctly at production URL
- [ ] Google OAuth authentication works
- [ ] Admin dashboard accessible to admin users
- [ ] User dashboard functional for regular users
- [ ] Voice note processing pipeline working
- [ ] Email transcription responses sent
- [ ] Error pages display correctly
- [ ] Rate limiting prevents abuse
- [ ] Security headers applied
- [ ] Mobile responsive design works

### Ongoing Maintenance
- [ ] Monitor function execution times
- [ ] Track API usage and costs
- [ ] Review user approval requests
- [ ] Monitor error rates and patterns
- [ ] Update dependencies regularly
- [ ] Backup database periodically

---

## 🎉 Deployment Complete!

Your Voice Note Transcription Service is now live in production with:

✅ **Complete Authentication System**
✅ **Admin Dashboard with User Management**  
✅ **User Dashboard with Voice History**
✅ **Real-time Voice Processing Pipeline**
✅ **Production Security and Rate Limiting**
✅ **Mobile-Responsive Design**
✅ **Comprehensive Error Handling**

**Production URL**: https://your-domain.vercel.app
**Admin Dashboard**: https://your-domain.vercel.app/admin
**User Dashboard**: https://your-domain.vercel.app/dashboard

Perfect for organizations needing reliable voice-to-text processing with professional user management! 