# Production Setup Guide

This guide walks you through setting up the Schedule Management System for production deployment on Vercel with Supabase.

## 🎯 Quick Setup Checklist

- [ ] Supabase production project created
- [ ] Environment variables configured
- [ ] Vercel account and CLI setup
- [ ] Domain configured (optional)
- [ ] Deployment tested

## 📋 Step-by-Step Setup

### 1. Supabase Production Setup

#### Create Production Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and set project details:
   - **Name**: `schedule-management-prod`
   - **Database Password**: Generate strong password
   - **Region**: Choose closest to your users
4. Wait for project creation (2-3 minutes)

#### Configure Database
1. Go to **SQL Editor**
2. Run your database schema migrations
3. Set up Row Level Security (RLS) policies
4. Configure authentication settings

#### Get API Keys
1. Go to **Settings > API**
2. Copy the following values:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2. Environment Configuration

#### Create Production Environment File
```bash
# Copy the template
cp env.production.template .env.production

# Edit with your values
nano .env.production
```

#### Required Variables
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key

# Environment
VITE_ENVIRONMENT=production
```

#### Optional Variables
```bash
# Analytics (optional)
VITE_ANALYTICS_ID=G-XXXXXXXXXX

# Error Tracking (optional)
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
```

### 3. Vercel Setup

#### Install Vercel CLI
```bash
npm install -g vercel
```

#### Login to Vercel
```bash
vercel login
```

#### Link Project (First Time)
```bash
# In your project directory
vercel link
```

### 4. Deploy to Production

#### Quick Deploy
```bash
# Simple deployment
npm run deploy

# Full deployment with checks
npm run deploy:full
```

#### Preview Deploy
```bash
# Test deployment without affecting production
npm run deploy:preview
```

### 5. Configure Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings > Environment Variables**
4. Add the following variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | `your-anon-key` | Production, Preview |
| `VITE_ENVIRONMENT` | `production` | Production |
| `VITE_ENVIRONMENT` | `preview` | Preview |

### 6. Domain Configuration (Optional)

#### Custom Domain
1. In Vercel Dashboard, go to **Settings > Domains**
2. Add your custom domain
3. Configure DNS records as instructed
4. Enable SSL (automatic)

#### Subdomain Setup
```
# Example domains
app.yourdomain.com     # Production
staging.yourdomain.com # Staging
```

### 7. Post-Deployment Verification

#### Health Checks
1. **Application Load**: Visit your deployment URL
2. **Authentication**: Test login/logout
3. **Database**: Verify data operations
4. **Performance**: Check Core Web Vitals

#### Monitoring Setup
```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Monitor performance
npm run analyze
```

## 🔧 Advanced Configuration

### Database Optimization

#### Connection Pooling
```sql
-- Enable connection pooling
ALTER DATABASE postgres SET max_connections = 100;
```

#### Indexing
```sql
-- Add indexes for performance
CREATE INDEX idx_slots_created_by ON slots(created_by);
CREATE INDEX idx_schedules_slot_id ON generated_schedules(slot_id);
```

### Performance Optimization

#### Bundle Analysis
```bash
# Analyze bundle size
npm run analyze
```

#### CDN Configuration
Vercel automatically provides:
- Global CDN
- Gzip/Brotli compression
- HTTP/2 support
- Edge caching

### Security Hardening

#### Environment Variables
- Never commit `.env.production` to git
- Use Vercel's secure environment variable storage
- Rotate API keys regularly

#### Database Security
```sql
-- Enable RLS on all tables
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can only see their own slots" ON slots
  FOR ALL USING (auth.uid() = created_by);
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build locally
npm run build

# Analyze bundle
npm run analyze

# Check for TypeScript errors
npm run lint
```

#### Environment Variables
```bash
# Verify in Vercel dashboard
vercel env ls

# Check in application
console.log(import.meta.env.VITE_SUPABASE_URL);
```

#### Database Connection
- Verify Supabase URL and key
- Check RLS policies
- Test connection in Supabase dashboard
- Review network requests in browser dev tools

#### Performance Issues
- Run bundle analysis
- Check Core Web Vitals
- Optimize images and assets
- Review network requests

### Debug Commands

```bash
# Local production build
npm run build
npm run preview

# Check environment
vercel env ls

# View deployment logs
vercel logs [deployment-url]

# Test database connection
npx supabase status
```

## 📊 Monitoring & Maintenance

### Key Metrics to Monitor
- **Uptime**: 99.9% target
- **Response Time**: < 200ms average
- **Error Rate**: < 1%
- **Bundle Size**: Monitor for bloat

### Regular Maintenance
- **Weekly**: Check error logs and performance
- **Monthly**: Update dependencies
- **Quarterly**: Security audit and key rotation

### Backup Strategy
- **Database**: Supabase automatic backups
- **Code**: Git repository
- **Environment**: Document configuration
- **Assets**: Vercel edge caching

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Production Guide](https://vitejs.dev/guide/build.html)
- [Performance Best Practices](https://web.dev/performance/)

## 📞 Support

For production issues:
1. Check Vercel function logs
2. Review Supabase logs
3. Test locally with production env vars
4. Contact support with detailed error information

---

**Remember**: Always test in a preview environment before deploying to production!
