# Testing Checklist for Security Fixes

**Date:** January 2025  
**Purpose:** Comprehensive testing guide for all critical and high-priority fixes

---

## 🔒 Critical Fixes Testing

### ✅ Fix #1: TradingView Webhook IP Whitelist

**Test Cases:**

- [ ] **Test 1: Valid IP from whitelist**
  - Add test IP to `TRADINGVIEW_IP_WHITELIST` env var
  - Send webhook request from that IP
  - **Expected:** Request succeeds, webhook processes normally
  - **Command:** `curl -X POST http://localhost:5000/api/webhooks/tradingview?secret=YOUR_SECRET -H "Content-Type: application/json" -d '{"symbol":"AAPL","signal":"BUY","price":"150.00"}'`

- [ ] **Test 2: Invalid IP (not in whitelist)**
  - Send webhook from IP not in whitelist
  - **Expected:** 403 Forbidden response
  - **Check logs:** Should see warning about rejected IP

- [ ] **Test 3: No IP whitelist configured (local dev)**
  - Remove `TRADINGVIEW_IP_WHITELIST` env var
  - **Expected:** Webhook works (whitelist only enforced in production)

- [ ] **Test 4: Production mode without whitelist**
  - Set `NODE_ENV=production` without `TRADINGVIEW_IP_WHITELIST`
  - **Expected:** Warning in logs, webhook still works (but less secure)

**Verification:**
- [ ] Check server logs for IP validation messages
- [ ] Verify 403 responses for unauthorized IPs
- [ ] Confirm legitimate requests still work

---

### ✅ Fix #2: CSRF Protection

**Test Cases:**

- [ ] **Test 1: GET request (should work without token)**
  - Make GET request to `/api/households`
  - **Expected:** Request succeeds (GET is safe method)

- [ ] **Test 2: POST request without CSRF token**
  - Make POST request without `X-CSRF-Token` header
  - **Expected:** 403 Forbidden (in production), works in local dev

- [ ] **Test 3: POST request with valid CSRF token**
  - Fetch token from `/api/csrf-token`
  - Include token in `X-CSRF-Token` header
  - Make POST request
  - **Expected:** Request succeeds

- [ ] **Test 4: POST request with invalid CSRF token**
  - Use wrong token in header
  - **Expected:** 403 Forbidden

- [ ] **Test 5: CSRF token endpoint**
  - GET `/api/csrf-token`
  - **Expected:** Returns `{ csrfToken: "..." }`
  - **Verify:** Token is stored in session

- [ ] **Test 6: Client-side automatic token inclusion**
  - Use `apiRequest()` function in client
  - Make POST/PUT/PATCH/DELETE request
  - **Expected:** Token automatically included
  - **Check:** Network tab shows `X-CSRF-Token` header

- [ ] **Test 7: Token refresh on expiration**
  - Let token expire (or clear session)
  - Make request, get 403
  - **Expected:** Client automatically fetches new token and retries

**Verification:**
- [ ] All state-changing requests include CSRF token
- [ ] Webhook endpoints bypass CSRF (use secret instead)
- [ ] Local dev mode skips CSRF validation
- [ ] Client automatically handles token fetching

---

### ✅ Fix #3: Local Dev Mode Safety

**Test Cases:**

- [ ] **Test 1: Local dev mode works**
  - Set `LOCAL_DEV=true` and `NODE_ENV=development`
  - Start server
  - **Expected:** Server starts, auth bypassed, warning messages shown

- [ ] **Test 2: Production mode with LOCAL_DEV=true (should fail)**
  - Set `LOCAL_DEV=true` and `NODE_ENV=production`
  - Try to start server
  - **Expected:** Server crashes with error message
  - **Error:** "CRITICAL SECURITY ERROR: Cannot run in LOCAL_DEV mode in production!"

- [ ] **Test 3: Production mode without LOCAL_DEV**
  - Set `NODE_ENV=production` (no LOCAL_DEV)
  - Start server
  - **Expected:** Server starts normally, auth required

**Verification:**
- [ ] Cannot accidentally deploy with dev mode enabled
- [ ] Clear warning messages when dev mode is active
- [ ] Production deployment fails if misconfigured

---

## 🟡 High Priority Fixes Testing

### ✅ Fix #4: Proper Logging

**Test Cases:**

- [ ] **Test 1: Log files created**
  - Start server
  - **Expected:** `logs/error.log` and `logs/combined.log` created
  - **Check:** Files exist in `logs/` directory

- [ ] **Test 2: Error logging**
  - Trigger an error (e.g., invalid request)
  - **Expected:** Error logged to `logs/error.log`
  - **Check:** Log entry includes timestamp, error details

- [ ] **Test 3: Info logging**
  - Perform normal operations
  - **Expected:** Info logs in `logs/combined.log`
  - **Check:** Logs are structured JSON format

- [ ] **Test 4: Sensitive data sanitization**
  - Log something with password/secret/token
  - **Expected:** Sensitive data shows as `[REDACTED]`
  - **Check:** No passwords or secrets in logs

