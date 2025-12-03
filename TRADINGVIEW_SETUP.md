# TradingView Webhook Setup Guide

## ✅ Updated Pine Script

Your Pine Script has been updated to include the webhook secret for authentication. The file is saved as `tradingview-alert.pine` in your project root.

## 🔧 Setup Steps

### 1. Environment Variables

Create a `.env` file in your project root (if you haven't already):

```bash
# TradingView Integration
TRADINGVIEW_REPORT_EMAIL=ryan@crsolutions.ca
TRADINGVIEW_WEBHOOK_SECRET=2e3cb66bdc008494d7d7c989072760e3

# Timezone
TZ=America/Denver

# Database - your Neon PostgreSQL connection string
DATABASE_URL=postgresql://your-connection-string-here

# Port
PORT=5000
```

### 2. Get Your Webhook URL

**For Local Development:**
- Use ngrok to create a public tunnel:
  ```bash
  ngrok http 5000
  ```
- Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
- Your webhook URL will be: `https://abc123.ngrok.io/api/webhooks/tradingview`

**For Production:**
- Your webhook URL will be: `https://your-domain.com/api/webhooks/tradingview`
- You can also find it in the Admin page under Settings → TradingView Webhook

### 3. Add Pine Script to TradingView

1. Open TradingView and go to the Pine Editor
2. Copy the contents of `tradingview-alert.pine`
3. Click "Save" and give it a name
4. Click "Add to Chart"

### 4. Create an Alert in TradingView

1. Right-click on your chart → "Add Alert"
2. **Condition**: Select your indicator ("Ryan's Perfect Alerts – SMA30 RED + RSI (CLEAN)")
3. **Alert Settings**:
   - **Webhook URL**: Enter your webhook URL (from step 2)
   - **Message**: Leave this as `{{alert_message}}` - the Pine Script will send the JSON
4. Click "Create"

### 5. Test the Alert

1. Make sure your server is running
2. The alert should trigger when your conditions are met
3. Check your app's Alerts page to see incoming alerts
4. Check your email (ryan@crsolutions.ca) for notifications

## 🔒 Security

The webhook secret (`2e3cb66bdc008494d7d7c989072760e3`) is included in the JSON payload for authentication. This ensures only authorized alerts are processed.

## 📋 Alert JSON Format

Your alerts send JSON in this format:

**BUY Signal:**
```json
{
  "symbol": "AAPL",
  "signal": "BUY",
  "price": 150.25,
  "email": "ryan@crsolutions.ca",
  "secret": "2e3cb66bdc008494d7d7c989072760e3"
}
```

**SELL Signal:**
```json
{
  "symbol": "AAPL",
  "signal": "SELL",
  "price": 155.50,
  "email": "ryan@crsolutions.ca",
  "secret": "2e3cb66bdc008494d7d7c989072760e3"
}
```

## 🐛 Troubleshooting

**Alerts not appearing?**
- Check that your server is running and accessible
- Verify the webhook URL is correct
- Check server logs for errors
- Ensure the webhook secret matches in both `.env` and Pine Script

**Getting 401 Unauthorized?**
- Verify `TRADINGVIEW_WEBHOOK_SECRET` in `.env` matches the secret in your Pine Script
- Check that the secret is being sent in the JSON payload

**Alerts not triggering?**
- Make sure the alert condition is set to your indicator
- Verify the chart timeframe matches your strategy
- Check that the alert is enabled in TradingView

## 📝 Notes

- The webhook secret is hardcoded in the Pine Script. If you regenerate it, update both the `.env` file and the Pine Script.
- For production, consider using TradingView's alert variables like `{{ticker}}` if needed, but the current JSON format works well.
- The email field is optional - if not provided, it will use `TRADINGVIEW_REPORT_EMAIL` from your environment.

