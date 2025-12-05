# Railway Environment Variables Checklist

## Required Variables

Make sure you have ALL of these in Railway's Variables tab:

1. **NODE_ENV** = `production`
2. **DATABASE_URL** = `postgresql://...` (your Neon connection string)
3. **SESSION_SECRET** = `your-random-secret-here` (generate a random string)
4. **TRADINGVIEW_REPORT_EMAIL** = `ryan@crsolutions.ca`
5. **TRADINGVIEW_WEBHOOK_SECRET** = `2e3cb66bdc008494d7d7c989072760e3`
6. **TZ** = `America/Denver`
7. **PORT** = `5000` (optional - Railway sets this automatically)

## How to Generate SESSION_SECRET

Run this in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use any random string generator. It should be a long, random string.

