# Bunergy Setup Scripts

This directory contains utility scripts for setting up and managing the Bunergy Telegram Mini App.

## 📋 Available Scripts

### `setup-telegram-webhook.js`

**Purpose:** Register the Telegram webhook for payment processing

**Usage:**
```bash
node scripts/setup-telegram-webhook.js
```

**What it does:**
1. ✅ Registers webhook with Telegram Bot API
2. ✅ Verifies webhook is set correctly
3. ✅ Shows detailed webhook information
4. ✅ Provides troubleshooting guidance on errors

**Requirements:**
- Node.js installed
- `.env.local` file with required variables:
  - `TELEGRAM_BOT_TOKEN`
  - `NEXT_PUBLIC_SITE_URL`

**When to run:**
- After deploying to production for the first time
- When changing webhook URL
- When troubleshooting payment issues

**Example output:**
```
🚀 Setting up Telegram webhook...

📍 Webhook URL: https://bunergy.uk/api/telegram-webhook

📡 Registering webhook...
✅ Webhook registered successfully!
   Response: Webhook was set

🔍 Verifying webhook...
✅ Webhook verified!

📋 Webhook Info:
   URL: https://bunergy.uk/api/telegram-webhook
   Pending Updates: 0
   Allowed Updates: pre_checkout_query, message
   Last Error: None

🎉 Setup complete! Your Telegram webhook is now active.
```

## 🔧 Troubleshooting

### Error: "TELEGRAM_BOT_TOKEN not found"
**Solution:** Make sure your `.env.local` file exists and contains:
```env
TELEGRAM_BOT_TOKEN="your-bot-token"
```

### Error: "Webhook URL must be HTTPS"
**Solution:** Ensure `NEXT_PUBLIC_SITE_URL` uses HTTPS:
```env
NEXT_PUBLIC_SITE_URL="https://bunergy.uk"
```

### Error: "Can't connect to webhook"
**Solution:**
1. Check if your domain is accessible publicly
2. Verify Vercel deployment is successful
3. Check firewall settings

### Webhook shows "Last Error"
**Solution:**
1. Check Vercel function logs
2. Verify environment variables in Vercel
3. Test webhook endpoint manually:
   ```bash
   curl -X POST https://bunergy.uk/api/telegram-webhook \
     -H "Content-Type: application/json" \
     -d '{"update_id": 123}'
   ```

## 📚 Additional Resources

- [Telegram Bot API - Webhooks](https://core.telegram.org/bots/api#setwebhook)
- [Telegram Payments Guide](https://core.telegram.org/bots/payments)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review Vercel function logs
3. Verify all environment variables are set correctly
4. Test the webhook endpoint manually
5. Check Telegram Bot API documentation