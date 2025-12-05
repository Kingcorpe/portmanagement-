# Deployment Guide: Security Fixes

**Date:** January 2025  
**Purpose:** Step-by-step guide to deploy all critical and high-priority security fixes

---

## 📋 Pre-Deployment Checklist

### Code Review
- [x] All critical fixes implemented
- [x] All high-priority fixes implemented
- [x] Code compiles without errors
- [x] No console.log statements remaining
- [x] All tests pass locally

### Environment Preparation
- [ ] Get TradingView IP ranges from TradingView support
- [ ] Prepare environment variables
- [ ] Set up log directory
- [ ] Review security settings

---

## 🚀 Deployment Steps

### Step 1: Environment Variables Setup

**Required Environment Variables:**

```bash
# Critical Security
TRADINGVIEW_IP_WHITELIST=1.2.3.4,5.6.7.8,192.168.1.0/24  # TradingView IPs
TRADINGVIEW_WEBHOOK_SECRET=your-secret-here              # Webhook secret
SESSION_SECRET=your-session-secret-here                  # Session encryption

# Email Configuration
TRADINGVIEW_REPORT_EMAIL=your-email@example.com          # Alert email

# Environment
NODE_ENV=production                                       # Production mode
LOCAL_DEV=false                                           # NOT true in production

# Database (existing)
DATABASE_URL=your-database-url

# Other existing variables...
```

**How to Set in Railway:**
1. Go to Railway dashboard
2. Select your project
3. Go to "Variables" tab
4. Add/update each variable
5. Save changes

**How to Set Locally:**
```bash
# Create/update .env file
cp .env.example .env
# Edit .env and add all variables
```

---

### Step 2: Get TradingView IP Ranges

**Action Required:**
1. Contact TradingView support
2. Request their webhook IP ranges
3. Add to `TRADINGVIEW_IP_WHITELIST` environment variable

**Temporary Workaround:**
- If IPs not available yet, webhook will still work
- Warning will be logged: "TRADINGVIEW_IP_WHITELIST not set"
- **Security Risk:** Webhook only protected by secret (less secure)
- **Recommendation:** Get IPs as soon as possible

---

### Step 3: Set Up Logging Directory

**On Railway:**
- Logs directory is automatically created
- Logs are stored in container filesystem
- Consider setting up log aggregation (Railway logs, or external service)

**Locally:**
```bash
mkdir -p logs
chmod 755 logs
```

**Add to .gitignore:**
```
logs/
*.log
```

---

### Step 4: Install Dependencies

**New Dependency Added:**
- `winston` - Logging library

**Install:**
```bash
npm install
```

**Verify:**
```bash
npm list winston
# Should show winston@x.x.x
```

---

### Step 5: Build and Test Locally

**Build:**
```bash
npm run build
```

**Test Locally:**
```bash
# Set environment variables
export NODE_ENV=development
export LOCAL_DEV=true
export TRADINGVIEW_REPORT_EMAIL=test@example.com
export SESSION_SECRET=test-secret

# Start server
npm run dev
```

**Run Tests:**
- Follow `TESTING_CHECKLIST.md`
- Verify all critical fixes work
- Check logs are being created

---

### Step 6: Deploy to Railway

**Option A: Git Push (Recommended)**
```bash
# Commit changes
git add .
git commit -m "Security fixes: CSRF, IP whitelist, logging, error sanitization"

# Push to trigger deployment
git push origin main
```

**Option B: Railway CLI**
```bash
railway up
```

**Monitor Deployment:**
1. Go to Railway dashboard
2. Watch deployment logs
3. Check for any errors
4. Verify deployment succeeds

---

### Step 7: Post-Deployment Verification

**1. Check Server Started:**
- [ ] Railway shows "Deployed" status
- [ ] No startup errors in logs
- [ ] Health check endpoint responds

**2. Verify Environment Variables:**
```bash
# In Railway dashboard, verify all variables are set
# Or use Railway CLI:
railway variables
```

**3. Test Critical Endpoints:**
- [ ] GET `/api/csrf-token` - Returns token
- [ ] GET `/api/auth/user` - Authentication works
- [ ] POST `/api/households` - CSRF protection active

