# Production Deployment Guide

This guide covers deploying the Schedule Management System to Vercel with Supabase production connection.

## 🚀 Quick Deploy

### Prerequisites
- Vercel account
- Supabase production project
- Domain (optional)

### 1. Environment Setup

Create `.env.production` file:
```bash
# Copy the example file
cp .env.production.example .env.production

# Edit with your production values
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_ENVIRONMENT=production
```

### 2. Deploy to Vercel

#### Option A: CLI Deploy
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
npm run deploy
```

#### Option B: GitHub Integration
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Enable automatic deployments

### 3. Environment Variables in Vercel

Set these in your Vercel project settings:

**Required:**
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

**Optional:**
```
VITE_ENVIRONMENT=production
VITE_ANALYTICS_ID=your-analytics-id
VITE_SENTRY_DSN=your-sentry-dsn
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
```

## 🔧 Build Optimizations

### Code Splitting
The build is optimized with manual chunks:
- **vendor**: React, React DOM
- **router**: React Router
- **ui**: UI components and icons
- **utils**: Zustand, date-fns
- **supabase**: Supabase client
- **scheduler**: MWF/TT engines
- **components**: UI components
- **pages**: Page components

### Compression
- **Terser**: Minification with console removal in production
- **Gzip/Brotli**: Automatic compression by Vercel
- **Asset optimization**: Images, fonts, and static assets

### Caching
- **Static assets**: 1 year cache with immutable headers
- **Chunk files**: Hashed filenames for cache busting
- **CDN**: Global edge network via Vercel

## 🌍 Environment Badge

The environment badge shows in non-production environments:
- **Development**: Blue "DEV" badge
- **Staging**: Yellow "STAGING" badge
- **Preview**: Purple "PREVIEW" badge
- **Production**: No badge (hidden)

## 📊 Performance Monitoring

### Bundle Analysis
```bash
# Analyze bundle size
npm run analyze
```

### Core Web Vitals
Monitor these metrics:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Lighthouse Scores
Target scores:
- **Performance**: 90+
- **Accessibility**: 95+
- **Best Practices**: 95+
- **SEO**: 90+

## 🔒 Security Headers

Vercel automatically adds security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

## 🚦 Deployment Workflow

### Staging → Production
1. **Feature Branch**: Develop features in branches
2. **Pull Request**: Create PR to main branch
3. **Preview Deploy**: Automatic preview deployment
4. **Review**: Test in preview environment
5. **Merge**: Merge to main triggers production deploy

### Rollback Strategy
1. **Vercel Dashboard**: Use "Promote" feature
2. **Git Revert**: Revert commit and redeploy
3. **Environment Variables**: Switch to backup config

## 📈 Monitoring & Analytics

### Error Tracking
Set up Sentry for production error tracking:
```typescript
// In your Supabase client setup
if (import.meta.env.VITE_SENTRY_DSN) {
  // Initialize Sentry
}
```

### Performance Monitoring
Track key metrics:
- Page load times
- API response times
- Error rates
- User engagement

### Health Checks
Monitor these endpoints:
- `/` - Main application
- `/api/health` - API status
- Database connectivity

## 🔄 CI/CD Pipeline

### GitHub Actions
The E2E tests run on every deployment:
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Pre-deployment Checks
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Performance benchmarks met

## 🛠️ Troubleshooting

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
# Verify env vars are set
vercel env ls

# Set missing vars
vercel env add VITE_SUPABASE_URL
```

#### Database Connection
- Verify Supabase URL and key
- Check RLS policies
- Test connection in Supabase dashboard

#### Performance Issues
- Check bundle size with analyzer
- Optimize images and assets
- Review network requests
- Monitor Core Web Vitals

### Debug Mode
Enable debug logging:
```bash
# Set debug environment variable
VITE_DEBUG=true npm run build
```

## 📋 Deployment Checklist

### Pre-deployment
- [ ] All tests passing
- [ ] Build optimized and tested
- [ ] Environment variables configured
- [ ] Database schema up to date
- [ ] Performance benchmarks met
- [ ] Security headers configured
- [ ] Error tracking enabled

### Post-deployment
- [ ] Application loads correctly
- [ ] Authentication working
- [ ] Database connectivity verified
- [ ] Performance metrics acceptable
- [ ] Error monitoring active
- [ ] Analytics tracking working

### Monitoring
- [ ] Set up alerts for errors
- [ ] Monitor performance metrics
- [ ] Track user engagement
- [ ] Review security logs

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Build Options](https://vitejs.dev/config/build-options.html)
- [Performance Best Practices](https://web.dev/performance/)

## 📞 Support

For deployment issues:
1. Check Vercel function logs
2. Review Supabase logs
3. Test locally with production env vars
4. Contact support with error details