- [ ] **Test 5: Console output in development**
  - Run in development mode
  - **Expected:** Logs also appear in console (colored)
  - **Check:** Console shows formatted logs

- [ ] **Test 6: No console output in production**
  - Run in production mode
  - **Expected:** No console output (only file logs)
  - **Check:** Console is clean, logs in files only

**Verification:**
- [ ] All console.log/error/warn replaced with logger
- [ ] Logs are properly formatted
- [ ] Sensitive data is sanitized
- [ ] Log rotation configured

---

### ✅ Fix #6: Input Validation

**Test Cases:**

- [ ] **Test 1: Valid query parameter**
  - GET `/api/alerts?status=pending`
  - **Expected:** Request succeeds, returns pending alerts

- [ ] **Test 2: Invalid query parameter**
  - GET `/api/alerts?status=invalid`
  - **Expected:** 400 Bad Request with validation errors

- [ ] **Test 3: Missing query parameter**
  - GET `/api/alerts` (no status)
  - **Expected:** Request succeeds (optional parameter)

- [ ] **Test 4: UUID validation**
  - GET `/api/households/invalid-uuid`
  - **Expected:** 400 Bad Request (invalid UUID format)

**Verification:**
- [ ] Query parameters are validated
- [ ] UUID parameters are validated
- [ ] Validation errors are clear and helpful

---

### ✅ Fix #8: Error Message Sanitization

**Test Cases:**

- [ ] **Test 1: Database error in production**
  - Trigger database error (e.g., duplicate key)
  - **Expected:** Generic error message, no database details
  - **Check:** Error message doesn't reveal schema/structure

- [ ] **Test 2: Database error in development**
  - Same error in dev mode
  - **Expected:** Full error details shown

- [ ] **Test 3: Validation error**
  - Send invalid data
  - **Expected:** Clear validation error (safe to show)

- [ ] **Test 4: Server error (500)**
  - Trigger internal server error
  - **Expected:** Generic "Internal Server Error" in production
  - **Check:** Full error logged server-side, not sent to client

**Verification:**
- [ ] Production errors don't leak information
- [ ] Development errors show full details
- [ ] Error logs contain full information
- [ ] Client responses are sanitized

---

### ✅ Fix #9: Hardcoded Email Removal

**Test Cases:**

- [ ] **Test 1: Email configured**
  - Set `TRADINGVIEW_REPORT_EMAIL` env var
  - Trigger webhook
  - **Expected:** Email sent successfully

- [ ] **Test 2: Email not configured**
  - Remove `TRADINGVIEW_REPORT_EMAIL` env var
  - Trigger webhook
  - **Expected:** Warning in logs, no email sent, webhook still processes

- [ ] **Test 3: No hardcoded fallback**
  - Check code for "ryan@crsolutions.ca"
  - **Expected:** Not found in code

**Verification:**
- [ ] No hardcoded emails in code
- [ ] Proper error handling when email not configured
- [ ] Environment variable required

---

## 🧪 Integration Testing

### Full Workflow Tests

- [ ] **Test 1: Complete webhook flow**
  - Send TradingView webhook
  - Verify IP whitelist check
  - Verify secret validation
  - Verify CSRF bypass (webhooks don't need CSRF)
  - Verify email sent (if configured)
  - Check logs for all steps

- [ ] **Test 2: Complete API request flow**
  - Login/authenticate
  - Fetch CSRF token
  - Make POST request with token
  - Verify request succeeds
  - Check logs for request

- [ ] **Test 3: Error handling flow**
  - Trigger various errors
  - Verify error messages are sanitized
  - Verify errors are logged properly
  - Verify client gets appropriate response

---

## 📋 Pre-Deployment Checklist

### Environment Variables

- [ ] `TRADINGVIEW_IP_WHITELIST` - Set with TradingView IPs
- [ ] `TRADINGVIEW_WEBHOOK_SECRET` - Set and secure
- [ ] `TRADINGVIEW_REPORT_EMAIL` - Set for email alerts
- [ ] `SESSION_SECRET` - Set and secure
- [ ] `NODE_ENV=production` - Set for production
- [ ] `LOCAL_DEV` - NOT set (or false) in production

### Logging

- [ ] `logs/` directory exists and is writable
- [ ] Log rotation configured
- [ ] Log files not committed to git (in .gitignore)

### Security

- [ ] CSRF protection enabled
- [ ] IP whitelist configured
- [ ] Error sanitization working
- [ ] No hardcoded secrets/emails

---

## 🐛 Known Issues / Edge Cases

### To Monitor After Deployment

- [ ] CSRF token expiration handling
- [ ] Rate limiter performance
- [ ] Log file size growth
- [ ] Webhook IP whitelist accuracy
- [ ] Error log volume

---

## 📊 Success Criteria

**All tests passing:**
- ✅ Webhook security working
- ✅ CSRF protection active
- ✅ Logging functional
- ✅ Error sanitization working
- ✅ No information leakage
- ✅ No hardcoded values

**Ready for production when:**
- All critical tests pass
- All high-priority tests pass
- Environment variables configured
- Logs directory set up
- Monitoring in place

---

*Run this checklist before deploying to production!*