**4. Check Logs:**
- [ ] Logs directory exists
- [ ] Error logs are being written
- [ ] Combined logs are being written
- [ ] No sensitive data in logs

**5. Test Webhook:**
- [ ] Send test webhook from TradingView
- [ ] Verify IP whitelist check (if configured)
- [ ] Verify secret validation
- [ ] Check logs for webhook processing

---

## 🔍 Monitoring After Deployment

### What to Monitor

**1. Error Logs:**
- Check `logs/error.log` for errors
- Monitor error rate
- Watch for new error patterns

**2. CSRF Protection:**
- Monitor 403 responses
- Check if legitimate requests are being blocked
- Verify token refresh is working

**3. Webhook Security:**
- Monitor webhook requests
- Check for rejected IPs
- Verify legitimate requests succeed

**4. Performance:**
- Monitor response times
- Check rate limiter effectiveness
- Watch for any performance degradation

### Log Monitoring

**Railway Logs:**
- View logs in Railway dashboard
- Set up alerts for errors
- Monitor log volume

**External Logging (Optional):**
- Consider log aggregation service (Datadog, LogRocket, etc.)
- Set up alerts for critical errors
- Monitor log retention

---

## 🚨 Rollback Plan

**If Issues Occur:**

**Option 1: Quick Rollback (Railway)**
1. Go to Railway dashboard
2. Find previous successful deployment
3. Click "Redeploy"
4. Verify rollback succeeded

**Option 2: Git Rollback**
```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

**Option 3: Disable Specific Features**
- Remove `TRADINGVIEW_IP_WHITELIST` to disable IP check
- Set `LOCAL_DEV=true` temporarily (NOT recommended in production)
- Disable CSRF by commenting out middleware (NOT recommended)

---

## 📝 Post-Deployment Tasks

### Immediate (First 24 Hours)

- [ ] Monitor error logs closely
- [ ] Verify all endpoints working
- [ ] Test webhook with real TradingView alerts
- [ ] Check CSRF token flow
- [ ] Verify email alerts working

### Short-term (First Week)

- [ ] Review error logs daily
- [ ] Monitor performance metrics
- [ ] Get TradingView IP ranges
- [ ] Update IP whitelist
- [ ] Document any issues found

### Long-term (Ongoing)

- [ ] Regular log review
- [ ] Security audit
- [ ] Performance optimization
- [ ] Incremental refactoring (routes.ts)

---

## 🔐 Security Checklist

**Before Going Live:**
- [ ] All environment variables set
- [ ] No hardcoded secrets
- [ ] CSRF protection enabled
- [ ] IP whitelist configured (or planned)
- [ ] Error sanitization working
- [ ] Logging configured
- [ ] Session security enabled
- [ ] HTTPS enabled (Railway default)

**Ongoing:**
- [ ] Regular security updates
- [ ] Monitor for vulnerabilities
- [ ] Review access logs
- [ ] Keep dependencies updated

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: CSRF token errors**
- **Solution:** Verify client is fetching and including tokens
- **Check:** Network tab for `X-CSRF-Token` header

**Issue: Webhook rejected**
- **Solution:** Check IP whitelist configuration
- **Check:** Verify TradingView IPs are correct

**Issue: Logs not appearing**
- **Solution:** Check logs directory permissions
- **Check:** Verify Winston is installed

**Issue: Email not sending**
- **Solution:** Verify `TRADINGVIEW_REPORT_EMAIL` is set
- **Check:** Email service configuration (Resend/SMTP)

### Getting Help

1. Check logs first (`logs/error.log`)
2. Review this deployment guide
3. Check `TESTING_CHECKLIST.md`
4. Review error messages (sanitized in production)

---

## ✅ Deployment Sign-Off

**Ready to Deploy When:**
- [x] All code changes committed
- [x] All tests passing locally
- [x] Environment variables prepared
- [x] TradingView IPs obtained (or plan in place)
- [x] Logging directory set up
- [x] Rollback plan ready
- [x] Monitoring in place

**Deployment Date:** _______________

**Deployed By:** _______________

**Verified By:** _______________

---

*This deployment includes critical security fixes. Monitor closely after deployment!*



