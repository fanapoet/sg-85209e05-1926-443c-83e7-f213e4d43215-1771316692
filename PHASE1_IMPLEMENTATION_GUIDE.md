# 🎯 PHASE 1: TELEGRAM AUTH INTEGRATION - IMPLEMENTATION GUIDE

## ✅ STEP 1: EDGE FUNCTION CREATED

**Status:** ✅ COMPLETE

**What Was Done:**
- Created `supabase/functions/telegram-auth/index.ts`
- Validates Telegram Mini App `initData` cryptographically (HMAC-SHA256)
- Creates/retrieves Supabase Auth users linked to `telegram_id`
- Returns JWT session tokens with `telegram_id` in user metadata

**What You Need to Do:**

### 1️⃣ Deploy Edge Function via Supabase Dashboard

Since the CLI deployment failed (project not linked in sandbox), you need to deploy manually:

1. **Open Supabase Dashboard** → Your Project → **Edge Functions**
2. **Click "Deploy new function"**
3. **Copy the function code** from `supabase/functions/telegram-auth/index.ts`
4. **Name it:** `telegram-auth`
5. **Click Deploy**

**Verify It's Live:**
```bash
# Should return function details
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-auth \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## 🚀 STEP 2: FRONTEND INTEGRATION (NEXT STEP)

**Status:** ⏳ READY TO IMPLEMENT

**What Was Created:**
- `src/services/telegramAuthService.ts` - Complete auth service
- Functions available:
  - `authenticateWithTelegram()` - Main auth flow
  - `checkAuthSession()` - Check if user is authenticated
  - `getTelegramIdFromSession()` - Get telegram_id from JWT
  - `signOut()` - Clear session

**Implementation Steps:**

### 2️⃣ Update GameStateContext to Call Auth on Load

**File:** `src/contexts/GameStateContext.tsx`

**Add to the top of the component:**

```typescript
import { authenticateWithTelegram, checkAuthSession } from "@/services/telegramAuthService";

// Inside GameStateProvider component, add useEffect:
useEffect(() => {
  const initAuth = async () => {
    console.log("🔐 Initializing Telegram authentication...");
    
    // Check if already authenticated
    const hasSession = await checkAuthSession();
    
    if (hasSession) {
      console.log("✅ Already authenticated!");
      return;
    }
    
    // Authenticate with Telegram
    const result = await authenticateWithTelegram();
    
    if (result.success) {
      console.log("✅ Authentication successful!");
      console.log("📋 Session expires at:", new Date(result.session!.expires_at * 1000));
    } else {
      console.error("❌ Authentication failed:", result.error);
    }
  };
  
  initAuth();
}, []); // Run once on mount
```

**Expected Behavior:**
- ✅ On app load, validates Telegram initData
- ✅ Creates Supabase Auth session
- ✅ All subsequent Supabase queries use authenticated session
- ✅ JWT contains `telegram_id` for RLS policies

---

## 🧪 STEP 3: TEST AUTHENTICATION (MANUAL TEST)

**How to Test:**

1. **Open Browser Console** in Telegram Mini App
2. **Look for logs:**
   ```
   🔐 Initializing Telegram authentication...
   🔐 Calling telegram-auth Edge Function...
   ✅ Authentication successful!
   👤 Profile: { id: "...", telegram_id: 545854919, ... }
   ✅ Supabase session established!
   ```

3. **Verify Session:**
   ```javascript
   // Run in console:
   const { data } = await supabase.auth.getSession();
   console.log("Session:", data.session);
   console.log("Telegram ID:", data.session?.user?.user_metadata?.telegram_id);
   ```

4. **Check RLS Still Works:**
   - Try syncing rewards/tasks
   - Should still work (tables are currently public)

---

## 📋 STEP 4: VERIFY NO FUNCTIONALITY BREAKS

**Critical Checks:**

✅ **App Loads:** No errors on startup  
✅ **Tapping Works:** BZ increments normally  
✅ **Sync Works:** All sync operations succeed  
✅ **Navigation Works:** All screens accessible  
✅ **No Breaking Changes:** Everything works exactly as before  

**Why This Works:**
- Auth happens in background
- Tables are still public (no RLS enforcement yet)
- Just establishes session foundation
- Zero impact on current functionality

---

## 🎯 WHAT THIS ACHIEVES

**PHASE 1 GOALS:**
- ✅ Telegram → Supabase Auth integration working
- ✅ JWT tokens contain `telegram_id`
- ✅ Session persists across app reloads
- ✅ Foundation for RLS policies in Phase 2
- ✅ Zero breaking changes to current functionality

---

## 🚨 TROUBLESHOOTING

### Edge Function Not Found (404)
**Solution:** Deploy function via Supabase Dashboard (see Step 1)

### "initData is required" Error
**Solution:** App must run inside Telegram Mini App (not browser)

### Session Not Persisting
**Solution:** Check `supabase.auth.setSession()` is called after Edge Function returns

### RLS Errors Appear
**Solution:** Tables are still public - should not happen in Phase 1

---

## 📞 NEXT STEPS AFTER PHASE 1

Once Step 2 is implemented and tested:

1. **Verify auth works** (console logs show success)
2. **Confirm no breaks** (app works exactly as before)
3. **Report back** - I'll guide you through Phase 2 (migrating RLS policies)

---

**Current Status:** ⏳ Waiting for Edge Function deployment + Frontend integration

Let me know when you're ready to proceed with Step 2! 🚀