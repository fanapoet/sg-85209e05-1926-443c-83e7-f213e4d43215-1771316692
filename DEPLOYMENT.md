# 🚀 Deployment Guide - Bunergy

## ✅ COMPLETED SETUP:

1. ✅ **Telegram Webhook** - Registered and verified
2. ✅ **Supabase Edge Function** - Deployed manually
3. ✅ **Edge Function Secrets** - Added manually (3 secrets)
4. ⏳ **Vercel Environment Variables** - Need to add (FINAL STEP)

---

## 🎯 FINAL STEP: Add Environment Variables to Vercel

### **Option 1: Copy-Paste Method (2 Minutes)**

**Go to:** [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → **Settings** → **Environment Variables**

**Add these 3 variables:**

#### 1. `TELEGRAM_BOT_TOKEN`
```
7774596180:AAFDvn2k-z7KFE1QLKpW5EAaM6N-JOL80kY
```
✅ Select: **Production** ✓ **Preview** ✓ **Development** ✓

---

#### 2. `TELEGRAM_PAYMENT_PROVIDER_TOKEN`
```
1877036958:TEST:baf85695ca7fc4a12f5ad4462baaa500b9201ed8
```
✅ Select: **Production** ✓ **Preview** ✓ **Development** ✓

---

#### 3. `SUPABASE_SERVICE_ROLE_KEY`
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3dnR3Y2V6eWh2eGRpcXl5eXBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzNDg5OCwiZXhwIjoyMDg0OTEwODk4fQ.y8RP8fpO--FYiizOZ7NCsJEKZz_rVBoB2TUdFrfEMwk
```
✅ Select: **Production** ✓ **Preview** ✓ **Development** ✓

---

### **Option 2: Import from File (30 Seconds)**

**Vercel Dashboard also allows bulk import!**

1. Go to: **Settings** → **Environment Variables**
2. Click: **"Import .env"** button (if available)
3. Copy contents from `.env.production.example` in your project
4. Paste and import

---

## 🔄 AFTER ADDING VARIABLES:

### **Redeploy Vercel:**

```bash
git add .
git commit -m "docs: Add deployment guide"
git push
```

**Or in Vercel Dashboard:**
- Go to: **Deployments** tab
- Click: Latest deployment → **"..."** menu → **"Redeploy"**
- ✅ Check: **"Use existing Build Cache"** (faster)

---

## 🧪 TESTING CHECKLIST:

After redeployment is complete:

### **1. Test Webhook:**
```bash
curl -X POST https://bunergy.uk/api/telegram-webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"text":"test"}}'
```
✅ Should return: `{"success":true}`

---

### **2. Test Payment Flow:**

1. **Open app:** https://t.me/bunergy_bot/app
2. **Navigate:** Build screen
3. **Start build:** Any L4+ part (30min+ timer)
4. **Click:** "⚡ Speed Up" button
5. **Test BB payment:** Should complete instantly ✅
6. **Test Stars payment:** Should open Telegram payment dialog ✅

---

### **3. Check Logs:**

**Vercel Logs:**
- Dashboard → Your Project → **Logs** tab
- Filter by: `/api/telegram-webhook` or `/api/create-stars-invoice`

**Supabase Logs:**
- Dashboard → Edge Functions → `telegram-webhook-handler` → **Logs**

---

## 📊 ARCHITECTURE OVERVIEW:

### **Payment Flow:**

```
User clicks "Speed Up"
  ↓
/api/create-stars-invoice (Next.js API Route)
  ↓ Creates invoice in Supabase
  ↓ Returns Telegram invoice link
  ↓
User completes payment in Telegram
  ↓
Telegram sends webhook to /api/telegram-webhook
  ↓
Next.js API validates and processes payment
  ↓
Updates invoice status in Supabase
  ↓ Alternatively uses Edge Function (optional)
  ↓
Build completed instantly in app
```

---

## 🔐 SECURITY NOTES:

✅ **All sensitive keys are in environment variables**  
✅ **Service role key only used server-side**  
✅ **Webhook validates Telegram signatures**  
✅ **Payment provider token is test mode**  

---

## 🎯 PRODUCTION CHECKLIST:

Before going live:

- [ ] Add environment variables to Vercel (ALL 3)
- [ ] Redeploy Vercel after adding variables
- [ ] Test BB payment (Speed-Up with BB)
- [ ] Test Stars payment (Speed-Up with Telegram Stars)
- [ ] Verify invoice creation in Supabase
- [ ] Verify webhook receives payments
- [ ] Check error logs for issues
- [ ] Test with real users

---

## 🆘 TROUBLESHOOTING:

### **Issue: "Server configuration error"**
✅ **Fix:** Environment variables not set in Vercel → Add them

### **Issue: "Failed to create invoice"**
✅ **Fix:** Check Supabase service role key is correct

### **Issue: Payment doesn't complete**
✅ **Fix:** Check webhook logs in Vercel → Verify Telegram sends webhook

### **Issue: "Insufficient Balance" for BB payment**
✅ **Expected:** User needs BB tokens to pay

---

## 📞 SUPPORT:

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Telegram Bot:** @bunergy_bot

---

**Last Updated:** 2026-01-31  
**Version:** 1.0.0