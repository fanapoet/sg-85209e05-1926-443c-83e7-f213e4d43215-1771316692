# BunBun - Telegram Mini App (TMA)
## Complete Product & Technical Specification

**Version:** 1.0  
**Document Type:** Product Requirements + Technical Architecture  
**Audience:** Development Teams  
**Purpose:** Complete understanding of BunBun's game mechanics, data architecture, and system design

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Game Mechanics](#2-game-mechanics)
3. [Resource System](#3-resource-system)
4. [Progression & XP Tiers](#4-progression--xp-tiers)
5. [Hardware Upgrade System](#5-hardware-upgrade-system)
6. [Conversion System](#6-conversion-system)
7. [Task System](#7-task-system)
8. [Weekly Challenges](#8-weekly-challenges)
9. [Referral System](#9-referral-system)
10. [NFT Collection](#10-nft-collection)
11. [Data Architecture](#11-data-architecture)
12. [Sync Strategy](#12-sync-strategy)
13. [Telegram Integration](#13-telegram-integration)
14. [User Interface](#14-user-interface)
15. [Business Rules & Validation](#15-business-rules--validation)

---

## 1. Product Overview

### 1.1 What is BunBun?

BunBun is a **Telegram Mini App** - an idle clicker/resource management game that runs entirely inside Telegram messenger. Players collect energy (BunnyZap/BZ), convert it to premium currency (BunnyBucks/BB), purchase hardware upgrades for passive income, and complete challenges to progress.

### 1.2 Core Gameplay Loop

```
Tap → Earn BZ → Buy Upgrades → Earn Passive BZ → Convert BZ to BB → 
Complete Tasks/Challenges → Earn More Resources → Progress to Higher Tiers
```

### 1.3 Key Features

- **Manual Tapping:** Earn resources by tapping the screen
- **Passive Income:** Hardware upgrades generate BZ automatically
- **Currency Conversion:** Exchange BZ for premium BB currency
- **Task System:** Complete social and achievement tasks for rewards
- **Weekly Challenges:** Time-limited goals that reset weekly
- **Referral Program:** Invite friends to earn bonuses
- **NFT Collection:** Purchase collectible NFTs with BB
- **Progression Tiers:** 8 XP-based tiers from Newbie to Legend
- **Offline Play:** Works without internet, syncs when online

---

## 2. Game Mechanics

### 2.1 Core Mechanics

#### Manual Tapping
- **Action:** User taps the bunny character
- **Reward:** +1 BZ, +1 XP per tap
- **Counter:** Tracks total lifetime taps
- **Purpose:** Primary early-game resource generation

#### Passive Income
- **Source:** Hardware upgrades purchased with BZ
- **Rate:** Each upgrade generates X BZ per second
- **Accumulation:** Runs continuously, even when app is closed
- **Calculation:** Total passive income = sum of all owned upgrades' income rates

#### Resource Flow
```
Manual Tap → +1 BZ, +1 XP, +1 total_taps
Passive Income → +X BZ per second (based on upgrades)
Purchase Upgrade → -Cost BZ, +Passive Income Rate, +XP (10% of cost)
Convert Currency → -1000 BZ, +1 BB
Complete Task → +XP, +BB (varies by task)
Complete Challenge → +XP or +BB (varies by challenge)
```

---

## 3. Resource System

### 3.1 BunnyZap (BZ) 🔋

**Type:** Primary Energy Resource

**How to Earn:**
- Manual tapping: **1 BZ per tap**
- Passive income: **Variable BZ/second** (based on owned upgrades)
- Task rewards: **Varies** (defined per task)
- Weekly challenge rewards: **None** (challenges reward XP/BB, not BZ)

**How to Spend:**
- Hardware upgrades: **Cost varies** (increases with each purchase)
- Currency conversion: **1000 BZ = 1 BB**

**Properties:**
- Infinite supply (no cap)
- Cannot be purchased with real money
- Must be earned through gameplay
- Primary early-game currency

### 3.2 BunnyBucks (BB) 💎

**Type:** Premium Currency

**How to Earn:**
- Convert from BZ: **1000 BZ → 1 BB** (fixed rate)
- Weekly challenges: **1000 BB** (Networker challenge reward)
- Referrals: **100-500 BB** (varies by tier)
- Task rewards: **Varies** (some tasks reward BB)

**How to Spend:**
- Purchase NFTs: **500-5000 BB** (varies by NFT rarity)
- Future features: Premium upgrades, cosmetics, boosters

**Properties:**
- More valuable than BZ
- Harder to earn (requires conversion or challenges)
- Used for premium/endgame content
- No direct purchase (future feature: IAP)

### 3.3 Experience Points (XP) ⭐

**Type:** Progression Metric

**How to Earn:**
- Manual tapping: **1 XP per tap**
- Hardware purchases: **10% of BZ cost** (e.g., 1000 BZ upgrade = 100 XP)
- Task completion: **500-10,000 XP** (varies by task difficulty)
- Weekly challenges: **5000 XP** (Tapper, Builder, Converter challenges)
- Referrals: **1000 XP per successful referral**

**Purpose:**
- Unlocks XP tiers (8 tiers total)
- Shows player progression
- May unlock features/NFTs (tier-gated content)
- Visible ranking metric (leaderboards future feature)

**Properties:**
- Cannot be spent (non-consumable)
- Only increases (never decreases)
- Lifetime accumulation counter

---

## 4. Progression & XP Tiers

### 4.1 XP Tier System

Players progress through **8 tiers** based on total XP earned:

| Tier | Name | Min XP | Color | Unlock Benefits |
|------|------|--------|-------|-----------------|
| 1 | Newbie | 0 | Gray | None (starting tier) |
| 2 | Bronze | 10,000 | Orange | Basic content access |
| 3 | Silver | 50,000 | Silver | Mid-tier NFTs unlocked |
| 4 | Gold | 150,000 | Yellow | Premium content starts |
| 5 | Platinum | 300,000 | Cyan | Advanced features |
| 6 | Diamond | 500,000 | Blue | Rare NFTs available |
| 7 | Master | 1,000,000 | Purple | Elite status |
| 8 | Legend | 2,000,000 | Red | All content unlocked |

### 4.2 Tier Progression Logic

```
Current Tier = Highest tier where (user's total XP >= tier's minXP)

Example:
- User has 75,000 XP
- Newbie: 0 ≤ 75,000 ✓
- Bronze: 10,000 ≤ 75,000 ✓
- Silver: 50,000 ≤ 75,000 ✓
- Gold: 150,000 ≤ 75,000 ✗
→ User is in Silver tier
```

### 4.3 Tier Benefits

- **Visual Status:** Tier badge displayed on profile
- **Content Unlocks:** Some NFTs require minimum tier (e.g., "Gold+ only")
- **Social Prestige:** Higher tier = more experienced player
- **Future Features:** Tier-exclusive challenges, rewards, events

---

## 5. Hardware Upgrade System

### 5.1 Upgrade Categories

Hardware upgrades are organized into **categories** (e.g., CPU, GPU, RAM, Storage). Each category contains multiple upgrade items.

### 5.2 Upgrade Properties

Each upgrade has:
- **Name:** Display name (e.g., "Basic CPU", "Quantum Processor")
- **Description:** Flavor text
- **Base Cost:** Initial BZ cost to purchase (first time)
- **Base Income:** BZ per second generated
- **Category:** Grouping for UI (CPU, GPU, etc.)
- **Icon/Image:** Visual representation
- **Level:** How many times the user has purchased this upgrade (0 = not owned)

### 5.3 Pricing Formula

Upgrades use **exponential pricing** - each purchase of the same upgrade costs more:

```
Current Cost = Base Cost × (1.15 ^ Current Level)

Example:
- Base Cost: 100 BZ
- Level 0 (first purchase): 100 BZ
- Level 1 (second purchase): 100 × 1.15 = 115 BZ
- Level 2 (third purchase): 100 × 1.15² = 132 BZ
- Level 10: 100 × 1.15¹⁰ = 404 BZ
```

**Why 1.15 multiplier?**
- Creates smooth exponential growth
- Prevents inflation (too easy to spam upgrades)
- Balances early-game accessibility with late-game challenge

### 5.4 Income Calculation

Each upgrade generates passive income **every second**:

```
Total Passive Income = Sum of (Each Owned Upgrade's Base Income)

Example:
- Owned Upgrades:
  - CPU Level 3: 5 BZ/s × 3 = 15 BZ/s
  - GPU Level 2: 10 BZ/s × 2 = 20 BZ/s
  - RAM Level 1: 3 BZ/s × 1 = 3 BZ/s
→ Total: 15 + 20 + 3 = 38 BZ/s
```

**Important:** Base income does NOT scale with level. If you buy the same 5 BZ/s upgrade 10 times, you get **50 BZ/s total** (5 × 10), not exponential income growth.

### 5.5 XP Reward

Purchasing an upgrade awards **XP equal to 10% of the BZ cost**:

```
XP Earned = Floor(Purchase Cost × 0.1)

Example:
- Purchase cost: 1,250 BZ
- XP earned: Floor(1,250 × 0.1) = 125 XP
```

### 5.6 Purchase Flow

```
1. User selects upgrade
2. System checks: Does user have enough BZ?
   - NO: Show error "Insufficient BZ"
   - YES: Proceed
3. Deduct BZ cost from user's balance
4. Increment upgrade level by 1
5. Add upgrade to "purchased_upgrades" array (if first time)
6. Recalculate total passive income
7. Award XP (10% of cost)
8. Save to database
9. Update UI
```

---

## 6. Conversion System

### 6.1 BZ → BB Conversion

**Exchange Rate:** 1000 BZ = 1 BB (fixed, never changes)

### 6.2 Conversion Rules

1. **Minimum Amount:** User must have at least 1000 BZ to convert
2. **Whole Numbers Only:** Fractional BB not allowed
   - 1500 BZ → 1 BB (500 BZ remainder stays)
   - 3999 BZ → 3 BB (999 BZ remainder stays)
3. **No Reverse Conversion:** BB cannot be converted back to BZ
4. **Transaction Log:** Every conversion is recorded in database

### 6.3 Conversion Formula

```
BB Earned = Floor(BZ Amount / 1000)
BZ Spent = BB Earned × 1000

Example:
- User has 7,800 BZ
- Converts 7,000 BZ
- BB earned: Floor(7000 / 1000) = 7 BB
- BZ spent: 7 × 1000 = 7,000 BZ
- Remaining BZ: 7,800 - 7,000 = 800 BZ
```

### 6.4 Conversion Tracking

The system tracks **two separate counters**:

1. **Total Conversions (BZ):** Lifetime total BZ converted
   - Used for: Statistics, achievements
   - Example: 15,000 BZ converted lifetime

2. **Total Conversion Events:** Number of times user clicked "Convert"
   - Used for: Weekly "Exchange Guru" challenge progress
   - Example: 12 conversion events (regardless of amounts)

**Why track both?**
- Total BZ: Measures resource commitment
- Event count: Measures user engagement (challenge metric)

### 6.5 Conversion Flow

```
1. User enters BZ amount to convert
2. System validates:
   - Amount ≥ 1000?
   - User has enough BZ?
3. Calculate BB earned
4. Deduct BZ from balance
5. Add BB to balance
6. Increment total_conversions counter (by BZ spent)
7. Increment total_conversion_events counter (by 1)
8. Log transaction to conversion_history table
9. Update UI
10. Trigger "Exchange Guru" challenge progress check
```

---

## 7. Task System

### 7.1 Task Types

Tasks are one-time or recurring actions that reward players:

| Task Type | Reset Frequency | Examples |
|-----------|----------------|----------|
| **Social** | Never (one-time) | Join Telegram channel, follow Twitter |
| **Achievement** | Never (one-time) | Reach Silver tier, earn 100k BZ |
| **Daily** | Every 24 hours | Daily login, tap 1000 times today |
| **Weekly** | Every Monday 00:00 UTC | Complete 10 tasks this week |

### 7.2 Task Properties

Each task has:
- **Title:** Display name
- **Description:** Instructions/details
- **Task Type:** social, achievement, daily, weekly
- **Category:** telegram, milestone, engagement, etc.
- **Reward Type:** "xp", "bb", or "both"
- **Reward Amount:** Integer value
- **Requirement Type:** "xp", "taps", "upgrades", "none"
- **Requirement Value:** Threshold to unlock (e.g., 50,000 XP)
- **Action URL:** External link (e.g., Telegram channel URL)
- **Icon:** Visual identifier
- **Is Active:** Boolean (admin can enable/disable tasks)

### 7.3 Task States

```
┌──────────┐
│  LOCKED  │ (Requirement not met, shows lock icon)
└────┬─────┘
     │ (User meets requirement)
     ▼
┌──────────┐
│AVAILABLE │ (User can claim, shows "Claim" button)
└────┬─────┘
     │ (User clicks "Claim")
     ▼
┌──────────┐
│ CLAIMED  │ (Completed, shows checkmark, no action)
└──────────┘
```

### 7.4 Task Claiming Flow

```
1. User clicks "Claim" button
2. System validates:
   - Task not already claimed?
   - User meets requirements?
3. Award rewards:
   - If reward_type = "xp" or "both": Add XP
   - If reward_type = "bb" or "both": Add BB
4. Record claim in user_tasks table
5. Update UI (show checkmark, disable button)
6. Show success toast
```

### 7.5 Task Verification

**Most tasks use honor system** - user clicks "Claim" when they've completed the external action (joined channel, etc.). No automatic verification.

**Some tasks have automatic verification:**
- **XP Milestones:** "Reach Silver tier" → Check user's current XP
- **Tap Count:** "Tap 10,000 times" → Check total_taps counter
- **Upgrade Count:** "Buy 50 upgrades" → Check total_upgrades counter

### 7.6 Task Reset Logic

**Daily Tasks:**
```
Reset Time: 00:00 UTC every day
Reset Action: Delete all user_tasks records where task_type = "daily"
Effect: Tasks become claimable again
```

**Weekly Tasks:**
```
Reset Time: Monday 00:00 UTC
Reset Action: Delete all user_tasks records where task_type = "weekly"
Effect: Tasks become claimable again
```

---

## 8. Weekly Challenges

### 8.1 Challenge System Overview

Weekly challenges are **progress-based goals** that track player activity over a 7-day period. Unlike tasks (one-time claims), challenges measure **incremental progress** from a baseline.

### 8.2 Four Challenges

| Challenge Key | Name | Description | Target | Reward |
|--------------|------|-------------|--------|--------|
| `tapper` | Tap Master | Tap 100,000 times | 100,000 taps | 5,000 XP |
| `builder` | Builder | Buy 10 upgrades | 10 purchases | 5,000 XP |
| `converter` | Exchange Guru | Convert 10 times | 10 conversions | 5,000 XP |
| `recruiter` | Networker | Invite 5 friends | 5 referrals | 1,000 BB |

### 8.3 Weekly Period

```
Week Start: Monday 00:00:00 UTC
Week End: Sunday 23:59:59 UTC
Duration: 7 days
Reset: Automatic at start of new week
```

### 8.4 Baseline System (CRITICAL CONCEPT)

**Problem:** Users have different starting points. A new player has 0 taps, a veteran has 1 million taps. How to make challenges fair?

**Solution:** Each challenge tracks a **baseline value** - the user's counter at the START of the week.

```
Week 1 Start (Monday):
- User's total_taps: 50,000
- "Tap Master" baseline set to: 50,000

During Week 1:
- User taps 120,000 times
- User's total_taps: 170,000

Progress Calculation:
- Current: 170,000
- Baseline: 50,000
- Progress this week: 170,000 - 50,000 = 120,000
- Target: 100,000
- Status: COMPLETED ✓ (120,000 ≥ 100,000)

Week 2 Start (Next Monday):
- User's total_taps: 170,000
- "Tap Master" baseline RESET to: 170,000
- Progress resets to: 0
→ User must tap 100,000 MORE times to complete again
```

### 8.5 Challenge Progress Formula

```
Progress = MAX(0, Current Value - Baseline Value)
Is Completed = (Progress ≥ Target Value)

Example - Exchange Guru Challenge:
- Target: 10 conversions
- Baseline (Monday): 25 conversion events
- Current (Wednesday): 32 conversion events
- Progress: MAX(0, 32 - 25) = 7
- Completed: 7 ≥ 10? NO (need 3 more)
```

**Why MAX(0, ...)?**
- Prevents negative progress (safety check)
- Handles edge cases (data corruption, manual adjustments)

### 8.6 Challenge States

```
┌──────────┐
│  ACTIVE  │ (In progress, shows progress bar)
└────┬─────┘
     │ (Progress reaches target)
     ▼
┌──────────┐
│COMPLETED │ (Shows "Claim" button)
└────┬─────┘
     │ (User clicks "Claim")
     ▼
┌──────────┐
│ CLAIMED  │ (Shows checkmark, reward given)
└──────────┘
```

### 8.7 Challenge Initialization

**When a new week starts:**
```
1. Delete previous week's challenge records
2. Get user's current counters:
   - total_taps
   - total_upgrades
   - total_conversion_events
   - referral_count
3. Create 4 new challenge records with baselines:
   - tapper: baseline = current total_taps
   - builder: baseline = current total_upgrades
   - converter: baseline = current total_conversion_events
   - recruiter: baseline = current referral_count
4. Set target values (100k taps, 10 upgrades, etc.)
5. Set completed = false, claimed = false
```

### 8.8 Challenge Update Triggers

Challenges auto-update when relevant counters change:

- **Tap Master:** Updates when total_taps increases (every tap)
- **Builder:** Updates when total_upgrades increases (hardware purchase)
- **Exchange Guru:** Updates when total_conversion_events increases (BZ→BB conversion)
- **Networker:** Updates when referral_count increases (successful referral)

**Update Logic:**
```
1. Fetch current week's challenge record
2. Calculate new progress: current_counter - baseline
3. Check if completed: progress ≥ target
4. Update challenge record in database
5. Trigger UI refresh
```

### 8.9 Challenge Claiming

```
1. User clicks "Claim Reward" button
2. System validates:
   - Challenge completed? (progress ≥ target)
   - Not already claimed?
3. Award reward:
   - If XP reward: Add XP to user
   - If BB reward: Add BB to user
4. Set claimed = true in database
5. Update UI (show checkmark, hide button)
6. Show success toast
```

---

## 9. Referral System

### 9.1 Referral Flow

```
1. User A (Referrer) clicks "Invite Friends"
2. System generates unique referral link:
   https://t.me/BotUsername?startapp=referral_code_USERA_ID
3. User A shares link with User B (Referee)
4. User B clicks link → Opens BunBun in Telegram
5. Telegram passes `startapp` parameter to app
6. User B signs in (creates account)
7. System detects referral code in /start command
8. System validates:
   - User B is new user (not existing)
   - User A exists
   - User B hasn't been referred before
9. Create referral record in database
10. Award rewards:
    - User A (Referrer): +100 BB, +1000 XP
    - User B (Referee): +50 BB, +500 XP
11. Increment User A's referral_count
12. Update "Networker" challenge progress
```

### 9.2 Referral Link Format

```
https://t.me/{BOT_USERNAME}?startapp=referral_code_{REFERRER_TELEGRAM_ID}

Example:
- Bot username: bunbun_bot
- Referrer's Telegram ID: 123456789
- Link: https://t.me/bunbun_bot?startapp=referral_code_123456789
```

### 9.3 Referral Rewards

| Role | BB Reward | XP Reward | Notes |
|------|-----------|-----------|-------|
| Referrer | 100 BB | 1,000 XP | Given when referee signs up |
| Referee | 50 BB | 500 XP | Given on first login (welcome bonus) |

**Future Enhancement:** Tiered rewards based on referral count
- 5 referrals: +500 BB bonus
- 10 referrals: +1000 BB bonus
- 25 referrals: +2500 BB bonus + exclusive NFT

### 9.4 Referral Validation Rules

**A referral is valid only if:**
1. Referee is a NEW user (never registered before)
2. Referrer exists in the system
3. Referee hasn't been referred by anyone else previously
4. Referrer ≠ Referee (can't refer yourself)
5. Referral code is properly formatted

**Invalid referral scenarios:**
- Existing user clicks referral link: No reward (already registered)
- User clicks own referral link: Blocked (self-referral)
- User already referred by someone else: Only first referral counts

### 9.5 Referral Tracking

Each referral is recorded with:
- **Referrer ID:** Who sent the invite
- **Referee ID:** Who joined
- **Timestamp:** When referral occurred
- **Rewards Given:** Boolean flags for both users
- **Status:** Pending, completed, invalid

---

## 10. NFT Collection

### 10.1 NFT System Overview

NFTs are **collectible digital items** that players can purchase with BB currency. They serve as:
- Status symbols (show ownership)
- Stat boosters (future feature: passive income multipliers)
- Achievement markers (tier-gated unlocks)

### 10.2 NFT Properties

Each NFT has:
- **Name:** Display name
- **Description:** Lore/flavor text
- **Image URL:** Visual artwork
- **Price (BB):** Cost to purchase
- **Requirement Type:** "xp", "referrals", "upgrades", "taps", "none"
- **Requirement Value:** Threshold to unlock (e.g., "Gold tier" = 150k XP)
- **Boost Type:** (Future) "income", "xp", "tap_power"
- **Boost Value:** (Future) Multiplier or flat bonus

### 10.3 NFT Rarity Tiers

| Rarity | Price Range | Requirement | Visual Style |
|--------|-------------|-------------|--------------|
| Common | 500-1000 BB | None | Basic artwork |
| Uncommon | 1000-2000 BB | Bronze+ | Enhanced artwork |
| Rare | 2000-3500 BB | Silver+ | Animated border |
| Epic | 3500-5000 BB | Gold+ | Glowing effects |
| Legendary | 5000+ BB | Platinum+ | Full animation |

### 10.4 NFT States

```
┌────────┐
│ LOCKED │ (Requirement not met, shows lock icon)
└───┬────┘
    │ (User meets requirement)
    ▼
┌────────┐
│UNLOCKED│ (Can purchase, shows price)
└───┬────┘
    │ (User purchases with BB)
    ▼
┌────────┐
│  OWNED │ (Shows checkmark, displays in collection)
└────────┘
```

### 10.5 NFT Purchase Flow

```
1. User clicks NFT card
2. System validates:
   - NFT unlocked? (requirement met)
   - User has enough BB?
   - NFT not already owned?
3. Deduct BB from user's balance
4. Add NFT to user_nfts table
5. Apply boost effect (if implemented)
6. Update UI (show checkmark, move to "Owned" section)
7. Show success toast
```

### 10.6 NFT Boost System (Future Feature)

**Concept:** Owned NFTs provide passive bonuses

| Boost Type | Effect | Example |
|------------|--------|---------|
| Income Multiplier | Increases passive BZ/s | +10% passive income |
| XP Multiplier | Increases XP earned | +5% XP from all sources |
| Tap Power | Increases BZ per tap | Tap = 2 BZ instead of 1 |
| Cost Reduction | Lowers upgrade costs | -5% hardware prices |

**Implementation:** When user owns NFT, apply boost globally to relevant calculations.

---

## 11. Data Architecture

### 11.1 Data Storage Strategy

BunBun uses a **hybrid dual-layer architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERACTION                      │
│                   (React State Layer)                    │
└──────────────────────┬──────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
    ┌─────────────┐         ┌──────────────┐
    │ localStorage│         │   Supabase   │
    │  (Browser)  │         │ (PostgreSQL) │
    ├─────────────┤         ├──────────────┤
    │ • Fast      │         │ • Persistent │
    │ • Offline   │         │ • Cloud sync │
    │ • Instant   │         │ • Multi-device│
    └─────────────┘         └──────────────┘
```

### 11.2 Why Hybrid Architecture?

**Problem:** Pure localStorage = data loss on device change. Pure database = slow, requires internet.

**Solution:** Use BOTH, with specific roles:

| Storage | Role | Strengths | Use Cases |
|---------|------|-----------|-----------|
| **localStorage** | Fast cache | Instant read/write, offline-capable | Real-time counters (BZ, taps), UI state |
| **Supabase** | Source of truth | Persistent, cross-device, secure | Long-term storage, sync, analytics |

### 11.3 What Goes Where?

| Data Type | localStorage | Supabase | Sync Direction |
|-----------|-------------|----------|----------------|
| **BZ (current)** | ✅ Primary | ✅ Backup | Both (merge) |
| **BB (current)** | ✅ Primary | ✅ Backup | Both (merge) |
| **XP (current)** | ✅ Primary | ✅ Backup | Both (merge) |
| **Total Taps** | ✅ Primary | ✅ Backup | Both (merge) |
| **Total Upgrades** | ✅ Primary | ✅ Backup | Both (merge) |
| **Purchased Upgrades** | ✅ Array | ✅ JSONB | Both (merge) |
| **Completed Tasks** | ❌ Deprecated | ✅ Table | Database-first |
| **Weekly Challenges** | ❌ Deprecated | ✅ Table | Database-first |
| **Referrals** | ❌ Never | ✅ Table | Database-only |
| **NFT Ownership** | ❌ Never | ✅ Table | Database-only |
| **Conversion History** | ❌ Never | ✅ Table | Database-only |

### 11.4 Database Schema

#### **Core Tables:**

**profiles** (User Data)
```
id: UUID (primary key)
telegram_id: BIGINT (unique, indexed)
username: TEXT
first_name: TEXT
last_name: TEXT
photo_url: TEXT

bz: NUMERIC (current BunnyZap balance)
bb: NUMERIC (current BunnyBucks balance)
xp: NUMERIC (total experience points)

total_taps: BIGINT (lifetime tap count)
total_tap_income: NUMERIC (BZ earned from tapping)
total_upgrades: INTEGER (hardware purchased count)
total_conversions: NUMERIC (lifetime BZ converted)
total_conversion_events: INTEGER (number of conversions)

purchased_upgrades: JSONB (array of upgrade IDs)

referral_count: INTEGER
referred_by: UUID (foreign key → profiles.id)

created_at: TIMESTAMP
updated_at: TIMESTAMP
last_active: TIMESTAMP
last_save_time: TIMESTAMP
last_sync_time: TIMESTAMP
```

**tasks** (Task Definitions)
```
id: UUID
title: TEXT
description: TEXT
task_type: TEXT (social, achievement, daily, weekly)
category: TEXT (telegram, milestone, etc.)
reward_type: TEXT (xp, bb, both)
reward_amount: INTEGER
requirement_type: TEXT (xp, taps, upgrades, none)
requirement_value: INTEGER
action_url: TEXT (external link)
icon: TEXT
order_index: INTEGER (display order)
is_active: BOOLEAN
created_at: TIMESTAMP
```

**user_tasks** (Task Completion)
```
id: UUID
user_id: UUID (foreign key → profiles.id)
task_id: UUID (foreign key → tasks.id)
telegram_id: BIGINT
claimed_at: TIMESTAMP
UNIQUE(user_id, task_id) (one claim per task)
```

**user_weekly_challenges** (Challenge Progress)
```
id: UUID
user_id: UUID (foreign key → profiles.id)
telegram_id: BIGINT
week_start_date: DATE
challenge_key: TEXT (tapper, builder, converter, recruiter)
baseline_value: INTEGER (starting point for week)
current_progress: INTEGER (progress this week)
target_value: INTEGER (goal to reach)
completed: BOOLEAN
claimed: BOOLEAN
created_at: TIMESTAMP
updated_at: TIMESTAMP
UNIQUE(user_id, week_start_date, challenge_key)
```

**nfts** (NFT Definitions)
```
id: UUID
name: TEXT
description: TEXT
image_url: TEXT
price_bb: INTEGER
requirement_type: TEXT (xp, referrals, upgrades, taps, none)
requirement_value: INTEGER
boost_type: TEXT (future: income, xp, tap_power)
boost_value: NUMERIC (future: multiplier)
created_at: TIMESTAMP
```

**user_nfts** (NFT Ownership)
```
id: UUID
user_id: UUID (foreign key → profiles.id)
nft_id: UUID (foreign key → nfts.id)
telegram_id: BIGINT
purchased_at: TIMESTAMP
UNIQUE(user_id, nft_id) (one NFT per user)
```

**referrals** (Referral Tracking)
```
id: UUID
referrer_id: UUID (foreign key → profiles.id)
referee_id: UUID (foreign key → profiles.id)
referrer_telegram_id: BIGINT
referee_telegram_id: BIGINT
referrer_rewarded: BOOLEAN
referee_rewarded: BOOLEAN
created_at: TIMESTAMP
UNIQUE(referee_id) (one referrer per user)
```

**conversion_history** (BZ→BB Logs)
```
id: UUID
user_id: UUID (foreign key → profiles.id)
telegram_id: BIGINT
bz_spent: NUMERIC
bb_earned: NUMERIC
exchange_rate: NUMERIC (always 1000)
created_at: TIMESTAMP
```

**build_parts** (Hardware Definitions)
```
id: UUID
name: TEXT
description: TEXT
category: TEXT (CPU, GPU, RAM, etc.)
base_cost: INTEGER (starting BZ price)
base_income: NUMERIC (BZ per second)
icon: TEXT
image_url: TEXT
order_index: INTEGER
created_at: TIMESTAMP
```

### 11.5 Row Level Security (RLS)

**ALL tables have RLS enabled**. Users can only access their own data.

**Policy Pattern:**
```
Table: profiles
- Users can view their own profile: WHERE auth.uid() = id
- Users can update their own profile: WHERE auth.uid() = id

Table: user_tasks
- Users can view their own tasks: WHERE user_id = auth.uid()
- Users can insert their own tasks: WITH CHECK (user_id = auth.uid())

... Same pattern for all user-specific tables
```

---

## 12. Sync Strategy

### 12.1 Sync Philosophy

**Goal:** Maintain data consistency between localStorage (fast, offline) and Supabase (persistent, cloud).

**Challenge:** Users may play on multiple devices or offline. How to merge conflicting data?

**Solution:** Use **Math.max() merge strategy** for numeric counters.

### 12.2 Math.max() Merge Strategy

**Principle:** When syncing, always keep the HIGHEST value.

```
Scenario:
- Device A (offline): User taps 1000 times → local BZ = 5000
- Device B (online): User taps 500 times → server BZ = 4500

When Device A syncs:
1. Fetch server value: 4500
2. Compare: MAX(5000, 4500) = 5000
3. Update both: localStorage = 5000, Supabase = 5000
4. Result: No data lost ✓
```

**Why Math.max()?**
- **Prevents data loss:** Always keeps highest progress
- **Handles offline play:** Local changes preserved
- **Resolves conflicts:** Deterministic (no complex CRDTs)
- **Simple logic:** Easy to implement and debug

### 12.3 Sync Triggers

**Automatic Sync Events:**
1. **Initial Load:** When app opens (fetch from Supabase, merge with localStorage)
2. **Periodic Sync:** Every 30 seconds (background sync)
3. **Action Sync:** After significant actions (upgrade purchase, conversion)
4. **Before Close:** When user closes app (final save)

**Manual Sync:**
- Pull-to-refresh gesture (future feature)
- "Sync Now" button in settings

### 12.4 Sync Flow (Detailed)

```
┌─────────────────────────────────────────────────────────┐
│ 1. LOAD PHASE (App Startup)                             │
└─────────────────────────────────────────────────────────┘
   │
   ├─► Load from localStorage (instant UI hydration)
   │   • bz: 5000
   │   • bb: 200
   │   • xp: 75000
   │
   ├─► Authenticate with Telegram (get user ID)
   │
   ├─► Fetch from Supabase (background async)
   │   • bz: 4800
   │   • bb: 210
   │   • xp: 74500
   │
   ├─► Merge using Math.max()
   │   • bz: MAX(5000, 4800) = 5000 ← Keep local
   │   • bb: MAX(200, 210) = 210 ← Keep server
   │   • xp: MAX(75000, 74500) = 75000 ← Keep local
   │
   └─► Update both sources
       • localStorage: { bz: 5000, bb: 210, xp: 75000 }
       • Supabase: UPDATE profiles SET bz=5000, bb=210, xp=75000

┌─────────────────────────────────────────────────────────┐
│ 2. RUNTIME PHASE (During Gameplay)                      │
└─────────────────────────────────────────────────────────┘
   │
   ├─► User Action (tap, purchase, convert)
   │   • Update React state (instant UI)
   │   • Save to localStorage (fast, offline-safe)
   │   • Debounced sync to Supabase (batched, network-efficient)
   │
   ├─► Passive Income (every second)
   │   • Update React state
   │   • Save to localStorage (every 5 seconds)
   │   • Sync to Supabase (every 30 seconds)
   │
   └─► Background Sync (every 30s)
       • Fetch latest from Supabase
       • Merge with current state (Math.max)
       • Update both sources
```

### 12.5 Array/Set Merging (Purchased Upgrades, Owned NFTs)

**Problem:** Math.max() only works for numbers. How to merge arrays?

**Solution:** Set union (combine both arrays, remove duplicates)

```
localStorage: ["upgrade_1", "upgrade_2", "upgrade_3"]
Supabase: ["upgrade_2", "upgrade_3", "upgrade_4"]

Merge:
1. Convert to sets: {upgrade_1, upgrade_2, upgrade_3} ∪ {upgrade_2, upgrade_3, upgrade_4}
2. Union: {upgrade_1, upgrade_2, upgrade_3, upgrade_4}
3. Convert back: ["upgrade_1", "upgrade_2", "upgrade_3", "upgrade_4"]

Update both:
- localStorage: ["upgrade_1", "upgrade_2", "upgrade_3", "upgrade_4"]
- Supabase: ["upgrade_1", "upgrade_2", "upgrade_3", "upgrade_4"]
```

### 12.6 Conflict Resolution Examples

**Example 1: Offline Play**
```
User goes offline → Plays for 1 hour → Earns 10k BZ
Meanwhile, no changes on server (still has old value)

On reconnect:
- Local: 10,000 BZ
- Server: 0 BZ
- Merge: MAX(10000, 0) = 10,000 BZ ✓
→ Offline progress preserved
```

**Example 2: Multi-Device**
```
Device A: User taps 5000 times → 5000 BZ
Device B: User taps 3000 times → 3000 BZ

Device A syncs first:
- Server updates to 5000 BZ

Device B syncs later:
- Fetch: 5000 BZ (from Device A)
- Local: 3000 BZ
- Merge: MAX(5000, 3000) = 5000 BZ ✓
→ Highest progress kept
```

### 12.7 Sync Performance Optimization

**Debouncing:** Don't sync on every tap (wasteful). Batch updates:
```
User taps 100 times in 2 seconds
→ Only 1 sync call (not 100 calls)
→ Sends final value: +100 BZ
```

**Selective Sync:** Only sync changed fields:
```
User purchases upgrade:
→ Sync: bz, purchased_upgrades, total_upgrades, xp
→ Don't sync: bb, total_taps, referral_count (unchanged)
```

**Background Sync:** Use Web Workers (future):
```
Main Thread: Handle UI, user input
Worker Thread: Perform database sync
→ No UI blocking
```

---

## 13. Telegram Integration

### 13.1 Telegram Mini App (TMA) Platform

BunBun runs inside Telegram using the **Telegram WebApp API**. No separate app download needed.

**How Users Access:**
1. Search for bot: `@bunbun_bot` (example)
2. Click "Start" or "Play Now"
3. App opens in Telegram's in-app browser
4. Full-screen web app experience

### 13.2 Telegram WebApp SDK

**Initialization:**
```javascript
// Provided by Telegram automatically
const telegram = window.Telegram.WebApp;

// Lifecycle methods
telegram.ready();           // Signal app is ready
telegram.expand();          // Go full-screen
telegram.enableClosingConfirmation(); // Confirm before close
```

**User Data Access:**
```javascript
const user = telegram.initDataUnsafe.user;
// user.id → Telegram user ID (unique identifier)
// user.username → @username
// user.first_name → First name
// user.last_name → Last name
// user.photo_url → Profile picture URL
```

### 13.3 Authentication Flow

```
1. User opens Mini App in Telegram
2. Telegram WebApp SDK provides `initData` (cryptographically signed string)
3. Frontend sends initData to backend (Edge Function)
4. Backend verifies signature using bot token (ensures authenticity)
5. Backend creates/updates user in Supabase Auth + profiles table
6. Backend returns session token to frontend
7. Frontend stores token, uses for all API calls
```

**Security:** initData is signed by Telegram with bot token. Cannot be forged.

### 13.4 Bot Commands

**Setup in BotFather:**
```
/start - Launch BunBun game
/help - Get help and support
/stats - View your statistics (future)
```

**Command Handling:**
```
User sends: /start referral_code_123456789
→ Telegram forwards to webhook: telegram-webhook-handler
→ Webhook extracts referral code
→ Records referral in database
→ Awards rewards to both users
```

### 13.5 Deep Linking (Referrals)

**Link Format:**
```
https://t.me/{BOT_USERNAME}?startapp={PARAMETER}

Example:
https://t.me/bunbun_bot?startapp=referral_code_123456789
```

**When user clicks:**
1. Opens Telegram app
2. Opens BunBun Mini App
3. Passes `startapp` parameter to app
4. App extracts parameter, processes referral

### 13.6 Telegram Payments (Future Feature)

Telegram supports **native payments** for in-app purchases:
- Buy BB with Telegram Stars (virtual currency)
- Buy premium features
- Purchase exclusive NFTs

**Flow:**
```
1. User clicks "Buy 100 BB for $0.99"
2. App creates invoice via Telegram API
3. Telegram shows native payment sheet
4. User completes payment (Apple Pay, Google Pay, etc.)
5. Telegram sends payment confirmation webhook
6. Backend credits 100 BB to user's account
```

---

## 14. User Interface

### 14.1 Screen Structure

BunBun has **6 main screens** accessed via bottom navigation:

```
┌───────────────────────────────────────────────────────┐
│                   Top Dashboard                        │
│  • BZ Balance  • BB Balance  • XP Tier  • Passive/h  │
└───────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────┐
│                  Main Content Area                     │
│           (Current Screen Displayed Here)              │
│                                                        │
│                                                        │
│                                                        │
└───────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────┐
│                  Bottom Navigation                     │
│  [ Tap ] [ Boost ] [ Build ] [ Convert ] [ XP ] ...  │
└───────────────────────────────────────────────────────┘
```

### 14.2 Screen Breakdown

#### **1. Tap Screen (Home)**
**Purpose:** Main gameplay - manual tapping

**Elements:**
- Large bunny character (tap target)
- BZ counter (updates on tap)
- Tap animation (visual feedback)
- Passive income ticker (shows BZ/second)

**Interactions:**
- Tap bunny → +1 BZ, +1 XP
- Watch passive income accumulate

---

#### **2. Boost Screen**
**Purpose:** Temporary power-ups (future feature)

**Planned Features:**
- Double BZ for 10 minutes
- 2x passive income for 1 hour
- Auto-tapper (100 taps/second)

**Monetization:** Watch ads or spend BB

---

#### **3. Build Screen**
**Purpose:** Purchase hardware upgrades

**Elements:**
- Grid of upgrade cards
- Category filters (CPU, GPU, RAM, etc.)
- Each card shows:
  - Name, icon
  - Cost (BZ)
  - Income (BZ/s)
  - Current level
  - "Buy" button

**Interactions:**
- Click upgrade → Purchase modal
- Confirm purchase → Deduct BZ, add upgrade
- Level counter increments
- Total passive income updates

---

#### **4. Convert Screen**
**Purpose:** Exchange BZ for BB

**Elements:**
- Input field (BZ amount)
- Exchange rate display (1000:1)
- Preview (how much BB you'll get)
- "Convert" button
- Conversion history log (recent transactions)

**Interactions:**
- Enter amount → See preview
- Click Convert → Confirm modal
- Deduct BZ, add BB
- Log transaction

---

#### **5. XP & Tiers Screen**
**Purpose:** Show progression and tier status

**Elements:**
- Current tier badge (large, animated)
- XP progress bar (to next tier)
- XP breakdown (where XP came from)
- Tier benefits list
- Tier milestones (visual timeline)

**Interactions:**
- Scroll through tier list
- See requirements for each tier
- Track progress to next level

---

#### **6. Rewards & NFTs Screen**
**Purpose:** Tasks, challenges, NFT collection

**Tabs:**
- **Weekly Challenges:** 4 challenge cards with progress bars
- **NFT Collection:** Grid of purchasable NFTs

**Challenge Cards:**
- Name, description
- Progress bar (visual + numeric)
- Reward (XP or BB)
- "Claim" button (when completed)

**NFT Cards:**
- Image, name, rarity
- Price (BB)
- Lock icon (if requirement not met)
- "Buy" button (if unlocked)
- Checkmark (if owned)

---

#### **7. Tasks & Referrals Screen**
**Purpose:** Social tasks and friend invites

**Tabs:**
- **Tasks:** List of available tasks
- **Referrals:** Invite friends + reward tracker

**Task List:**
- Task icon, title, description
- Reward (XP + BB)
- "Claim" button
- Lock icon (if requirement not met)
- Checkmark (if completed)

**Referral Section:**
- Unique referral link
- "Copy Link" button
- Referral count (X friends invited)
- Reward history (BB + XP earned)

---

### 14.3 Navigation Flow

```
User opens app → Tap Screen (home)
Bottom nav → Click "Build" → Build Screen
Bottom nav → Click "Convert" → Convert Screen
... etc
```

**Always-visible elements:**
- Top dashboard (BZ, BB, XP, passive income)
- Bottom navigation bar

---

## 15. Business Rules & Validation

### 15.1 Resource Validation

**BZ Spending:**
- Cannot spend more BZ than owned
- Negative BZ balance forbidden
- Minimum transaction: 1 BZ

**BB Spending:**
- Cannot spend more BB than owned
- Negative BB balance forbidden
- Minimum transaction: 1 BB

**XP:**
- Cannot decrease (only increases)
- No spending mechanism (non-consumable)

### 15.2 Purchase Validation

**Hardware Upgrades:**
- Must have sufficient BZ
- No maximum purchase limit (can spam buy)
- Price increases each time (exponential)

**NFT Purchases:**
- Must have sufficient BB
- Must meet requirement (XP tier, etc.)
- Cannot purchase same NFT twice (one per user)

**Conversion:**
- Minimum 1000 BZ to convert
- Must have sufficient BZ balance
- Cannot reverse (BB → BZ not allowed)

### 15.3 Task Validation

**Claiming Tasks:**
- Cannot claim twice
- Must meet requirements (XP, taps, etc.)
- Must be active (not disabled by admin)
- Daily/weekly tasks must be within reset period

### 15.4 Challenge Validation

**Claiming Challenges:**
- Progress must be ≥ target
- Cannot claim twice in same week
- Must be within current weekly period
- Challenge must be marked as completed

### 15.5 Referral Validation

**Creating Referrals:**
- Referee must be new user (never registered)
- Cannot refer self
- Cannot be referred by multiple people (first wins)
- Referrer must exist

### 15.6 Data Integrity

**Sync Validation:**
- All numeric counters: Use Math.max (prevent decreases)
- Arrays: Use set union (prevent duplicates)
- Timestamps: Server time only (prevent client manipulation)

**Security:**
- All database access via RLS policies
- Users can only access own data
- No direct database access from frontend
- All mutations via authenticated API calls

---

## Appendix: Quick Reference

### Resource Formulas

```
Passive Income = Σ(owned upgrades' base_income)
Upgrade Cost = base_cost × (1.15 ^ current_level)
XP from Upgrade = Floor(upgrade_cost × 0.1)
BB from BZ = Floor(bz_amount / 1000)
Challenge Progress = MAX(0, current_value - baseline_value)
```

### Key Ratios

```
BZ → BB Exchange Rate: 1000:1
XP from Tap: 1:1
XP from Upgrade: 10% of BZ cost
Upgrade Price Growth: 15% per level
```

### Weekly Reset Times

```
Challenges: Monday 00:00 UTC
Daily Tasks: Every day 00:00 UTC
Weekly Tasks: Monday 00:00 UTC
```

### Reward Values

```
Tap Master Challenge: 5,000 XP
Builder Challenge: 5,000 XP
Exchange Guru Challenge: 5,000 XP
Networker Challenge: 1,000 BB
Referrer Bonus: 100 BB + 1,000 XP
Referee Bonus: 50 BB + 500 XP
```

---

**End of Specification**

*This document provides complete understanding of BunBun's game mechanics, data architecture, and system design. Any development team can use this to build the app from scratch without additional context.*