# BunBun TMA - Complete Technical Documentation

> **Version:** 1.0  
> **Last Updated:** March 6, 2026  
> **Purpose:** Complete technical reference for development teams

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Data Management Strategy](#3-data-management-strategy)
4. [Game Mechanics & Formulas](#4-game-mechanics--formulas)
5. [Database Schema](#5-database-schema)
6. [State Management](#6-state-management)
7. [Screen Components](#7-screen-components)
8. [Service Layer](#8-service-layer)
9. [Telegram Integration](#9-telegram-integration)
10. [Sync Mechanisms](#10-sync-mechanisms)
11. [Critical Implementation Patterns](#11-critical-implementation-patterns)
12. [Deployment & Configuration](#12-deployment--configuration)
13. [Known Issues & Solutions](#13-known-issues--solutions)
14. [Development Guidelines](#14-development-guidelines)

---

## 1. Project Overview

### 1.1 What is BunBun?

BunBun is a **Telegram Mini App (TMA)** - an idle clicker/resource management game that runs entirely within Telegram. Players:

- **Tap** to earn BunnyZap (BZ) energy
- **Build** hardware upgrades to increase passive income
- **Convert** BZ to BunnyBucks (BB) premium currency
- **Complete** daily/weekly tasks and challenges
- **Collect** NFTs to boost stats
- **Refer** friends to earn rewards

### 1.2 Key Characteristics

- **Platform:** Telegram Mini App (Web-based, mobile-first)
- **Authentication:** Telegram native auth (no passwords)
- **Data Persistence:** Hybrid localStorage + Supabase sync
- **Offline Support:** Works offline, syncs when online
- **Real-time:** Uses Supabase Realtime for certain features

---

## 2. Architecture & Tech Stack

### 2.1 Frontend Stack

```
- Framework: Next.js 15.5 (Pages Router)
- Language: TypeScript (strict mode)
- UI Library: React 18.3
- Styling: Tailwind CSS v3.4
- Components: shadcn/ui (Radix UI primitives)
- Animations: Framer Motion
- Forms: React Hook Form + Zod validation
- State: React Context API (GameStateContext)
```

### 2.2 Backend Stack

```
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth + Telegram Auth
- Storage: Supabase Storage (for NFT images, future features)
- Edge Functions: Supabase Edge Functions (Deno runtime)
- Realtime: Supabase Realtime (WebSocket)
```

### 2.3 Infrastructure

```
- Hosting: Vercel (serverless Next.js)
- CDN: Vercel Edge Network
- Database: Supabase (managed PostgreSQL)
- Webhook Handler: Supabase Edge Functions
```

### 2.4 Project Structure

```
bunbun/
├── public/                    # Static assets
│   ├── bunergy-icon.png      # App icon
│   ├── bunny-character-*.png # Character assets
│   └── manifest.json         # PWA manifest
│
├── src/
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── screens/          # Main game screens
│   │   ├── SEO.tsx           # SEO component
│   │   ├── ThemeSwitch.tsx   # Dark mode toggle
│   │   ├── BottomNav.tsx     # Bottom navigation
│   │   ├── CompactDashboard.tsx
│   │   ├── ProfileModal.tsx
│   │   ├── TelegramBlocker.tsx
│   │   ├── TelegramDebugPanel.tsx
│   │   └── WelcomeScreen.tsx
│   │
│   ├── contexts/
│   │   ├── GameStateContext.tsx  # CENTRAL STATE MANAGER
│   │   └── ThemeProvider.tsx
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts         # Supabase client singleton
│   │       ├── types.ts          # Type exports
│   │       └── database.types.ts # Auto-generated DB types
│   │
│   ├── lib/
│   │   └── utils.ts          # Utility functions (cn, etc.)
│   │
│   ├── pages/
│   │   ├── _app.tsx          # App wrapper
│   │   ├── _document.tsx     # HTML document
│   │   ├── index.tsx         # Main game page
│   │   ├── profile.tsx       # Profile page
│   │   └── api/              # API routes
│   │       ├── telegram-webhook.ts
│   │       ├── create-stars-invoice.ts
│   │       └── test-auth.ts
│   │
│   ├── services/             # CRITICAL BUSINESS LOGIC LAYER
│   │   ├── authService.ts
│   │   ├── conversionService.ts
│   │   ├── hardwareService.ts
│   │   ├── referralService.ts
│   │   ├── rewardsService.ts
│   │   ├── rewardDataService.ts
│   │   ├── rewardStateService.ts
│   │   ├── syncService.ts
│   │   ├── tasksService.ts
│   │   ├── taskDataService.ts
│   │   ├── taskStateService.ts
│   │   ├── telegramAuthService.ts
│   │   └── weeklyChallengeSyncService.ts
│   │
│   ├── styles/
│   │   └── globals.css       # Global styles + Tailwind
│   │
│   └── types/
│       └── telegram.d.ts     # Telegram WebApp types
│
├── supabase/
│   ├── functions/            # Edge Functions
│   │   ├── telegram-webhook-handler/
│   │   └── telegram-auth/
│   └── migrations/           # SQL migrations (auto-generated)
│
├── scripts/
│   ├── setup-telegram-webhook.js
│   └── verify-deployment.js
│
├── .env.local                # Environment variables
├── next.config.mjs           # Next.js config
├── tailwind.config.ts        # Tailwind config
└── package.json              # Dependencies
```

---

## 3. Data Management Strategy

### 3.1 Hybrid Sync Architecture

BunBun uses a **dual-layer data persistence strategy**:

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERACTION                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │   GameStateContext (React State)    │
         │  - Instant UI updates                │
         │  - In-memory calculations            │
         └──────────┬──────────────┬────────────┘
                    │              │
        ┌───────────▼──────┐   ┌───▼───────────────┐
        │   localStorage   │   │  Supabase (PostgreSQL)  │
        │  - Offline cache │   │  - Source of truth      │
        │  - Fast reads    │   │  - Cross-device sync    │
        │  - Instant save  │   │  - Persistent storage   │
        └──────────────────┘   └─────────────────────────┘
```

### 3.2 Data Flow Principles

#### **Write Path:**
1. User action → Update React state (instant UI feedback)
2. Save to localStorage (fast, offline-capable)
3. Debounced sync to Supabase (network-efficient)

#### **Read Path:**
1. Load from localStorage (instant initial load)
2. Fetch from Supabase in background
3. Merge using `Math.max()` strategy (conflict resolution)
4. Update both localStorage and React state

#### **Sync Strategy:**
```typescript
// CRITICAL PATTERN: Math.max() for conflict resolution
const mergedValue = Math.max(
  localStorageValue || 0,
  supabaseValue || 0
);
```

**Why Math.max()?**
- Prevents data loss (always keeps highest value)
- Handles offline play (local changes preserved)
- Resolves multi-device conflicts (highest wins)
- Simple, deterministic, no complex CRDTs needed

### 3.3 What Goes Where?

| Data Type | localStorage | Supabase | Sync Method |
|-----------|-------------|----------|-------------|
| **BZ (BunnyZap)** | ✅ Primary | ✅ Backup | Math.max() |
| **BB (BunnyBucks)** | ✅ Primary | ✅ Backup | Math.max() |
| **XP** | ✅ Primary | ✅ Backup | Math.max() |
| **Total Taps** | ✅ Primary | ✅ Backup | Math.max() |
| **Total Upgrades** | ✅ Primary | ✅ Backup | Math.max() |
| **Purchased Upgrades** | ✅ Array | ✅ JSONB | Array merge |
| **Completed Tasks** | ✅ Set | ✅ user_tasks | Union |
| **Owned NFTs** | ✅ Set | ✅ user_nfts | Union |
| **Weekly Challenges** | ❌ Deprecated | ✅ Source of truth | Database-first |
| **Referrals** | ❌ None | ✅ Source of truth | Database-only |
| **Conversion History** | ❌ None | ✅ Source of truth | Database-only |

### 3.4 Critical localStorage Keys

```typescript
// Core resources
"bz"                    // BunnyZap (number)
"bb"                    // BunnyBucks (number)
"xp"                    // Experience Points (number)

// Counters
"totalTaps"             // Lifetime tap count
"totalTapIncome"        // Total BZ from taps
"totalUpgrades"         // Total hardware purchased
"totalConversions"      // Total BZ→BB conversions
"totalConversionEvents" // Number of conversions

// Hardware
"purchasedUpgrades"     // JSON array of upgrade IDs

// Tasks & Challenges (DEPRECATED - moved to Supabase)
// "completedTasks"     // Being migrated to user_tasks table
// "weeklyBaselines"    // Being migrated to user_weekly_challenges

// Session
"lastSaveTime"          // ISO timestamp
"lastSyncTime"          // ISO timestamp
"userId"                // Supabase user ID
"telegramId"            // Telegram user ID
```

---

## 4. Game Mechanics & Formulas

### 4.1 Core Resources

#### **BZ (BunnyZap)** 🔋
- **Purpose:** Primary energy resource
- **How to Earn:**
  - Manual tapping: `1 BZ per tap`
  - Passive income: `totalPassiveIncome BZ per second`
  - Task rewards: Variable (defined in `tasks` table)
- **How to Spend:**
  - Convert to BB: `1000 BZ = 1 BB`
  - (Future: Purchase special items)

#### **BB (BunnyBucks)** 💎
- **Purpose:** Premium currency
- **How to Earn:**
  - Convert from BZ: `1000 BZ → 1 BB`
  - Weekly challenges: `1000 BB` reward
  - Referral rewards: `100-500 BB per referral`
  - Task rewards: Variable
- **How to Spend:**
  - Purchase NFTs: `500-5000 BB per NFT`
  - (Future: Premium upgrades, cosmetics)

#### **XP (Experience Points)** ⭐
- **Purpose:** Progression metric, unlocks tiers
- **How to Earn:**
  - Manual taps: `1 XP per tap`
  - Hardware purchases: `XP = upgrade cost * 0.1`
  - Task completion: Variable (500-10,000 XP)
  - Weekly challenges: `5000 XP per challenge`
- **XP Tiers:**
  ```typescript
  const XP_TIERS = [
    { name: "Newbie", minXP: 0, color: "gray" },
    { name: "Bronze", minXP: 10000, color: "orange" },
    { name: "Silver", minXP: 50000, color: "silver" },
    { name: "Gold", minXP: 150000, color: "yellow" },
    { name: "Platinum", minXP: 300000, color: "cyan" },
    { name: "Diamond", minXP: 500000, color: "blue" },
    { name: "Master", minXP: 1000000, color: "purple" },
    { name: "Legend", minXP: 2000000, color: "red" }
  ];
  ```

### 4.2 Passive Income System

#### **Hardware Upgrades:**
Each upgrade has:
- `baseIncome`: BZ/second generated
- `cost`: BZ cost to purchase (increases with each purchase)
- `level`: Number of times purchased (0+)

#### **Total Passive Income Calculation:**
```typescript
const totalPassiveIncome = purchasedUpgrades.reduce((sum, upgradeId) => {
  const upgrade = findUpgradeById(upgradeId);
  return sum + (upgrade?.baseIncome || 0);
}, 0);

// Applied every second via useEffect in GameStateContext
setBZ(prev => prev + totalPassiveIncome);
```

#### **Dynamic Pricing:**
```typescript
// Upgrades get more expensive as you buy more
const currentCost = baseCost * Math.pow(1.15, currentLevel);
```

### 4.3 Conversion System

#### **BZ → BB Conversion:**
```typescript
const CONVERSION_RATE = 1000; // 1000 BZ = 1 BB

function convertBZtoBB(bzAmount: number): number {
  if (bzAmount < CONVERSION_RATE) return 0;
  
  const bbEarned = Math.floor(bzAmount / CONVERSION_RATE);
  const bzSpent = bbEarned * CONVERSION_RATE;
  
  // Deduct BZ, add BB
  setBZ(prev => prev - bzSpent);
  setBB(prev => prev + bbEarned);
  
  // Track conversion
  setTotalConversions(prev => prev + bzSpent);
  setTotalConversionEvents(prev => prev + 1);
  
  // Save to database
  await supabase.from("conversion_history").insert({
    user_id: userId,
    bz_spent: bzSpent,
    bb_earned: bbEarned
  });
  
  return bbEarned;
}
```

### 4.4 Task System

#### **Task Types:**
- **Social:** Follow, join channel, invite friends
- **Achievement:** Reach XP tier, complete X taps
- **Daily:** Reset every 24 hours
- **Weekly:** Reset every Monday 00:00 UTC

#### **Task State Machine:**
```typescript
type TaskStatus = "available" | "claimed";

// Task completion flow:
1. User completes external action (joins channel, etc.)
2. User clicks "Claim" button
3. Verify completion (if possible via Telegram API)
4. Award reward (XP + optional BB)
5. Mark as claimed in user_tasks table
6. Update local state
```

#### **Task Verification:**
Most tasks use **honor system** (user clicks "Claim" when done). Some tasks have automatic verification:
- XP milestones: Checked against user's XP
- Tap count: Checked against totalTaps
- Upgrade count: Checked against totalUpgrades

### 4.5 Weekly Challenges

#### **Challenge Types:**
```typescript
type ChallengeKey = "tapper" | "builder" | "converter" | "recruiter";

const CHALLENGES = {
  tapper: {
    name: "Tap Master",
    description: "Tap 100,000 times",
    target: 100000,
    reward: { type: "XP", amount: 5000 }
  },
  builder: {
    name: "Builder",
    description: "Buy 10 upgrades",
    target: 10,
    reward: { type: "XP", amount: 5000 }
  },
  converter: {
    name: "Exchange Guru",
    description: "Convert 10 times",
    target: 10,
    reward: { type: "XP", amount: 5000 }
  },
  recruiter: {
    name: "Networker",
    description: "Invite 5 friends",
    target: 5,
    reward: { type: "BB", amount: 1000 }
  }
};
```

#### **Progress Calculation (CRITICAL):**
```typescript
// Each challenge tracks a baseline value set at week start
// Progress = current value - baseline value

// Example: Exchange Guru challenge
const baseline = challenge.baselineValue; // e.g., 50 (conversions at week start)
const current = totalConversionEvents;    // e.g., 58 (current total)
const progress = Math.max(0, current - baseline); // 8 conversions this week
const isCompleted = progress >= challenge.targetValue; // 8 >= 10 = false
```

#### **Weekly Reset Logic:**
```typescript
// Every Monday 00:00 UTC
function resetWeeklyChallenges() {
  const newBaselines = {
    taps: totalTaps,              // Current total becomes new baseline
    upgrades: totalUpgrades,
    conversionEvents: totalConversionEvents,
    referrals: referralCount
  };
  
  // Delete old week's challenges
  // Create new week's challenges with updated baselines
  await initializeWeeklyChallenges(userId, telegramId, newBaselines);
}
```

### 4.6 Referral System

#### **Referral Flow:**
```
1. User clicks "Invite Friends" → generates referral link
2. Friend clicks link → opens BunBun with ?startapp=referral_code_USERID
3. Friend signs in via Telegram Auth
4. Edge Function detects referral code in /start command
5. Creates referral record in database
6. Awards rewards to both users:
   - Referrer: +100 BB, +1000 XP
   - Referee: +50 BB, +500 XP
```

#### **Referral Link Format:**
```
https://t.me/YourBotUsername?startapp=referral_code_123456789
```

#### **Reward Tiers (Future Enhancement):**
```typescript
const REFERRAL_REWARDS = [
  { count: 1, reward: { bb: 100, xp: 1000 } },
  { count: 5, reward: { bb: 500, xp: 5000 } },
  { count: 10, reward: { bb: 1000, xp: 10000 } },
  { count: 25, reward: { bb: 2500, xp: 25000 } }
];
```

---

## 5. Database Schema

### 5.1 Core Tables

#### **profiles** (User Data)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  
  -- Resources
  bz NUMERIC DEFAULT 0,
  bb NUMERIC DEFAULT 0,
  xp NUMERIC DEFAULT 0,
  
  -- Counters
  total_taps BIGINT DEFAULT 0,
  total_tap_income NUMERIC DEFAULT 0,
  total_upgrades INTEGER DEFAULT 0,
  total_conversions NUMERIC DEFAULT 0,
  total_conversion_events INTEGER DEFAULT 0,
  
  -- Hardware (JSONB array of upgrade IDs)
  purchased_upgrades JSONB DEFAULT '[]'::jsonb,
  
  -- Referrals
  referral_count INTEGER DEFAULT 0,
  referred_by UUID REFERENCES profiles(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Session
  last_save_time TIMESTAMP WITH TIME ZONE,
  last_sync_time TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_profiles_telegram_id ON profiles(telegram_id);
CREATE INDEX idx_profiles_referred_by ON profiles(referred_by);
CREATE INDEX idx_profiles_xp ON profiles(xp);
```

#### **tasks** (Task Definitions)
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL, -- 'social', 'achievement', 'daily', 'weekly'
  category TEXT,           -- 'telegram', 'milestone', etc.
  
  -- Rewards
  reward_type TEXT NOT NULL, -- 'xp', 'bb', 'both'
  reward_amount INTEGER NOT NULL,
  
  -- Requirements
  requirement_type TEXT,     -- 'xp', 'taps', 'upgrades', 'none'
  requirement_value INTEGER DEFAULT 0,
  
  -- External links
  action_url TEXT,
  
  -- Metadata
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **user_tasks** (User Task Completion)
```sql
CREATE TABLE user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, task_id)
);

CREATE INDEX idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX idx_user_tasks_telegram_id ON user_tasks(telegram_id);
```

#### **user_weekly_challenges** (Weekly Challenge Progress)
```sql
CREATE TABLE user_weekly_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  
  week_start_date DATE NOT NULL,
  challenge_key TEXT NOT NULL, -- 'tapper', 'builder', 'converter', 'recruiter'
  
  baseline_value INTEGER NOT NULL,    -- Value at week start
  current_progress INTEGER DEFAULT 0, -- Progress this week (current - baseline)
  target_value INTEGER NOT NULL,      -- Goal to reach
  
  completed BOOLEAN DEFAULT false,
  claimed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, week_start_date, challenge_key)
);

CREATE INDEX idx_weekly_challenges_user ON user_weekly_challenges(user_id, week_start_date);
```

#### **nfts** (NFT Definitions)
```sql
CREATE TABLE nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  
  price_bb INTEGER NOT NULL,
  
  -- Requirements to unlock
  requirement_type TEXT, -- 'xp', 'referrals', 'upgrades', 'taps', 'none'
  requirement_value INTEGER DEFAULT 0,
  
  -- Stats boost (future feature)
  boost_type TEXT,
  boost_value NUMERIC,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **user_nfts** (User NFT Ownership)
```sql
CREATE TABLE user_nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nft_id UUID NOT NULL REFERENCES nfts(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, nft_id)
);
```

#### **referrals** (Referral Tracking)
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referrer_telegram_id BIGINT NOT NULL,
  referee_telegram_id BIGINT NOT NULL,
  
  referrer_rewarded BOOLEAN DEFAULT false,
  referee_rewarded BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(referee_id)
);
```

#### **conversion_history** (BZ→BB Conversion Log)
```sql
CREATE TABLE conversion_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  
  bz_spent NUMERIC NOT NULL,
  bb_earned NUMERIC NOT NULL,
  exchange_rate NUMERIC DEFAULT 1000,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_conversion_history_user ON conversion_history(user_id);
CREATE INDEX idx_conversion_history_created ON conversion_history(created_at);
```

#### **build_parts** (Hardware Upgrade Definitions)
```sql
CREATE TABLE build_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  
  base_cost INTEGER NOT NULL,
  base_income NUMERIC NOT NULL,
  
  icon TEXT,
  image_url TEXT,
  
  order_index INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.2 Row Level Security (RLS) Policies

**CRITICAL:** All tables have RLS enabled. Users can only access their own data.

```sql
-- Example: profiles table policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Same pattern for all user-specific tables
```

---

## 6. State Management

### 6.1 GameStateContext (Central State Manager)

**Location:** `src/contexts/GameStateContext.tsx`

**Purpose:** Single source of truth for all game state in React components.

#### **State Variables:**
```typescript
interface GameState {
  // User Identity
  userId: string | null;
  telegramId: number | null;
  username: string | null;
  
  // Resources
  bz: number;
  bb: number;
  xp: number;
  
  // Counters
  totalTaps: number;
  totalTapIncome: number;
  totalUpgrades: number;
  totalConversions: number;
  totalConversionEvents: number;
  
  // Hardware
  purchasedUpgrades: string[];
  
  // Passive Income
  totalPassiveIncome: number;
  
  // Referrals
  referralCount: number;
  
  // Session
  lastSaveTime: string;
  
  // Weekly Challenges
  currentWeeklyPeriodStart: string;
  
  // UI State
  isLoading: boolean;
  isSyncing: boolean;
  syncStatus: string;
}
```

#### **Critical Methods:**
```typescript
// Resource modifiers
addBZ(amount: number): void;
addBB(amount: number): void;
addXP(amount: number): void;

// Actions
handleTap(): void;              // +1 BZ, +1 XP, +1 totalTaps
handleUpgradePurchase(upgradeId: string, cost: number): void;
handleConversion(bzAmount: number): number;

// Sync
saveToLocalStorage(): void;     // Immediate save
syncWithSupabase(): Promise<void>; // Debounced sync

// Weekly reset
resetWeeklyPeriod(): void;
```

#### **Lifecycle Hooks:**

```typescript
// 1. Initial Load (on mount)
useEffect(() => {
  loadFromLocalStorage();
  authenticateUser();
  syncWithSupabase();
}, []);

// 2. Passive Income (every second)
useEffect(() => {
  const interval = setInterval(() => {
    addBZ(totalPassiveIncome);
  }, 1000);
  return () => clearInterval(interval);
}, [totalPassiveIncome]);

// 3. Auto-save (every 5 seconds)
useEffect(() => {
  const interval = setInterval(() => {
    saveToLocalStorage();
  }, 5000);
  return () => clearInterval(interval);
}, [/* all state vars */]);

// 4. Auto-sync (every 30 seconds)
useEffect(() => {
  const interval = setInterval(() => {
    syncWithSupabase();
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## 7. Screen Components

### 7.1 TapScreen (Main Game)

**File:** `src/components/screens/TapScreen.tsx`

**Features:**
- Manual tap button (earns BZ + XP)
- Animated bunny character
- Resource display (BZ, BB, XP)
- Passive income ticker

**Key Interactions:**
```typescript
const handleTap = () => {
  addBZ(1);
  addXP(1);
  setTotalTaps(prev => prev + 1);
  setTotalTapIncome(prev => prev + 1);
  
  // Visual feedback
  triggerTapAnimation();
};
```

### 7.2 BuildScreen (Hardware Upgrades)

**File:** `src/components/screens/BuildScreen.tsx`

**Features:**
- Grid of purchasable hardware upgrades
- Dynamic pricing (increases with level)
- Category filtering
- Purchase confirmation

**Purchase Logic:**
```typescript
const handlePurchase = async (upgrade) => {
  const currentCost = upgrade.base_cost * Math.pow(1.15, currentLevel);
  
  if (bz < currentCost) return; // Can't afford
  
  // Deduct cost, add to owned upgrades
  addBZ(-currentCost);
  setPurchasedUpgrades(prev => [...prev, upgrade.id]);
  setTotalUpgrades(prev => prev + 1);
  
  // Award XP (10% of cost)
  addXP(Math.floor(currentCost * 0.1));
  
  // Recalculate passive income
  recalculatePassiveIncome();
  
  // Save to database
  await syncService.syncProfile();
};
```

### 7.3 ConvertScreen (BZ → BB Exchange)

**File:** `src/components/screens/ConvertScreen.tsx`

**Features:**
- Input field for BZ amount
- Real-time BB calculation preview
- Conversion history log
- Exchange rate display

**Conversion Logic:**
```typescript
const handleConvert = async (bzAmount) => {
  const RATE = 1000;
  
  if (bzAmount < RATE) return;
  
  const bbEarned = Math.floor(bzAmount / RATE);
  const bzSpent = bbEarned * RATE;
  
  addBZ(-bzSpent);
  addBB(bbEarned);
  setTotalConversions(prev => prev + bzSpent);
  setTotalConversionEvents(prev => prev + 1);
  
  // Log to database
  await conversionService.logConversion(userId, bzSpent, bbEarned);
};
```

### 7.4 RewardsNFTsScreen (Tasks, Challenges, NFTs)

**File:** `src/components/screens/RewardsNFTsScreen.tsx`

**Features:**
- **Weekly Challenges Tab:**
  - 4 weekly challenges (Tapper, Builder, Converter, Recruiter)
  - Progress bars with real-time updates
  - Claim buttons when completed
  
- **NFT Collection Tab:**
  - Grid of collectible NFTs
  - Purchase with BB
  - Locked until requirements met

**Challenge Claim Logic:**
```typescript
const handleClaimChallenge = async (challengeKey, reward) => {
  // Mark as claimed in database
  await weeklyChallengeSyncService.claimChallengeReward(userId, challengeKey);
  
  // Award reward
  if (reward.type === "XP") {
    addXP(reward.amount);
  } else {
    addBB(reward.amount);
  }
  
  // Refresh challenges
  reloadChallenges();
};
```

### 7.5 TasksReferralsScreen (Social Tasks)

**File:** `src/components/screens/TasksReferralsScreen.tsx`

**Features:**
- **Tasks Tab:**
  - List of available tasks
  - Claim buttons
  - Task status tracking
  
- **Referrals Tab:**
  - Referral link generator
  - Referral count display
  - Reward history

**Task Claim Logic:**
```typescript
const handleClaimTask = async (task) => {
  // Check if already claimed
  if (completedTasks.has(task.id)) return;
  
  // Check requirements
  if (!meetsRequirements(task)) return;
  
  // Award rewards
  if (task.reward_type === "xp" || task.reward_type === "both") {
    addXP(task.reward_amount);
  }
  if (task.reward_type === "bb" || task.reward_type === "both") {
    addBB(task.reward_amount);
  }
  
  // Mark as claimed
  await tasksService.claimTask(userId, task.id);
  setCompletedTasks(prev => new Set([...prev, task.id]));
};
```

---

## 8. Service Layer

### 8.1 syncService (Database Sync)

**File:** `src/services/syncService.ts`

**Purpose:** Bidirectional sync between localStorage and Supabase.

**Key Functions:**

```typescript
// Load user data from Supabase
async function loadUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  
  return data;
}

// Sync local state to Supabase (with Math.max merge)
async function syncProfile(userId: string, localData: GameState) {
  // Fetch current server data
  const serverData = await loadUserProfile(userId);
  
  // Merge using Math.max for resources
  const mergedData = {
    bz: Math.max(localData.bz, serverData.bz || 0),
    bb: Math.max(localData.bb, serverData.bb || 0),
    xp: Math.max(localData.xp, serverData.xp || 0),
    total_taps: Math.max(localData.totalTaps, serverData.total_taps || 0),
    total_upgrades: Math.max(localData.totalUpgrades, serverData.total_upgrades || 0),
    // ... etc
  };
  
  // Update Supabase
  await supabase
    .from("profiles")
    .upsert({ id: userId, ...mergedData });
  
  return mergedData;
}
```

### 8.2 tasksService (Task Management)

**File:** `src/services/tasksService.ts`

**Functions:**
- `loadTasks()`: Fetch all active tasks
- `loadUserTasks(userId)`: Get user's completed tasks
- `claimTask(userId, taskId)`: Mark task as claimed
- `checkTaskRequirements(task, userState)`: Verify eligibility

### 8.3 weeklyChallengeSyncService (Challenge Logic)

**File:** `src/services/weeklyChallengeSyncService.ts`

**Functions:**
```typescript
// Initialize challenges for new week
async function initializeWeeklyChallenges(
  userId: string,
  telegramId: number,
  baselines: { taps, upgrades, conversionEvents, referrals }
) {
  const weekStart = getWeekStartDate();
  
  const challenges = [
    { key: "tapper", baseline: baselines.taps, target: 100000 },
    { key: "builder", baseline: baselines.upgrades, target: 10 },
    { key: "converter", baseline: baselines.conversionEvents, target: 10 },
    { key: "recruiter", baseline: baselines.referrals, target: 5 }
  ];
  
  await supabase.from("user_weekly_challenges").insert(
    challenges.map(c => ({
      user_id: userId,
      telegram_id: telegramId,
      week_start_date: weekStart,
      challenge_key: c.key,
      baseline_value: c.baseline,
      target_value: c.target,
      current_progress: 0
    }))
  );
}

// Update challenge progress
async function updateChallengeProgress(
  userId: string,
  challengeKey: string,
  newProgress: number,
  completed: boolean
) {
  await supabase
    .from("user_weekly_challenges")
    .update({ current_progress: newProgress, completed })
    .eq("user_id", userId)
    .eq("challenge_key", challengeKey)
    .eq("week_start_date", getWeekStartDate());
}

// Claim challenge reward
async function claimChallengeReward(userId: string, challengeKey: string) {
  await supabase
    .from("user_weekly_challenges")
    .update({ claimed: true })
    .eq("user_id", userId)
    .eq("challenge_key", challengeKey)
    .eq("week_start_date", getWeekStartDate());
}
```

### 8.4 referralService (Referral Management)

**File:** `src/services/referralService.ts`

**Functions:**
- `createReferral(referrerId, refereeId)`: Record new referral
- `getReferralCount(userId)`: Get total referrals
- `awardReferralRewards(referrerId, refereeId)`: Give rewards to both users

---

## 9. Telegram Integration

### 9.1 Telegram WebApp SDK

**Initialization:**
```typescript
// src/pages/_app.tsx
useEffect(() => {
  if (typeof window !== "undefined" && window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
  }
}, []);
```

**User Data Access:**
```typescript
const telegram = window.Telegram?.WebApp;
const user = telegram?.initDataUnsafe?.user;

if (user) {
  const {
    id,           // Telegram user ID
    username,
    first_name,
    last_name,
    photo_url
  } = user;
}
```

### 9.2 Telegram Authentication

**Flow:**
1. User opens Mini App in Telegram
2. Telegram WebApp SDK provides `initData` (cryptographically signed)
3. Frontend sends `initData` to `/api/telegram-webhook.ts`
4. Backend verifies signature using bot token
5. If valid, create/update user in Supabase Auth + profiles table
6. Return session token to frontend

**Edge Function:** `supabase/functions/telegram-auth/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { initData } = await req.json();
  
  // Verify Telegram signature
  const isValid = verifyTelegramWebAppData(initData, BOT_TOKEN);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }
  
  // Parse user data
  const user = parseTelegramInitData(initData);
  
  // Create/update in Supabase Auth
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: authData } = await supabase.auth.admin.createUser({
    email: `${user.id}@telegram.user`,
    email_confirm: true,
    user_metadata: { telegram_id: user.id, username: user.username }
  });
  
  // Create/update profile
  await supabase.from("profiles").upsert({
    id: authData.user.id,
    telegram_id: user.id,
    username: user.username,
    first_name: user.first_name
  });
  
  return new Response(JSON.stringify({ session: authData.session }));
});
```

### 9.3 Bot Webhook Handler

**Purpose:** Handle Telegram bot commands (e.g., `/start` with referral codes)

**Edge Function:** `supabase/functions/telegram-webhook-handler/index.ts`

```typescript
serve(async (req) => {
  const update = await req.json();
  
  // Handle /start command
  if (update.message?.text?.startsWith("/start")) {
    const text = update.message.text;
    const userId = update.message.from.id;
    
    // Check for referral code
    const match = text.match(/referral_code_(\d+)/);
    if (match) {
      const referrerId = match[1];
      
      // Record referral in database
      await createReferral(referrerId, userId);
      
      // Award rewards
      await awardReferralRewards(referrerId, userId);
    }
  }
  
  return new Response("OK");
});
```

---

## 10. Sync Mechanisms

### 10.1 Initial Load Sequence

```
┌─────────────────────────────────────────────────────────────┐
│  1. Page loads → GameStateContext mounts                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │  2. Load from localStorage           │
         │     (instant UI hydration)           │
         └──────────┬──────────────────────────┘
                    │
                    ▼
         ┌─────────────────────────────────────┐
         │  3. Authenticate with Telegram       │
         │     (get userId from initData)       │
         └──────────┬──────────────────────────┘
                    │
                    ▼
         ┌─────────────────────────────────────┐
         │  4. Fetch from Supabase              │
         │     (background async load)          │
         └──────────┬──────────────────────────┘
                    │
                    ▼
         ┌─────────────────────────────────────┐
         │  5. Merge using Math.max()           │
         │     (resolve conflicts)              │
         └──────────┬──────────────────────────┘
                    │
                    ▼
         ┌─────────────────────────────────────┐
         │  6. Update React state + localStorage│
         │     (UI now shows merged data)       │
         └──────────────────────────────────────┘
```

### 10.2 Continuous Sync Strategy

**Pattern:** Optimistic UI + Eventual Consistency

```typescript
// User action (e.g., tap, purchase)
function handleUserAction() {
  // 1. Update React state immediately (optimistic)
  setResourceValue(newValue);
  
  // 2. Save to localStorage (fast, offline-capable)
  localStorage.setItem("resourceKey", newValue);
  
  // 3. Debounced Supabase update (batched, network-efficient)
  debouncedSyncToSupabase();
}

// Debounced sync (fires after 2 seconds of inactivity)
const debouncedSyncToSupabase = debounce(async () => {
  await syncService.syncProfile(userId, getCurrentState());
}, 2000);
```

### 10.3 Conflict Resolution (Math.max Strategy)

**Scenario:** User plays on 2 devices simultaneously

```
Device A (offline):          Device B (online):
- Tap 100 times             - Tap 50 times
- BZ = 1100                 - BZ = 1050
- Save to localStorage      - Save to Supabase

[Later, Device A comes online]

Sync Process:
1. Device A fetches Supabase data (BZ = 1050)
2. Device A compares: local=1100, server=1050
3. Math.max(1100, 1050) = 1100
4. Device A uploads 1100 to Supabase
5. Both devices now show 1100 BZ ✅

No data lost!
```

### 10.4 Array/Set Merging (Purchased Upgrades, Completed Tasks)

**Challenge:** Arrays can't use Math.max()

**Solution:** Set union

```typescript
// Merge purchased upgrades
const localUpgrades = new Set(localStorage.purchasedUpgrades);
const serverUpgrades = new Set(supabaseData.purchased_upgrades);

const mergedUpgrades = new Set([
  ...localUpgrades,
  ...serverUpgrades
]);

// Update both sources
const upgradesArray = Array.from(mergedUpgrades);
localStorage.setItem("purchasedUpgrades", JSON.stringify(upgradesArray));
await supabase.from("profiles").update({
  purchased_upgrades: upgradesArray
});
```

---

## 11. Critical Implementation Patterns

### 11.1 Debouncing (Network Efficiency)

```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Usage
const debouncedSync = debounce(() => syncWithSupabase(), 2000);
```

### 11.2 Optimistic Updates

```typescript
// BAD: Wait for server before updating UI
async function handlePurchase(upgrade) {
  const result = await supabase.from("profiles").update({ ... });
  if (result.error) return;
  
  // UI only updates after 500ms+ network delay 😞
  setResourceValue(newValue);
}

// GOOD: Update UI immediately, handle errors separately
async function handlePurchase(upgrade) {
  // Instant UI feedback ⚡
  setResourceValue(newValue);
  localStorage.setItem("key", newValue);
  
  // Background sync (non-blocking)
  syncToSupabase().catch(error => {
    // Rollback if failed
    setResourceValue(oldValue);
    showErrorToast("Purchase failed, please try again");
  });
}
```

### 11.3 localStorage Error Handling

```typescript
function safeLocalStorageGet<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`localStorage read failed for key: ${key}`, error);
    return defaultValue;
  }
}

function safeLocalStorageSet(key: string, value: any): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`localStorage write failed for key: ${key}`, error);
    // Handle quota exceeded, privacy mode, etc.
    return false;
  }
}
```

### 11.4 Type-Safe Database Queries

```typescript
import type { Database } from "@/integrations/supabase/types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Type-safe query
const { data, error } = await supabase
  .from("tasks")
  .select("*")
  .eq("is_active", true)
  .returns<Task[]>();

// TypeScript knows data is Task[] | null
if (data) {
  data.forEach(task => {
    console.log(task.title); // ✅ Type-safe access
  });
}
```

---

## 12. Deployment & Configuration

### 12.1 Environment Variables

**File:** `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (Edge Functions only)

# Telegram Bot
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=YourBotUsername
TELEGRAM_BOT_TOKEN=your-bot-token (Edge Functions only)

# App
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

### 12.2 Vercel Deployment

**Automatic Deployment:**
1. Push to `main` branch on GitHub
2. Vercel auto-deploys to production
3. Edge Functions deploy to Supabase automatically

**Build Configuration:**
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

### 12.3 Telegram Bot Setup

**Steps:**
1. Create bot via [@BotFather](https://t.me/BotFather)
2. Set bot commands:
   ```
   /start - Start BunBun
   /help - Get help
   ```
3. Set webhook URL (Edge Function):
   ```bash
   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
     -H "Content-Type: application/json" \
     -d '{"url":"https://your-project.supabase.co/functions/v1/telegram-webhook-handler"}'
   ```
4. Set Mini App URL in BotFather:
   ```
   https://your-vercel-app.vercel.app
   ```

### 12.4 Supabase Setup

**Initial Setup:**
1. Create Supabase project
2. Run migrations: `supabase db push`
3. Enable Realtime (optional)
4. Configure RLS policies
5. Deploy Edge Functions:
   ```bash
   supabase functions deploy telegram-auth
   supabase functions deploy telegram-webhook-handler
   ```

---

## 13. Known Issues & Solutions

### 13.1 Weekly Challenges Not Loading

**Symptom:** "Loading challenges..." stuck on screen

**Cause:** `userId` or `telegramId` not set when useEffect runs

**Solution:**
```typescript
// Add guard clause
useEffect(() => {
  if (!userId || !telegramId || challengesLoaded) return;
  
  // Load challenges...
}, [userId, telegramId, challengesLoaded]);
```

### 13.2 Exchange Guru Challenge Progress Incorrect

**Symptom:** Challenge shows completed when it shouldn't be

**Cause:** Using `totalConversionEvents` directly instead of delta from baseline

**Solution:**
```typescript
// WRONG
const progress = totalConversionEvents;

// CORRECT
const progress = Math.max(0, totalConversionEvents - challenge.baselineValue);
```

### 13.3 Hydration Mismatches (SSR/CSR Differences)

**Symptom:** React hydration errors in console

**Cause:** Server renders different content than client (e.g., timestamps, random values)

**Solution:**
```typescript
// Use mounted state
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

if (!mounted) return null; // Prevent SSR render

return <div>{new Date().toLocaleString()}</div>;
```

### 13.4 localStorage Quota Exceeded

**Symptom:** Data not saving to localStorage

**Cause:** 5-10MB limit in browsers

**Solution:**
```typescript
// Implement cleanup
function cleanupOldData() {
  const keys = Object.keys(localStorage);
  
  // Remove deprecated keys
  keys.forEach(key => {
    if (key.startsWith("deprecated_")) {
      localStorage.removeItem(key);
    }
  });
}
```

---

## 14. Development Guidelines

### 14.1 Code Style

- **TypeScript:** Always use explicit types, avoid `any`
- **Components:** Functional components with hooks only
- **File naming:** PascalCase for components, camelCase for utilities
- **Imports:** Use `@/` alias for absolute imports
- **CSS:** Tailwind utility classes preferred over custom CSS

### 14.2 Performance Best Practices

1. **Lazy load screens:**
   ```typescript
   const RewardsScreen = dynamic(() => import("@/components/screens/RewardsNFTsScreen"));
   ```

2. **Memoize expensive calculations:**
   ```typescript
   const totalPassiveIncome = useMemo(() => {
     return purchasedUpgrades.reduce(...);
   }, [purchasedUpgrades]);
   ```

3. **Debounce network calls:**
   ```typescript
   const debouncedSync = useCallback(
     debounce(() => syncWithSupabase(), 2000),
     []
   );
   ```

### 14.3 Testing Strategy

**Manual Testing Checklist:**
- [ ] Tap functionality works
- [ ] Passive income accumulates
- [ ] Upgrades purchased correctly
- [ ] BZ → BB conversion accurate
- [ ] Tasks can be claimed
- [ ] Weekly challenges track progress
- [ ] Referral links work
- [ ] NFTs can be purchased
- [ ] Data syncs between devices
- [ ] Works offline
- [ ] Dark mode toggles correctly

**Automated Testing (Future):**
- Unit tests for game formulas
- Integration tests for sync logic
- E2E tests for critical user flows

### 14.4 Database Migration Workflow

1. **Local development:**
   ```bash
   supabase migration new add_new_feature
   # Edit migration file
   supabase db reset # Apply locally
   ```

2. **Production deployment:**
   ```bash
   supabase db push # Apply to production
   ```

3. **Rollback (if needed):**
   ```sql
   -- Create reverse migration
   -- e.g., DROP TABLE that was created
   ```

---

## 15. Future Enhancements

### 15.1 Planned Features

1. **Leaderboards:**
   - Global XP rankings
   - Weekly challenge winners
   - Referral count rankings

2. **Social Features:**
   - Friend list
   - Visit friends' profiles
   - Send gifts (BZ/BB)

3. **Advanced Hardware:**
   - Upgrade tiers (Bronze → Silver → Gold)
   - Special abilities (2x income for 10min)
   - Synergy bonuses (buy all in category = +20%)

4. **Events:**
   - Limited-time challenges
   - Seasonal themes
   - Community goals

5. **Premium Features:**
   - Remove ads (Telegram Ads)
   - Exclusive NFTs
   - Boosters (XP multiplier, etc.)

### 15.2 Technical Debt

1. **Migrate remaining localStorage to Supabase:**
   - Completed tasks → `user_tasks` table (IN PROGRESS)
   - Weekly baselines → `user_weekly_challenges` (DONE)

2. **Implement proper error boundaries:**
   - Graceful fallbacks for component failures
   - Error reporting to monitoring service

3. **Add comprehensive logging:**
   - User actions (for analytics)
   - Sync events (for debugging)
   - Error tracking (Sentry integration)

4. **Performance optimization:**
   - Code splitting for screens
   - Image optimization (Next.js Image component)
   - Bundle size reduction

---

## Appendix A: Quick Reference

### Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # Lint code

# Supabase
supabase start           # Start local Supabase
supabase db reset        # Reset local DB
supabase functions deploy # Deploy Edge Functions
supabase gen types typescript --local > src/integrations/supabase/database.types.ts

# Vercel
vercel                   # Deploy to preview
vercel --prod            # Deploy to production
```

### Key URLs

- **Production App:** https://bunbun.vercel.app
- **Supabase Dashboard:** https://app.supabase.com/project/your-project
- **Telegram Bot:** https://t.me/YourBotUsername
- **GitHub Repo:** https://github.com/yourusername/bunbun

---

## Appendix B: Troubleshooting Guide

### Issue: User can't authenticate

**Check:**
1. Telegram WebApp SDK loaded? (`window.Telegram?.WebApp`)
2. `initData` present? (`telegram.initDataUnsafe`)
3. Edge Function responding? (Check Supabase logs)
4. RLS policies correct?

### Issue: Data not syncing

**Check:**
1. Network connectivity (offline mode?)
2. Supabase credentials valid?
3. RLS policies allowing access?
4. Console errors in browser?

### Issue: Passive income not working

**Check:**
1. `totalPassiveIncome` calculated correctly?
2. `useEffect` interval running?
3. Component re-rendering on state changes?

---

**End of Documentation**

*This document should be updated whenever major features are added or architecture changes. Treat it as living documentation.*