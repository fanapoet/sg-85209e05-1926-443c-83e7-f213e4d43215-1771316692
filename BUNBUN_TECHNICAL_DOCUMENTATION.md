# BunBun - Telegram Mini App (TMA)
## Complete Product & Technical Specification

**Version:** 1.0  
**Document Type:** Product Requirements & System Design  
**Audience:** Development teams building BunBun from scratch  
**Purpose:** Complete understanding of game mechanics, business logic, and system architecture

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Game Mechanics - Core Loop](#2-game-mechanics---core-loop)
3. [Resource System](#3-resource-system)
4. [Progression System - XP Tiers](#4-progression-system---xp-tiers)
5. [Hardware Upgrade System](#5-hardware-upgrade-system)
6. [Conversion System](#6-conversion-system)
7. [Task System](#7-task-system)
8. [Weekly Challenges System](#8-weekly-challenges-system)
9. [Referral System](#9-referral-system)
10. [NFT Collection System](#10-nft-collection-system)
11. [Data Architecture](#11-data-architecture)
12. [Sync Strategy](#12-sync-strategy)
13. [Telegram Integration](#13-telegram-integration)
14. [User Interface Structure](#14-user-interface-structure)
15. [Business Rules & Validation](#15-business-rules--validation)
16. [Appendix: Quick Reference](#16-appendix-quick-reference)

---

## 1. Product Overview

### 1.1 What is BunBun?

**BunBun** is a Telegram Mini App (TMA) that combines:
- **Idle/Clicker Game Mechanics** - Players tap to earn resources and build passive income
- **Social Features** - Referral system for viral growth
- **Progression System** - XP tiers unlock new features
- **Collection Mechanics** - NFTs as achievement badges
- **Challenge System** - Weekly goals with rewards

### 1.2 Core Gameplay Loop

```
Tap → Earn BZ → Buy Upgrades → Passive Income → Level Up → Unlock Features → Complete Challenges → Repeat
```

**Primary Resources:**
- **BunnyZap (BZ)** - Primary currency earned through tapping and passive income
- **BunnyBucks (BB)** - Premium currency earned through conversion and challenges
- **Experience Points (XP)** - Progression metric that determines player tier

### 1.3 Key Features

| Feature | Description |
|---------|-------------|
| **Manual Tapping** | Click bunny to earn +1 BZ and +1 XP per tap |
| **Passive Income** | Automated BZ generation based on owned hardware upgrades |
| **Hardware Upgrades** | Purchase items that generate passive income |
| **BZ → BB Conversion** | Exchange BunnyZap for premium BunnyBucks currency |
| **XP Tier System** | 8 progression tiers from Newbie to Legend |
| **Task System** | Complete objectives for BZ, BB, and XP rewards |
| **Weekly Challenges** | Time-limited goals that reset weekly |
| **Referral System** | Invite friends for rewards |
| **NFT Collection** | Collectible badges with future utility |
| **QuickCharge** | Limited-use instant energy boost |

---

## 2. Game Mechanics - Core Loop

### 2.1 Manual Tapping System

**Mechanic:**
- User taps on bunny character
- Each tap generates:
  - **+1 BunnyZap (BZ)**
  - **+1 Experience Point (XP)**
- Taps are tracked in `totalTaps` counter

**Properties:**
- Unlimited taps (no energy/stamina system)
- Instant feedback (visual animation + counter update)
- Works offline (syncs when connection restored)

**Use Cases:**
- Early game primary resource generation
- Continuous XP farming
- Active engagement mechanic
- Progress towards "Tap Master" weekly challenge

---

### 2.2 Passive Income System

**Mechanic:**
- Background income generation based on owned hardware upgrades
- Calculated as: `Passive Income Rate = SUM(all owned upgrades' base_income)`
- Income accumulates per hour: `BZ/h = Passive Income Rate`

**Properties:**
- Runs even when app is closed
- Accumulation tracked via timestamps
- On app open: calculates time elapsed × income rate
- Maximum offline accumulation: unlimited (calculates full elapsed time)

**Formula:**
```
Passive BZ Earned = (Current Time - Last Sync Time) × (Total Passive Income Rate / 3600)
```

**Example:**
- Player owns upgrades generating 1000 BZ/h total
- Player closes app for 2 hours
- On return: receives 2000 BZ automatically

---

### 2.3 Resource Flow Diagram

```
┌─────────────┐
│   TAPPING   │ → +1 BZ, +1 XP per tap
└─────────────┘

┌─────────────┐
│  PASSIVE    │ → +X BZ/hour (based on upgrades)
│   INCOME    │
└─────────────┘
       ↓
┌─────────────┐
│  BunnyZap   │ ──────→ Buy Upgrades (increases passive income)
│    (BZ)     │ ──────→ Convert to BB (1000 BZ = 1 BB)
└─────────────┘

┌─────────────┐
│ BunnyBucks  │ ──────→ Buy NFTs (future: boosts)
│    (BB)     │
└─────────────┘

┌─────────────┐
│     XP      │ ──────→ Unlock Tiers (Newbie → Legend)
└─────────────┘
```

---

## 3. Resource System

### 3.1 BunnyZap (BZ) - Primary Currency

**How to Earn:**
| Method | Amount | Notes |
|--------|--------|-------|
| Manual Tap | +1 BZ per tap | Unlimited |
| Passive Income | Variable (BZ/h) | Based on owned upgrades |
| Task Rewards | 100-50,000 BZ | One-time or repeating |
| Referral Rewards | 5,000 BZ | Per successful referral |

**How to Spend:**
| Use | Cost | Notes |
|-----|------|-------|
| Hardware Upgrades | Dynamic (see §5.2) | Exponential pricing |
| BZ → BB Conversion | 1,000 BZ = 1 BB | Fixed exchange rate |

**Properties:**
- Integer values only (no decimals)
- No maximum cap
- Cannot go negative
- Displayed with comma separators (e.g., "1,234,567 BZ")

---

### 3.2 BunnyBucks (BB) - Premium Currency

**How to Earn:**
| Method | Amount | Notes |
|--------|--------|-------|
| BZ Conversion | 1 BB per 1,000 BZ | Player-initiated |
| Weekly Challenges | 1,000 BB | "Networker" challenge |
| Task Rewards | 100-5,000 BB | Rare tasks |
| Referral Rewards | 500 BB | Per successful referral |

**How to Spend:**
| Use | Cost | Notes |
|-----|------|-------|
| NFT Purchases | 100-10,000 BB | Based on rarity |
| Future: Boosts | TBD | Planned feature |

**Properties:**
- Integer values only
- More valuable than BZ (1000:1 ratio)
- Limited earning methods (scarcity by design)
- Displayed with comma separators (e.g., "12,345 BB")

---

### 3.3 Experience Points (XP)

**How to Earn:**
| Method | Amount | Notes |
|--------|--------|-------|
| Manual Tap | +1 XP per tap | Unlimited |
| Hardware Purchase | 10% of upgrade cost | Rounded down |
| Task Completion | 100-10,000 XP | Varies by task |
| Challenge Completion | 5,000 XP | 3 of 4 weekly challenges |

**Purpose:**
- Determines player's **XP Tier** (Newbie → Legend)
- Unlocks features at tier thresholds
- Status symbol / progression metric
- No direct spending mechanism

**Properties:**
- Integer values only
- Cannot decrease (only increases)
- No maximum cap
- Displayed with comma separators (e.g., "306,160 XP")

---

## 4. Progression System - XP Tiers

### 4.1 Tier Structure

BunBun has **8 progression tiers** based on cumulative XP:

| Tier # | Name | XP Threshold | Badge Color | Unlocks |
|--------|------|--------------|-------------|---------|
| 1 | Newbie | 0 | Gray | Basic features |
| 2 | Bronze | 1,000 | Bronze | Conversion system |
| 3 | Silver | 5,000 | Silver | More upgrades |
| 4 | Gold | 25,000 | Gold | Weekly challenges |
| 5 | Platinum | 100,000 | Platinum | All upgrades |
| 6 | Diamond | 500,000 | Diamond | Exclusive NFTs |
| 7 | Master | 2,000,000 | Purple | Prestige features (future) |
| 8 | Legend | 10,000,000 | Rainbow | Max tier |

### 4.2 Tier Benefits

**Newbie (0 XP):**
- Access to tapping
- Basic upgrades available
- Tutorial experience

**Bronze (1,000 XP):**
- **Unlocks Conversion System** - Can exchange BZ for BB
- Social tasks unlocked

**Silver (5,000 XP):**
- More hardware upgrades available
- Achievement tasks unlocked

**Gold (25,000 XP):**
- **Unlocks Weekly Challenges** - Access to challenge system
- Daily tasks unlocked

**Platinum (100,000 XP):**
- All hardware upgrades unlocked
- Full feature access

**Diamond (500,000 XP):**
- Rare NFTs unlocked for purchase
- Status symbol

**Master (2,000,000 XP):**
- Future: Prestige system
- Future: Special boosts

**Legend (10,000,000 XP):**
- Maximum tier achievement
- Future: Exclusive rewards

### 4.3 Tier Calculation

```
Current Tier = Highest tier where (Player XP >= Tier Threshold)
```

**Example:**
- Player has 120,000 XP
- Player is **Platinum** tier (100,000 ≤ 120,000 < 500,000)

### 4.4 Tier Display

**Visual Elements:**
- Tier badge with appropriate color
- Current tier name
- Progress bar to next tier
- XP needed for next tier

**Progress Bar Formula:**
```
Progress % = (Current XP - Current Tier Threshold) / (Next Tier Threshold - Current Tier Threshold) × 100
```

---

## 5. Hardware Upgrade System

### 5.1 Upgrade Categories

Hardware upgrades are items the player purchases to generate passive income. Each upgrade has:

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Display name (e.g., "Solar Panel") |
| `description` | string | Flavor text |
| `base_income` | integer | BZ generated per hour |
| `base_price` | integer | Initial purchase cost in BZ |
| `category` | string | Energy/Computing/Other |
| `image` | string | Icon/image URL |
| `required_xp` | integer | Minimum XP to unlock |

**Example Upgrade:**
```
{
  id: "solar-panel",
  name: "Solar Panel",
  description: "Harnesses renewable energy",
  base_income: 10,
  base_price: 100,
  category: "Energy",
  image: "solar-panel.png",
  required_xp: 0
}
```

### 5.2 Dynamic Pricing Formula

Each upgrade's cost increases **exponentially** based on how many the player owns:

```
Cost = Base Price × (1.15 ^ Current Level)
```

**Where:**
- `Base Price` = Upgrade's `base_price` property
- `Current Level` = How many of this upgrade player owns
- `1.15` = Price multiplier (15% increase per level)

**Example Progression:**
| Level | Calculation | Cost (BZ) |
|-------|-------------|-----------|
| 0 → 1 | 100 × 1.15^0 | 100 |
| 1 → 2 | 100 × 1.15^1 | 115 |
| 2 → 3 | 100 × 1.15^2 | 132 |
| 3 → 4 | 100 × 1.15^3 | 152 |
| 10 → 11 | 100 × 1.15^10 | 405 |
| 20 → 21 | 100 × 1.15^20 | 1,637 |

**Result:** Cost doubles approximately every 5 levels

### 5.3 Passive Income Calculation

**Total Passive Income Rate:**
```
Total BZ/h = SUM(upgrade.base_income × quantity owned)
```

**Example:**
```
Player owns:
- 5× Solar Panel (10 BZ/h each) = 50 BZ/h
- 3× Wind Turbine (25 BZ/h each) = 75 BZ/h
- 1× Nuclear Reactor (500 BZ/h each) = 500 BZ/h

Total Passive Income = 50 + 75 + 500 = 625 BZ/h
```

### 5.4 XP Reward on Purchase

When purchasing an upgrade, player receives XP:

```
XP Gained = FLOOR(Purchase Cost × 0.10)
```

**Example:**
- Upgrade costs 1,523 BZ
- XP gained = FLOOR(1523 × 0.10) = 152 XP

**Why 10%?**
- Rewards active spending
- Encourages progression
- Makes expensive upgrades more rewarding

### 5.5 Purchase Flow

**Step-by-Step:**

1. **Player selects upgrade** from Build screen
2. **System checks:**
   - Does player have enough BZ?
   - Does player meet XP requirement?
3. **If valid:**
   - Deduct cost from player's BZ
   - Increment upgrade quantity by 1
   - Add XP reward to player's XP
   - Increment `totalUpgrades` counter
   - Update passive income rate
   - Sync to database
4. **If invalid:**
   - Show error message (insufficient funds or locked)

**Data Updates:**
```
player.bz -= upgrade_cost
player.xp += FLOOR(upgrade_cost × 0.10)
player.totalUpgrades += 1
player.ownedUpgrades[upgrade_id] += 1
player.passiveIncomeRate = recalculate_total_income()
```

---

## 6. Conversion System

### 6.1 Exchange Rate

**Fixed Rate:**
```
1,000 BunnyZap (BZ) = 1 BunnyBuck (BB)
```

**Properties:**
- Fixed rate (never changes)
- One-way conversion (cannot convert BB back to BZ)
- Integer conversion only (minimum 1,000 BZ)

### 6.2 Conversion Rules

**Validation:**
- Player must have ≥ 1,000 BZ
- Can only convert in multiples of 1,000 BZ
- Must be Bronze tier or higher (XP ≥ 1,000)

**User Input:**
- Player enters BZ amount to convert
- System validates: amount % 1,000 === 0
- Shows preview: "X BZ → Y BB"

### 6.3 Dual Tracking System

**Why track TWO metrics?**

The system tracks:
1. **Total BZ Converted** (`totalBzConverted`) - Cumulative lifetime BZ converted
2. **Conversion Events** (`totalConversionEvents`) - Number of conversion transactions

**Reason:**
- **Total BZ Converted** = Shows scale of player economy (did they convert 10K or 10M BZ?)
- **Conversion Events** = Tracks frequency of use (important for "Exchange Guru" weekly challenge)

**Example:**
```
Player converts 5,000 BZ → receives 5 BB
- totalBzConverted += 5,000
- totalConversionEvents += 1

Player converts 10,000 BZ → receives 10 BB
- totalBzConverted += 10,000 (now 15,000 total)
- totalConversionEvents += 1 (now 2 total)
```

**Weekly Challenge Impact:**
- "Exchange Guru" challenge requires **10 conversion events** (not 10K BZ)
- A player could convert 1,000 BZ ten times = challenge complete
- A player could convert 100,000 BZ once = 1/10 progress

### 6.4 Conversion Flow

**Step-by-Step:**

1. **Player enters BZ amount** (must be multiple of 1,000)
2. **System validates:**
   - Amount ≥ 1,000?
   - Amount % 1,000 === 0?
   - Player has sufficient BZ?
   - Player is Bronze+ tier?
3. **Preview shown:**
   - "Convert X BZ → Y BB?"
   - Confirmation button
4. **On confirm:**
   - Deduct BZ: `player.bz -= convertAmount`
   - Add BB: `player.bb += (convertAmount / 1000)`
   - Track conversion: `totalBzConverted += convertAmount`
   - Increment events: `totalConversionEvents += 1`
   - Sync to database
   - Update weekly challenge progress (if applicable)
5. **Success message:**
   - "Converted X BZ → Y BB!"

---

## 7. Task System

### 7.1 Task Types

BunBun has **4 task types**:

| Type | Description | Reset Logic | Examples |
|------|-------------|-------------|----------|
| **Social** | External platform actions | Never (one-time) | "Follow on Twitter", "Join Telegram" |
| **Achievement** | In-game milestones | Never (one-time) | "Reach 10K taps", "Own 50 upgrades" |
| **Daily** | Repeating daily goals | Every 24 hours | "Tap 1000 times today", "Convert once" |
| **Weekly** | Repeating weekly goals | Every 7 days (Monday) | "Earn 100K BZ this week" |

### 7.2 Task Properties

Every task has:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Display name |
| `description` | string | What player must do |
| `task_type` | enum | social/achievement/daily/weekly |
| `reward_type` | enum | BZ/BB/XP |
| `reward_amount` | integer | How much reward |
| `action_url` | string? | External link (for social tasks) |
| `verification_type` | enum | auto/manual/honor |
| `required_value` | integer? | Threshold (e.g., "reach 10K taps") |

### 7.3 Task States

**Player-Task Relationship:**

Each player has a state for each task:

| State | Description | Actions Available |
|-------|-------------|-------------------|
| **Available** | Not started, requirements met | "Start" or auto-tracking |
| **Locked** | Requirements not met (XP/tier) | None (show lock icon) |
| **In Progress** | Started but not completed | Continue working |
| **Completed** | Requirements met, reward claimable | "Claim Reward" |
| **Claimed** | Reward already claimed | None (checkmark shown) |

**State Transitions:**
```
Available → In Progress → Completed → Claimed
     ↓            ↓            ↓
  (Daily/Weekly reset) → Available
```

### 7.4 Task Verification Methods

**Auto Verification:**
- System tracks progress automatically
- Example: "Reach 10,000 taps" - system checks `totalTaps >= 10000`
- When threshold met → automatically mark as "Completed"

**Manual Verification:**
- Player clicks "Verify" button
- System checks current game state against requirement
- Example: "Own 50 upgrades" - checks `totalUpgrades >= 50`

**Honor System:**
- Player manually marks as complete (for external tasks)
- Example: "Follow on Twitter" - player clicks "Done" after following
- No server-side verification (trust-based)

### 7.5 Task Claiming Flow

**Step-by-Step:**

1. **Player clicks "Claim Reward"** on completed task
2. **System validates:**
   - Task is in "Completed" state?
   - Not already claimed?
   - Meets verification requirements?
3. **If valid:**
   - Add reward to player's balance (BZ, BB, or XP)
   - Mark task as "Claimed"
   - Update `user_tasks` table with `claimed: true`, `claimed_at: timestamp`
   - Sync to database
4. **Success feedback:**
   - "+X BZ received!" or "+X BB received!"
   - Confetti animation (optional)

### 7.6 Reset Logic

**Daily Tasks (24-hour cycle):**
```
Reset Time: 00:00 UTC every day

On reset:
- Mark all daily tasks as "Available" again
- Clear progress counters (if tracking incremental progress)
- Reset claimed status to false
```

**Weekly Tasks (7-day cycle):**
```
Reset Time: Monday 00:00 UTC

On reset:
- Mark all weekly tasks as "Available" again
- Clear progress counters
- Reset claimed status to false
```

**Database Operation:**
```sql
-- Reset daily tasks
UPDATE user_tasks 
SET claimed = false, progress = 0, claimed_at = NULL
WHERE task_id IN (SELECT id FROM tasks WHERE task_type = 'daily')
  AND last_reset_at < (NOW() - INTERVAL '1 day');

-- Reset weekly tasks
UPDATE user_tasks
SET claimed = false, progress = 0, claimed_at = NULL
WHERE task_id IN (SELECT id FROM tasks WHERE task_type = 'weekly')
  AND last_reset_at < (NOW() - INTERVAL '7 days');
```

---

## 8. Weekly Challenges System

### 8.1 Challenge Overview

**What are Weekly Challenges?**
- Time-limited goals that reset every Monday at 00:00 UTC
- **4 challenges** tracking different play styles
- Rewards: 5,000 XP or 1,000 BB per challenge
- Challenges track **progress from the start of the week**, not lifetime

### 8.2 The 4 Weekly Challenges

| Challenge | Key | Icon | Description | Target | Reward |
|-----------|-----|------|-------------|--------|--------|
| **Tap Master** | `tapper` | ⚡ | Tap 100,000 times this week | 100,000 taps | 5,000 XP |
| **Builder** | `builder` | 🔨 | Buy 10 upgrades this week | 10 upgrades | 5,000 XP |
| **Exchange Guru** | `converter` | 🔄 | Convert 10 times this week | 10 conversions | 5,000 XP |
| **Networker** | `recruiter` | 👥 | Invite 5 friends this week | 5 referrals | 1,000 BB |

### 8.3 Baseline System (CRITICAL CONCEPT)

**Problem to Solve:**
- Player has 500,000 lifetime taps
- Week starts Monday
- Player taps 10,000 times during the week
- How does system know progress is 10,000 (not 510,000)?

**Solution: Baseline Tracking**

Each challenge stores a **baseline value** = player's stat at week start:

```
Baseline = Player's stat value when week begins
Progress = Current Value - Baseline
```

**Example:**

```
Monday 00:00 UTC (Week Start):
- Player totalTaps = 500,000
- Challenge baseline_value = 500,000
- Challenge current_progress = 0

Monday 12:00 (player taps 1,000 times):
- Player totalTaps = 501,000
- Challenge current_progress = 501,000 - 500,000 = 1,000

Friday 18:00 (player taps 99,000 more times):
- Player totalTaps = 600,000
- Challenge current_progress = 600,000 - 500,000 = 100,000
- Challenge completed! (progress >= target)
```

### 8.4 Challenge Properties

Each challenge has:

| Property | Type | Description |
|----------|------|-------------|
| `id` | UUID | Unique challenge instance ID |
| `user_id` | UUID | Player who owns this challenge |
| `challenge_key` | enum | tapper/builder/converter/recruiter |
| `target_value` | integer | Goal (100000, 10, 10, 5) |
| `baseline_value` | integer | Player's stat at week start |
| `current_progress` | integer | Current value - baseline |
| `claimed` | boolean | Has reward been claimed? |
| `week_start_date` | date | Monday of current week |
| `created_at` | timestamp | When challenge was created |

### 8.5 Challenge Initialization

**When challenges are created:**

1. **Trigger:** Player reaches Gold tier (25,000 XP) for first time
2. **Or:** New week starts (Monday 00:00 UTC)

**Initialization Logic:**

```
For each challenge_key in [tapper, builder, converter, recruiter]:
  
  1. Get player's current stat:
     - tapper: totalTaps
     - builder: totalUpgrades
     - converter: totalConversionEvents
     - recruiter: referralCount
  
  2. Create challenge record:
     - challenge_key = key
     - target_value = predefined (100000, 10, 10, 5)
     - baseline_value = current stat value
     - current_progress = 0
     - claimed = false
     - week_start_date = current Monday date
```

**Example Initialization:**

```
Player stats at Monday 00:00 UTC:
- totalTaps: 500,000
- totalUpgrades: 75
- totalConversionEvents: 20
- referralCount: 3

Created challenges:
1. Tap Master
   - baseline_value: 500,000
   - target_value: 100,000
   - current_progress: 0

2. Builder
   - baseline_value: 75
   - target_value: 10
   - current_progress: 0

3. Exchange Guru
   - baseline_value: 20
   - target_value: 10
   - current_progress: 0

4. Networker
   - baseline_value: 3
   - target_value: 5
   - current_progress: 0
```

### 8.6 Progress Calculation (CRITICAL)

**Formula:**
```
current_progress = MAX(0, current_stat_value - baseline_value)
```

**Why MAX(0, ...)?**
- Prevents negative progress
- Handles edge cases (e.g., database sync issues)

**Update Triggers:**

Challenges update when relevant actions occur:

| Challenge | Update Trigger | Logic |
|-----------|----------------|-------|
| Tap Master | After any tap | `progress = totalTaps - baseline` |
| Builder | After upgrade purchase | `progress = totalUpgrades - baseline` |
| Exchange Guru | After BZ→BB conversion | `progress = totalConversionEvents - baseline` |
| Networker | After referral confirmed | `progress = referralCount - baseline` |

**Example Progression (Tap Master):**

```
Week Start (Monday):
- totalTaps: 500,000
- baseline: 500,000
- progress: 0 / 100,000 (0%)

After 10,000 taps:
- totalTaps: 510,000
- baseline: 500,000
- progress: 10,000 / 100,000 (10%)

After 100,000 taps:
- totalTaps: 600,000
- baseline: 500,000
- progress: 100,000 / 100,000 (100%) ✓ COMPLETED
```

### 8.7 Challenge States

**State Flow:**
```
Not Started → In Progress → Completed → Claimed
     ↓                                      ↓
(Weekly reset) ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

**State Definitions:**

| State | Condition | Display |
|-------|-----------|---------|
| **Not Started** | progress = 0 | "0 / 100,000" |
| **In Progress** | 0 < progress < target | "45,000 / 100,000 (45%)" |
| **Completed** | progress >= target, not claimed | "✓ Complete - Claim Reward" |
| **Claimed** | claimed = true | "✓ Claimed" (checkmark) |

### 8.8 Claiming Rewards

**Step-by-Step:**

1. **Player clicks "Claim Reward"** on completed challenge
2. **System validates:**
   - progress >= target_value?
   - claimed = false?
   - Player owns this challenge?
3. **If valid:**
   - Add reward to player balance (XP or BB)
   - Mark `claimed = true`
   - Update `claimed_at = current timestamp`
   - Sync to database
4. **Success feedback:**
   - "+5,000 XP!" or "+1,000 BB!"
   - Confetti animation

**Cannot claim if:**
- Progress < target
- Already claimed
- Challenge expired/reset

### 8.9 Weekly Reset Logic

**Reset Timing:**
```
Every Monday at 00:00 UTC
```

**Reset Process:**

```
1. Archive old challenges (optional - for analytics)

2. Delete current week's challenges:
   DELETE FROM weekly_challenges 
   WHERE user_id = X AND week_start_date < current_monday

3. Create fresh challenges:
   - Get player's current stats
   - Set new baselines = current values
   - Set progress = 0
   - Set claimed = false
   - Set week_start_date = current Monday
```

**Important:** The reset MUST happen **before** the player takes any actions on Monday, otherwise baseline values will be incorrect.

**Example Reset:**

```
Sunday 23:59:59 UTC:
- Player has Tap Master progress: 98,000 / 100,000 (not claimed)

Monday 00:00:00 UTC (Reset):
- Old challenge deleted/archived
- New Tap Master created:
  - baseline_value: 600,000 (current totalTaps)
  - target_value: 100,000
  - current_progress: 0
  - claimed: false

Result: Fresh challenge, player starts from 0 progress
```

---

## 9. Referral System

### 9.1 Referral Flow Overview

**Complete Flow:**
```
1. Player A generates referral link
2. Player A shares link with Player B
3. Player B clicks link → opens BunBun
4. Player B completes signup (first login)
5. System validates: B is new user, A is valid referrer
6. Rewards distributed:
   - Player A (referrer): 5,000 BZ + 500 BB
   - Player B (referee): 2,000 BZ + 200 BB
7. Player A's referralCount increments
```

### 9.2 Referral Link Format

**Structure:**
```
https://t.me/BunBunBot?start=ref_TELEGRAM_ID
```

**Example:**
```
Player A's Telegram ID: 123456789
Referral Link: https://t.me/BunBunBot?start=ref_123456789
```

**Components:**
- `https://t.me/BunBunBot` = Bot deeplink base
- `?start=` = Telegram deeplink parameter
- `ref_123456789` = Referral code (prefix + referrer's Telegram ID)

### 9.3 Referral Link Generation

**When generated:**
- Player opens "Tasks & Referrals" screen
- System creates personalized link using player's Telegram ID

**Code Logic:**
```
referralLink = `https://t.me/BunBunBot?start=ref_${player.telegramId}`
```

**Display:**
- Show link in UI
- "Copy Link" button
- "Share" button (triggers Telegram share dialog)

### 9.4 Referral Validation Rules

**For referral to be valid:**

1. **Referee (Player B) must be NEW:**
   - First time opening BunBun
   - No existing profile in database
   - Arrived via referral link (has `start` parameter)

2. **Referrer (Player A) must be VALID:**
   - Telegram ID exists in database
   - Has active profile
   - Not the same as referee (cannot refer yourself)

3. **No duplicates:**
   - Each player can only be referred once
   - Referee's `referred_by` field must be NULL

4. **Link must be intact:**
   - `start` parameter format: `ref_XXXXXXXX`
   - Referrer ID must be numeric

**Invalid Scenarios:**
- Player B already has account → no rewards
- Player A refers themselves → blocked
- Player B clicks link but manually types different ID → no rewards
- Malformed referral code → no rewards

### 9.5 Reward Distribution

**Reward Table:**

| Recipient | BZ Reward | BB Reward | Notes |
|-----------|-----------|-----------|-------|
| **Referrer** (Player A) | 5,000 BZ | 500 BB | Person who shared link |
| **Referee** (Player B) | 2,000 BZ | 200 BB | Person who used link |

**When rewards are given:**
- Immediately after successful validation
- On referee's first login/profile creation
- Atomic transaction (both get rewards or neither does)

**Data Updates:**

```
For Referrer (Player A):
- bz += 5,000
- bb += 500
- referralCount += 1

For Referee (Player B):
- bz += 2,000
- bb += 200
- referred_by = Player A's user_id
- referral_source = "ref_123456789"

Database:
- Insert record in referrals table:
  - referrer_id: Player A's user_id
  - referee_id: Player B's user_id
  - status: "confirmed"
  - created_at: current timestamp
```

### 9.6 Referral Tracking

**Metrics tracked:**

| Metric | Field | Description |
|--------|-------|-------------|
| Total Referrals | `referralCount` | How many people player has referred |
| Who Referred This Player | `referred_by` | User ID of referrer (NULL if organic) |
| Referral Source | `referral_source` | Original referral code used |

**Analytics:**
- Track referral success rate
- Identify top referrers
- Monitor referral chain depth
- Detect fraud patterns

### 9.7 Referral System Edge Cases

**Scenario 1: Player clicks multiple referral links**
- **Rule:** First click wins
- If Player B clicks A's link, then C's link → A gets credit
- Database: Check if `referred_by` already set

**Scenario 2: Player tries to refer themselves**
- **Rule:** Blocked
- Validation: `referee_telegram_id !== referrer_telegram_id`

**Scenario 3: Player reinstalls app**
- **Rule:** Not counted as new referral
- Validation: Check if Telegram ID exists in profiles table

**Scenario 4: Link shared outside Telegram**
- **Challenge:** Web version has no Telegram ID
- **Solution:** Only works within Telegram Mini App environment

**Scenario 5: Referral limit**
- **Current:** No limit on referrals
- **Future consideration:** Cap at X referrals per day (anti-fraud)

---

## 10. NFT Collection System

### 10.1 NFT Overview

**What are NFTs in BunBun?**
- **Collectible digital badges** representing achievements
- Purchased with **BunnyBucks (BB)**
- **Future utility:** Boost passive income or provide bonuses
- **Status symbol:** Show off rare collections

**Not actual blockchain NFTs** - they're in-game collectibles called "NFTs" for branding.

### 10.2 NFT Properties

Each NFT has:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Display name (e.g., "Golden Bunny") |
| `description` | string | Lore/flavor text |
| `image_url` | string | NFT artwork URL |
| `rarity` | enum | common/rare/epic/legendary/mythic |
| `price_bb` | integer | Cost in BunnyBucks |
| `requirement_type` | enum | xp/tier/referrals/none |
| `requirement_value` | integer | Unlock threshold |

### 10.3 Rarity Tiers

**5 Rarity Levels:**

| Rarity | Color | Price Range | Requirement Examples | Supply |
|--------|-------|-------------|---------------------|--------|
| **Common** | Gray | 100-500 BB | None | Unlimited |
| **Rare** | Blue | 500-1,500 BB | 10K XP or Bronze tier | Unlimited |
| **Epic** | Purple | 1,500-3,000 BB | 50K XP or Silver tier | Unlimited |
| **Legendary** | Orange | 3,000-7,000 BB | 500K XP or Diamond tier | Unlimited |
| **Mythic** | Rainbow | 7,000-10,000 BB | 2M XP or Master tier | Unlimited |

**Visual Indicators:**
- Border color matches rarity
- Glow effect for Legendary+
- Animated border for Mythic

### 10.4 NFT States

**From Player's Perspective:**

| State | Description | Display | Actions |
|-------|-------------|---------|---------|
| **Locked** | Requirements not met | Lock icon, grayed out | None |
| **Unlocked** | Requirements met, not owned | Normal colors, price shown | "Purchase" button |
| **Owned** | Player purchased this NFT | "OWNED" badge, checkmark | None (already owned) |

**State Transitions:**
```
Locked → Unlocked → Owned
   ↑         ↑
(Meet requirements) → (Purchase with BB)
```

### 10.5 Unlock Requirements

**Requirement Types:**

**1. XP Threshold:**
```
requirement_type: "xp"
requirement_value: 100000

Player must have >= 100,000 XP to purchase
```

**2. Tier Requirement:**
```
requirement_type: "tier"
requirement_value: 5 (Platinum)

Player must be Platinum tier or higher
```

**3. Referral Count:**
```
requirement_type: "referrals"
requirement_value: 10

Player must have referred >= 10 friends
```

**4. No Requirement:**
```
requirement_type: "none"
requirement_value: 0

Available to all players
```

### 10.6 Purchase Flow

**Step-by-Step:**

1. **Player clicks on NFT** in collection screen
2. **System checks unlock status:**
   - Requirements met?
   - Not already owned?
3. **If unlocked:**
   - Show "Purchase" button with BB price
   - Player clicks "Purchase"
4. **System validates:**
   - Player has enough BB?
   - NFT is unlocked?
   - Not already owned?
5. **If valid:**
   - Deduct BB: `player.bb -= nft.price_bb`
   - Add to owned: `player.ownedNFTs.push(nft.id)`
   - Insert record: `user_nfts` table
   - Sync to database
6. **Success feedback:**
   - NFT image animation
   - "You now own [NFT Name]!"
   - Confetti effect

**Data Updates:**
```
player.bb -= nft_price
player.ownedNFTs.push(nft_id)

Database:
INSERT INTO user_nfts (user_id, nft_id, purchased_at)
VALUES (player_id, nft_id, NOW())
```

### 10.7 NFT Display

**Collection Grid:**
- 2-3 columns on mobile, 4-5 on desktop
- Card shows:
  - NFT image
  - Name
  - Rarity badge
  - Price (if not owned)
  - "OWNED" badge (if owned)
  - Lock icon (if locked)

**Filter Options:**
- "All" / "Owned" / "Available" / "Locked"
- Sort by: Rarity / Price / Name

**Progress Indicator:**
- "X / Y NFTs Collected"
- Completion percentage

### 10.8 Future: NFT Utility System

**Planned Features:**

**Passive Income Boosts:**
```
Each owned NFT provides a multiplier:
- Common: +1% passive income
- Rare: +2.5%
- Epic: +5%
- Legendary: +10%
- Mythic: +25%

Total Boost = SUM(owned NFT multipliers)

Example:
- Own 3 Common + 1 Rare = +5.5% total passive income
- Base passive: 1,000 BZ/h
- Boosted passive: 1,055 BZ/h
```

**Special Abilities:**
```
Certain NFTs unlock special features:
- "Lucky Bunny" - 2× tap rewards for 1 hour daily
- "Speed Demon" - Tap animation faster
- "Wealthy Bunny" - 5% discount on all upgrades
```

**Collection Bonuses:**
```
Complete sets for extra rewards:
- All Common tier: +1,000 BB
- All Rare tier: +5,000 BB
- Full collection: Exclusive "Collector" badge
```

---

## 11. Data Architecture

### 11.1 Why Hybrid Architecture?

**Problem:**
- **Telegram Mini Apps** must be fast and responsive
- **Database queries** have latency (network requests)
- **Offline play** should be possible

**Solution: localStorage + Supabase Hybrid**

```
┌─────────────────┐
│  localStorage   │ ← Fast, instant access, client-side
│  (User's Phone) │
└────────┬────────┘
         │
         ├──→ Reads: Instant (no network)
         ├──→ Writes: Instant (no network)
         └──→ Sync: Background to Supabase
                ↓
         ┌─────────────────┐
         │    Supabase     │ ← Persistent, server-side, synced across devices
         │   (Database)    │
         └─────────────────┘
```

**Benefits:**
- **Speed:** localStorage reads/writes = 0ms latency
- **Offline:** Game works without internet
- **Persistence:** Data backed up to Supabase
- **Cross-device:** Sync between devices
- **Security:** Server validates critical operations

### 11.2 Data Location Matrix

**What goes where?**

| Data Type | localStorage | Supabase | Sync Frequency | Why? |
|-----------|--------------|----------|----------------|------|
| **BunnyZap (BZ)** | ✅ | ✅ | Every 30s / on action | High-frequency updates |
| **BunnyBucks (BB)** | ✅ | ✅ | Every 30s / on action | High-frequency updates |
| **XP** | ✅ | ✅ | Every 30s / on action | High-frequency updates |
| **Total Taps** | ✅ | ✅ | Every 30s | Increments rapidly |
| **Passive Income Rate** | ✅ | ✅ | On upgrade purchase | Changes rarely |
| **Owned Upgrades** | ✅ | ✅ | On purchase | Array, merge with Set union |
| **Owned NFTs** | ✅ | ✅ | On purchase | Array, merge with Set union |
| **Referral Count** | ✅ | ✅ | On new referral | Changes rarely |
| **Weekly Challenges** | ❌ | ✅ | On load / on update | Source of truth: DB |
| **Tasks** | ❌ | ✅ | On load / on claim | Source of truth: DB |
| **User Profile** | ✅ (partial) | ✅ | On login / on change | Master data in DB |
| **Task Definitions** | ❌ | ✅ | On app load (cached) | Static content |
| **Upgrade Definitions** | ❌ | ✅ | On app load (cached) | Static content |
| **NFT Definitions** | ❌ | ✅ | On app load (cached) | Static content |

**Key Principles:**
- **Hot data** (taps, BZ, XP) → localStorage primary, Supabase backup
- **Cold data** (definitions, challenges) → Supabase only
- **Transactional data** (purchases, claims) → Immediate Supabase write

### 11.3 Database Schema

**All 19 Tables:**

#### **Table 1: `profiles`**
Core user data and game state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `telegram_id` | BIGINT | Unique Telegram user ID |
| `username` | TEXT | Telegram username |
| `first_name` | TEXT | User's first name |
| `last_name` | TEXT | User's last name |
| `language_code` | TEXT | Telegram language (e.g., "en") |
| `bz` | INTEGER | Current BunnyZap balance |
| `bb` | INTEGER | Current BunnyBucks balance |
| `xp` | INTEGER | Total experience points |
| `total_taps` | INTEGER | Lifetime tap count |
| `total_upgrades` | INTEGER | Lifetime upgrade purchases |
| `total_conversion_events` | INTEGER | Lifetime conversion count |
| `total_bz_converted` | INTEGER | Total BZ converted to BB |
| `passive_income_rate` | INTEGER | Current BZ/hour generation |
| `referral_count` | INTEGER | Successful referrals |
| `referred_by` | UUID | User ID of referrer (nullable) |
| `referral_source` | TEXT | Original referral code |
| `last_sync_at` | TIMESTAMP | Last database sync time |
| `created_at` | TIMESTAMP | Account creation time |
| `updated_at` | TIMESTAMP | Last profile update |

**Indexes:**
- `telegram_id` (unique)
- `referred_by`
- `created_at`

---

#### **Table 2: `build_parts`**
Hardware upgrade definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | Upgrade name |
| `description` | TEXT | Flavor text |
| `base_income` | INTEGER | BZ per hour at level 1 |
| `base_price` | INTEGER | Initial cost in BZ |
| `category` | TEXT | Energy/Computing/Other |
| `image` | TEXT | Icon/image filename |
| `required_xp` | INTEGER | Minimum XP to unlock |
| `created_at` | TIMESTAMP | Record creation time |

---

#### **Table 3: `user_build_parts`**
Player's owned upgrades (junction table).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → profiles.id |
| `build_part_id` | UUID | FK → build_parts.id |
| `quantity` | INTEGER | How many owned |
| `purchased_at` | TIMESTAMP | First purchase time |
| `updated_at` | TIMESTAMP | Last update time |

**Unique Constraint:** `(user_id, build_part_id)`

---

#### **Table 4: `nfts`**
NFT collectible definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `name` | TEXT | NFT name |
| `description` | TEXT | Lore/flavor text |
| `image_url` | TEXT | Artwork URL |
| `rarity` | TEXT | common/rare/epic/legendary/mythic |
| `price_bb` | INTEGER | Cost in BunnyBucks |
| `requirement_type` | TEXT | xp/tier/referrals/none |
| `requirement_value` | INTEGER | Unlock threshold |
| `created_at` | TIMESTAMP | Record creation time |

---

#### **Table 5: `user_nfts`**
Player's owned NFTs (junction table).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → profiles.id |
| `nft_id` | UUID | FK → nfts.id |
| `purchased_at` | TIMESTAMP | Purchase time |

**Unique Constraint:** `(user_id, nft_id)` - prevents duplicate ownership

---

#### **Table 6: `tasks`**
Task definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Task display name |
| `description` | TEXT | What to do |
| `task_type` | TEXT | social/achievement/daily/weekly |
| `reward_type` | TEXT | BZ/BB/XP |
| `reward_amount` | INTEGER | How much reward |
| `action_url` | TEXT | External link (nullable) |
| `verification_type` | TEXT | auto/manual/honor |
| `required_value` | INTEGER | Threshold (nullable) |
| `created_at` | TIMESTAMP | Record creation time |

---

#### **Table 7: `user_tasks`**
Player's task progress (junction table).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → profiles.id |
| `task_id` | UUID | FK → tasks.id |
| `progress` | INTEGER | Current progress value |
| `claimed` | BOOLEAN | Has reward been claimed? |
| `claimed_at` | TIMESTAMP | When reward was claimed (nullable) |
| `last_reset_at` | TIMESTAMP | Last daily/weekly reset (nullable) |
| `created_at` | TIMESTAMP | Record creation time |

**Unique Constraint:** `(user_id, task_id)`

---

#### **Table 8: `weekly_challenges`**
Player's weekly challenge instances.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → profiles.id |
| `challenge_key` | TEXT | tapper/builder/converter/recruiter |
| `target_value` | INTEGER | Goal to reach |
| `baseline_value` | INTEGER | Stat value at week start |
| `current_progress` | INTEGER | Current - baseline |
| `claimed` | BOOLEAN | Has reward been claimed? |
| `claimed_at` | TIMESTAMP | When reward was claimed (nullable) |
| `week_start_date` | DATE | Monday of this week |
| `created_at` | TIMESTAMP | Record creation time |

**Unique Constraint:** `(user_id, challenge_key, week_start_date)`

---

#### **Table 9: `referrals`**
Referral relationships.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `referrer_id` | UUID | FK → profiles.id (who referred) |
| `referee_id` | UUID | FK → profiles.id (who was referred) |
| `status` | TEXT | pending/confirmed/invalid |
| `referral_code` | TEXT | Original code used |
| `created_at` | TIMESTAMP | Referral time |

---

#### **Table 10: `conversion_history`**
BZ→BB conversion logs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → profiles.id |
| `bz_amount` | INTEGER | BZ converted |
| `bb_amount` | INTEGER | BB received |
| `exchange_rate` | INTEGER | Rate at time (1000) |
| `bz_balance_before` | INTEGER | BZ before conversion |
| `bz_balance_after` | INTEGER | BZ after conversion |
| `bb_balance_before` | INTEGER | BB before conversion |
| `bb_balance_after` | INTEGER | BB after conversion |
| `created_at` | TIMESTAMP | Conversion time |

**Analytics table** - tracks conversion history for metrics.

---

#### **Tables 11-19: Supporting Tables**

**`quickcharge_state`** - QuickCharge feature state (uses remaining, cooldown)  
**`sync_logs`** - Sync operation logs (debugging)  
**`task_completions`** - Task completion history (analytics)  
**`upgrade_purchases`** - Upgrade purchase history (analytics)  
**`xp_tier_milestones`** - Tier unlock events (analytics)  
**`daily_active_users`** - DAU tracking (analytics)  
**`game_events`** - Generic event logging (analytics)  
**`payment_transactions`** - Future: Telegram Stars payments  
**`reward_claims`** - Task/challenge reward claim logs (analytics)

### 11.4 Row Level Security (RLS)

**What is RLS?**
- Supabase feature that restricts database access at the row level
- **Every table has RLS enabled**
- Policies define who can SELECT/INSERT/UPDATE/DELETE which rows

**Standard Policy Pattern:**

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own records" 
ON table_name FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records" 
ON table_name FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records" 
ON table_name FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records" 
ON table_name FOR DELETE 
USING (auth.uid() = user_id);
```

**Public Read Tables:**
- `build_parts` - upgrade definitions
- `nfts` - NFT definitions
- `tasks` - task definitions

These have:
```sql
CREATE POLICY "Anyone can view" 
ON table_name FOR SELECT 
USING (true);
```

**Why RLS?**
- **Security:** Players can't access/modify other players' data
- **Automatic:** Enforced at database level (can't be bypassed)
- **Zero trust:** Even if client code is hacked, DB remains secure

---

## 12. Sync Strategy

### 12.1 The Math.max() Philosophy

**Core Principle:**
> When merging localStorage and Supabase data, always keep the **highest value** for numeric fields.

**Why?**
- **Prevents data loss:** Never decrease player progress
- **Handles race conditions:** Multiple devices updating simultaneously
- **Offline-friendly:** Offline progress merges safely
- **Simple logic:** Easy to implement and debug

**Formula:**
```
Merged Value = MAX(localStorage value, Supabase value)
```

**Example:**

```
Scenario: Player plays on 2 devices simultaneously

Device A (Phone):
- Plays offline for 30 minutes
- Earns 5,000 BZ through tapping
- localStorage: bz = 15,000

Device B (Tablet):
- Plays online
- Earns 3,000 BZ through passive income
- Supabase: bz = 13,000

When Device A comes online and syncs:
Merged BZ = MAX(15,000, 13,000) = 15,000
Result: Both devices show 15,000 BZ (higher progress preserved)
```

### 12.2 Sync Flow Stages

**3-Stage Sync Process:**

```
┌──────────────────────────────────────────────────────┐
│  STAGE 1: LOAD (App Start)                           │
├──────────────────────────────────────────────────────┤
│  1. Read localStorage                                │
│  2. Fetch from Supabase                              │
│  3. Merge using Math.max()                           │
│  4. Update app state with merged values              │
│  5. Write merged values back to both storages        │
└──────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────┐
│  STAGE 2: RUNTIME (During Gameplay)                  │
├──────────────────────────────────────────────────────┤
│  1. User action occurs (tap, purchase, etc.)         │
│  2. Update app state immediately                     │
│  3. Write to localStorage immediately (0ms)          │
│  4. Queue for background sync                        │
└──────────────────────────────────────────────────────┘
         ↓
┌──────────────────────────────────────────────────────┐
│  STAGE 3: BACKGROUND SYNC (Every 30s)                │
├──────────────────────────────────────────────────────┤
│  1. Debounced sync timer triggers                    │
│  2. Fetch current Supabase values                    │
│  3. Merge localStorage vs Supabase (Math.max)        │
│  4. UPSERT to Supabase with merged values            │
│  5. Update last_sync_at timestamp                    │
└──────────────────────────────────────────────────────┘
```

### 12.3 Numeric Field Merge Logic

**Fields that use Math.max():**
- `bz` (BunnyZap balance)
- `bb` (BunnyBucks balance)
- `xp` (Experience Points)
- `total_taps` (Lifetime tap count)
- `total_upgrades` (Lifetime upgrade purchases)
- `total_conversion_events` (Lifetime conversions)
- `total_bz_converted` (Lifetime BZ converted)
- `passive_income_rate` (Current BZ/hour)
- `referral_count` (Successful referrals)

**Merge Code Pattern:**
```typescript
const mergedBz = Math.max(
  localStorageBz || 0,
  supabaseBz || 0
);

const mergedXp = Math.max(
  localStorageXp || 0,
  supabaseXp || 0
);
```

### 12.4 Array Field Merge Logic

**Arrays use Set Union** (combine and deduplicate):

**Owned Upgrades:**
```typescript
// localStorage: ["upgrade-1", "upgrade-2"]
// Supabase: ["upgrade-2", "upgrade-3"]

const mergedUpgrades = [
  ...new Set([
    ...localStorageUpgrades,
    ...supabaseUpgrades
  ])
];
// Result: ["upgrade-1", "upgrade-2", "upgrade-3"]
```

**Owned NFTs:**
```typescript
// localStorage: ["nft-1", "nft-2"]
// Supabase: ["nft-2", "nft-3", "nft-4"]

const mergedNfts = [
  ...new Set([
    ...localStorageNfts,
    ...supabaseNfts
  ])
];
// Result: ["nft-1", "nft-2", "nft-3", "nft-4"]
```

**Why Set Union?**
- Prevents duplicates
- Preserves ownership from both sources
- Handles purchases made offline on multiple devices

### 12.5 Conflict Resolution Examples

**Example 1: Offline Tapping**
```
Initial State (both synced):
- localStorage: { bz: 10000, total_taps: 50000 }
- Supabase: { bz: 10000, total_taps: 50000 }

Player goes offline, taps 5000 times:
- localStorage: { bz: 15000, total_taps: 55000 }
- Supabase: { bz: 10000, total_taps: 50000 } (stale)

Player comes online, sync runs:
- Merged: MAX(15000, 10000) = 15000 BZ
- Merged: MAX(55000, 50000) = 55000 taps
- Upsert to Supabase: { bz: 15000, total_taps: 55000 }

Result: Offline progress preserved ✓
```

**Example 2: Simultaneous Device Usage**
```
Initial State (both devices synced):
- Device A: { bz: 20000 }
- Device B: { bz: 20000 }
- Supabase: { bz: 20000 }

Both devices play simultaneously offline:
- Device A: earns 5000 BZ → { bz: 25000 }
- Device B: earns 3000 BZ → { bz: 23000 }

Device A syncs first:
- Upsert: { bz: MAX(25000, 20000) } = 25000
- Supabase now: { bz: 25000 }

Device B syncs second:
- Merge: MAX(23000, 25000) = 25000
- Device B updates to: { bz: 25000 }

Result: Higher progress wins ✓
```

**Example 3: Upgrade Purchase on 2 Devices**
```
Initial State:
- Device A: ownedUpgrades = ["upgrade-1", "upgrade-2"]
- Device B: ownedUpgrades = ["upgrade-1", "upgrade-2"]

Device A offline: purchases "upgrade-3"
- Device A: ["upgrade-1", "upgrade-2", "upgrade-3"]

Device B offline: purchases "upgrade-4"
- Device B: ["upgrade-1", "upgrade-2", "upgrade-4"]

Both sync:
- Device A upserts: Set union with Supabase
- Device B upserts: Set union with Supabase
- Final merged: ["upgrade-1", "upgrade-2", "upgrade-3", "upgrade-4"]

Result: Both purchases preserved ✓
```

### 12.6 UPSERT Operation

**What is UPSERT?**
```
UPSERT = UPDATE if exists, INSERT if not
```

**Supabase Syntax:**
```typescript
await supabase
  .from('profiles')
  .upsert({
    telegram_id: user.telegramId,
    bz: mergedBz,
    xp: mergedXp,
    total_taps: mergedTaps,
    // ... other fields
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'telegram_id' // Match on this field
  });
```

**Why UPSERT?**
- Handles new users (INSERT)
- Handles existing users (UPDATE)
- Single operation (atomic)
- Idempotent (safe to retry)

### 12.7 Sync Frequency & Debouncing

**Sync Triggers:**

| Event | Sync Timing | Reason |
|-------|-------------|--------|
| App Load | Immediate | Get latest data |
| Tap | Debounced 30s | Avoid DB spam |
| Upgrade Purchase | Immediate | Critical transaction |
| Task Claim | Immediate | Critical transaction |
| Challenge Claim | Immediate | Critical transaction |
| Conversion | Immediate | Critical transaction |
| Background Timer | Every 30s | Periodic backup |
| App Minimize | Immediate | Save before close |

**Debouncing Logic:**
```typescript
let syncTimer: NodeJS.Timeout;

function queueSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    performSync();
  }, 30000); // 30 seconds
}

function performImmediateSync() {
  clearTimeout(syncTimer);
  performSync();
}
```

**Why Debounce?**
- Taps can happen 10× per second
- Each sync = 1 database write
- Debouncing: 100 taps = 1 write (instead of 100 writes)
- Reduces database load, billing costs, latency

### 12.8 Offline Behavior

**When Offline:**
1. All updates write to localStorage only
2. App continues functioning normally
3. User sees no difference (seamless UX)
4. Sync queue builds up

**When Coming Online:**
1. Detect network connectivity
2. Trigger immediate sync
3. Merge all offline changes
4. UPSERT to Supabase
5. Display success message (optional)

**Offline Duration Handling:**
```
Offline for 5 minutes:
- localStorage: accurate, up-to-date
- Supabase: stale by 5 minutes

On reconnect:
- Calculate passive income for offline time
- Merge with Math.max()
- Result: Player gets full offline progress
```

---

## 13. Telegram Integration

### 13.1 Telegram Mini Apps Overview

**What is a Telegram Mini App (TMA)?**
- Web application running inside Telegram client
- Accessed via bot deeplinks or menu button
- Full-screen iframe experience
- Access to Telegram WebApp SDK

**BunBun's Integration:**
```
User opens: https://t.me/BunBunBot
Bot shows: "Play BunBun" button
User clicks: Opens Mini App (your web app)
App loads: Inside Telegram iframe with SDK access
```

### 13.2 Telegram WebApp SDK

**Key Features Used:**

**1. User Data Access:**
```javascript
const initData = window.Telegram.WebApp.initData;
const user = window.Telegram.WebApp.initDataUnsafe.user;

// Returns:
{
  id: 123456789,          // Telegram user ID
  first_name: "John",
  last_name: "Doe",
  username: "johndoe",
  language_code: "en"
}
```

**2. Theme Integration:**
```javascript
const theme = window.Telegram.WebApp.themeParams;
// Adapts app colors to user's Telegram theme
```

**3. Haptic Feedback:**
```javascript
window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
// Vibrates phone on tap/action
```

**4. Close/Back Button:**
```javascript
window.Telegram.WebApp.BackButton.show();
window.Telegram.WebApp.BackButton.onClick(() => {
  // Handle back navigation
});
```

### 13.3 Authentication Flow

**How BunBun Authenticates Users:**

```
1. User opens Mini App
   ↓
2. Telegram provides initData (signed string)
   ↓
3. App sends initData to Supabase Edge Function
   ↓
4. Edge Function verifies signature using bot token
   ↓
5. If valid: Extract Telegram ID + create/fetch user profile
   ↓
6. Return session token to app
   ↓
7. App stores token, proceeds to game
```

**Security:**
- `initData` is cryptographically signed by Telegram
- Cannot be forged
- Includes hash to prevent tampering
- Bot token secret stays on server

**Verification Algorithm:**
```javascript
// Server-side verification
import crypto from 'crypto';

function verifyTelegramInitData(initData: string, botToken: string): boolean {
  const data = new URLSearchParams(initData);
  const hash = data.get('hash');
  data.delete('hash');
  
  const dataCheckString = Array.from(data.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  
  return calculatedHash === hash;
}
```

### 13.4 Bot Commands

**Available Commands:**

```
/start - Launch BunBun Mini App
/help - Show game instructions
/stats - View your current stats (future)
/leaderboard - View top players (future)
```

**Referral Deeplink:**
```
/start ref_123456789
```
→ Opens app with referral parameter

### 13.5 Deep Linking for Referrals

**How Referral Links Work:**

**Step 1: Generate Link**
```javascript
const referralLink = `https://t.me/BunBunBot?start=ref_${user.telegramId}`;
```

**Step 2: User Shares Link**
- Copy to clipboard
- Share via Telegram share dialog
- Post in groups/channels

**Step 3: Recipient Clicks Link**
- Opens Telegram
- Navigates to BunBunBot
- Sees "Play BunBun" button
- Clicks → Opens Mini App

**Step 4: App Receives Parameter**
```javascript
const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
// Returns: "ref_123456789"
```

**Step 5: App Processes Referral**
- Extract referrer ID from `start_param`
- Validate: New user? Valid referrer?
- If valid: Distribute rewards
- Store referral relationship

### 13.6 Future: Telegram Payments

**Telegram Stars Integration (Planned):**

**What are Telegram Stars?**
- Telegram's in-app currency
- Users buy Stars with real money
- Apps can sell items for Stars
- Telegram handles payment processing

**BunBun's Future Use:**
```
User wants to buy 1000 BB:
1. Tap "Buy BB" button
2. Select package (e.g., "1000 BB for 50 Stars")
3. Telegram payment modal opens
4. User confirms purchase
5. Telegram processes payment
6. BunBun receives webhook
7. Add 1000 BB to user's account
```

**Advantages:**
- Native Telegram experience
- No external payment provider
- Instant delivery
- Revenue share with Telegram

---

## 14. User Interface Structure

### 14.1 Screen Navigation

**6 Main Screens:**

```
┌─────────────────────────────────────────────────────┐
│  Header (Always Visible)                            │
│  - BZ Balance                                       │
│  - BB Balance                                       │
│  - XP / Tier Badge                                  │
│  - Profile Button                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Main Content Area (Swipeable)                      │
│                                                      │
│  [Current Screen Content]                           │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Bottom Navigation (Always Visible)                 │
│  [Tap] [Boost] [Build] [Convert] [XP Tiers] [Rewards]│
└─────────────────────────────────────────────────────┘
```

### 14.2 Screen Breakdown

#### **1. Tap Screen**
**Purpose:** Manual tapping for BZ and XP

**Elements:**
- Large bunny character (tap target)
- Tap counter (increments on tap)
- BZ gained counter (e.g., "+1 BZ")
- XP gained counter (e.g., "+1 XP")
- Tap animation (bunny bounces, particles)

**Interactions:**
- Tap bunny → +1 BZ, +1 XP, animate
- Continuous tapping → smooth animations
- Haptic feedback on each tap

---

#### **2. Boost Screen**
**Purpose:** QuickCharge feature for instant energy

**Elements:**
- "QuickCharge" title
- Uses remaining indicator (e.g., "5 uses left")
- Cooldown timer (if on cooldown)
- "Use QuickCharge" button
- Explanation text

**Functionality:**
- Limited uses per period (e.g., 5 per day)
- Cooldown between uses (e.g., 1 hour)
- Effect: Instant +X BZ boost
- Resets daily at 00:00 UTC

---

#### **3. Build Screen**
**Purpose:** Purchase hardware upgrades

**Elements:**
- Category tabs (All / Energy / Computing / Other)
- Grid of upgrade cards:
  - Icon/image
  - Name
  - Description
  - Base income (BZ/h)
  - Current cost (dynamically calculated)
  - Quantity owned
  - "Buy" button
  - Lock icon (if XP requirement not met)
- Total passive income display (top)

**Interactions:**
- Tap upgrade card → Show details modal
- Tap "Buy" → Confirm → Purchase flow
- Filter by category
- Sort by: Price / Income / Name

**Visual Feedback:**
- Locked upgrades: Grayed out
- Affordable upgrades: Green "Buy" button
- Unaffordable upgrades: Red/disabled button

---

#### **4. Convert Screen**
**Purpose:** Exchange BZ for BB

**Elements:**
- Input field: "Amount of BZ to convert"
- Exchange rate indicator: "1000 BZ = 1 BB"
- Preview: "You will receive X BB"
- Current balances: BZ | BB
- "Convert" button
- Validation messages

**Interactions:**
- User enters BZ amount
- System validates (multiple of 1000, sufficient balance, Bronze+ tier)
- Shows preview of BB received
- Tap "Convert" → Confirmation modal → Execute
- Success: Show "+X BB received!"

**Requirements:**
- Minimum: 1000 BZ
- Must be Bronze tier or higher
- Only multiples of 1000 BZ

---

#### **5. XP & Tiers Screen**
**Purpose:** View progression and tier benefits

**Elements:**
- Current tier badge (large, animated)
- Current XP / Next tier XP
- Progress bar to next tier
- List of all 8 tiers:
  - Tier icon
  - Tier name
  - XP threshold
  - Benefits/unlocks
  - Checkmark if achieved
  - Lock if not achieved
- "Your Progress" section

**Interactions:**
- Scroll through tier list
- Tap tier → View detailed benefits
- Celebrate tier-up with animation

---

#### **6. Rewards & NFTs Screen**
**Purpose:** Complete tasks, challenges, view NFTs

**Sub-Tabs:**
1. **Tasks**
   - Daily tasks
   - Weekly tasks
   - Social tasks
   - Achievement tasks
   - Filter: All / Available / Completed / Claimed

2. **Weekly Challenges**
   - 4 challenge cards:
     - Icon + Name
     - Description
     - Progress bar (X / Y)
     - "Claim Reward" button (if complete)
     - Reward amount

3. **Referrals**
   - Referral link (copy/share)
   - Referral count
   - Pending referrals
   - Referral leaderboard (future)

4. **NFT Collection**
   - Grid of NFT cards:
     - Image
     - Name
     - Rarity badge
     - Price (if not owned)
     - "OWNED" badge (if owned)
     - Lock icon (if locked)
   - Filter: All / Owned / Available / Locked
   - Progress: "X / Y NFTs Collected"

### 14.3 Always-Visible Elements

**Header Bar:**
```
[Profile Icon] | [65,906 BZ] [3.18 BB] [306,160 XP] [Platinum Badge]
```

**Bottom Navigation:**
```
[⚡ Tap] [🚀 Boost] [🔨 Build] [🔄 Convert] [👤 XP] [🎁 Rewards]
```

**Profile Modal (accessible from header):**
- Username + Telegram info
- Full stats summary
- Settings (theme, language)
- Logout button

---

## 15. Business Rules & Validation

### 15.1 Resource Spending Rules

**BunnyZap (BZ) Spending:**
- Cannot spend more than current balance
- Balance cannot go negative
- Must be integer amounts
- Validation: `player.bz >= cost`

**BunnyBucks (BB) Spending:**
- Cannot spend more than current balance
- Balance cannot go negative
- Must be integer amounts
- More strict validation (premium currency)

### 15.2 Purchase Validation

**Hardware Upgrade Purchase:**
```
Required Conditions (ALL must be true):
1. Player has sufficient BZ (player.bz >= upgrade_cost)
2. Player meets XP requirement (player.xp >= upgrade.required_xp)
3. Upgrade exists and is defined
4. Upgrade is not disabled

If valid:
  - Deduct BZ
  - Increment ownership
  - Add XP reward
  - Update passive income
  - Sync to DB

If invalid:
  - Show error message
  - Do not process transaction
```

**NFT Purchase:**
```
Required Conditions (ALL must be true):
1. Player has sufficient BB (player.bb >= nft.price_bb)
2. Player meets unlock requirements:
   - XP requirement: player.xp >= nft.requirement_value (if type = xp)
   - Tier requirement: player.tier >= nft.requirement_value (if type = tier)
   - Referral requirement: player.referralCount >= nft.requirement_value (if type = referrals)
3. NFT is not already owned (nft.id NOT IN player.ownedNfts)
4. NFT exists and is defined

If valid:
  - Deduct BB
  - Add to ownedNfts array
  - Insert user_nfts record
  - Sync to DB

If invalid:
  - Show error message (specific reason)
  - Do not process transaction
```

### 15.3 Task/Challenge Claiming Rules

**Task Claim Validation:**
```
Required Conditions (ALL must be true):
1. Task is in "Completed" state
2. Task has not been claimed yet (claimed = false)
3. Player meets verification requirements:
   - Auto: System verified progress meets requirement
   - Manual: Player clicked verify, system checked
   - Honor: Player marked as complete
4. Task exists and is assigned to player

If valid:
  - Add reward (BZ, BB, or XP)
  - Mark claimed = true
  - Set claimed_at = NOW()
  - Sync to DB

If invalid:
  - Show error message
  - Do not distribute reward
```

**Weekly Challenge Claim Validation:**
```
Required Conditions (ALL must be true):
1. challenge.current_progress >= challenge.target_value
2. challenge.claimed = false
3. Challenge belongs to player (user_id match)
4. Challenge is for current week (not expired)

If valid:
  - Add reward (XP or BB)
  - Mark claimed = true
  - Set claimed_at = NOW()
  - Sync to DB

If invalid:
  - Show error message
  - Do not distribute reward
```

### 15.4 Referral Validation

**New Referral Validation:**
```
Required Conditions (ALL must be true):
1. Referee (Player B) is NEW:
   - telegram_id does not exist in profiles table
   - First time opening app
2. Referrer (Player A) is VALID:
   - telegram_id exists in profiles table
   - Has active profile
3. Not self-referral:
   - referee_telegram_id !== referrer_telegram_id
4. Referee has not been referred before:
   - referred_by field is NULL
5. Referral code is valid format:
   - Matches pattern: ref_[0-9]+
6. Link originated from Telegram:
   - Has start_param in initData

If valid:
  - Create profiles record for referee
  - Set referee.referred_by = referrer.user_id
  - Distribute rewards to both
  - Increment referrer.referralCount
  - Insert referrals record
  - Sync to DB

If invalid:
  - Allow app use (don't block)
  - Do not distribute rewards
  - Log invalid attempt (optional)
```

### 15.5 Data Integrity Rules

**Immutable Fields:**
- `telegram_id` - Never changes after creation
- `created_at` - Set once on account creation
- `referred_by` - Set once, never changes

**Monotonic Fields (only increase):**
- `xp` - Cannot decrease
- `total_taps` - Cannot decrease
- `total_upgrades` - Cannot decrease
- `total_conversion_events` - Cannot decrease
- `total_bz_converted` - Cannot decrease
- `referral_count` - Cannot decrease

**Bounded Fields:**
- All balances: `>= 0` (cannot be negative)
- XP tier: `1-8` (8 defined tiers)

**Uniqueness Constraints:**
- `telegram_id` - One account per Telegram user
- `(user_id, nft_id)` - Cannot own same NFT twice
- `(user_id, build_part_id)` - One record per upgrade type (quantity tracked in field)
- `(user_id, challenge_key, week_start_date)` - One challenge instance per week

---

## 16. Appendix: Quick Reference

### 16.1 All Formulas

**Upgrade Pricing:**
```
Cost = Base Price × (1.15 ^ Current Level)
```

**Passive Income:**
```
Total BZ/h = SUM(upgrade.base_income × quantity_owned)
```

**XP from Upgrade Purchase:**
```
XP Gained = FLOOR(Purchase Cost × 0.10)
```

**BZ → BB Conversion:**
```
BB Received = BZ Amount ÷ 1000
```

**Weekly Challenge Progress:**
```
Progress = MAX(0, Current Stat Value - Baseline Value)
```

**Offline Passive Income:**
```
BZ Earned = (Current Time - Last Sync Time) × (Passive Income Rate ÷ 3600)
```

**XP Tier Progress:**
```
Progress % = (Current XP - Current Tier Threshold) / (Next Tier - Current Tier) × 100
```

### 16.2 Key Ratios & Rates

| Metric | Value |
|--------|-------|
| BZ → BB Exchange Rate | 1000:1 |
| Tap Reward | +1 BZ, +1 XP |
| Upgrade Price Growth | 1.15× per level |
| XP from Purchase | 10% of cost |
| Background Sync Frequency | 30 seconds |
| Daily Task Reset | 00:00 UTC |
| Weekly Reset (Tasks & Challenges) | Monday 00:00 UTC |
| QuickCharge Uses | 5 per day |
| QuickCharge Cooldown | 1 hour |

### 16.3 Reward Values

**Tasks:**
| Task Type | BZ Range | BB Range | XP Range |
|-----------|----------|----------|----------|
| Social | 100-5,000 | 100-1,000 | 100-2,000 |
| Achievement | 1,000-50,000 | 0-5,000 | 1,000-10,000 |
| Daily | 500-10,000 | 0-500 | 500-5,000 |
| Weekly | 5,000-100,000 | 0-2,000 | 5,000-20,000 |

**Weekly Challenges:**
| Challenge | Reward |
|-----------|--------|
| Tap Master | 5,000 XP |
| Builder | 5,000 XP |
| Exchange Guru | 5,000 XP |
| Networker | 1,000 BB |

**Referrals:**
| Recipient | BZ | BB |
|-----------|----|----|
| Referrer | 5,000 | 500 |
| Referee | 2,000 | 200 |

### 16.4 XP Tier Thresholds

| Tier | XP Required |
|------|-------------|
| Newbie | 0 |
| Bronze | 1,000 |
| Silver | 5,000 |
| Gold | 25,000 |
| Platinum | 100,000 |
| Diamond | 500,000 |
| Master | 2,000,000 |
| Legend | 10,000,000 |

### 16.5 Reset Times

| Event | Frequency | Time (UTC) |
|-------|-----------|------------|
| Daily Tasks | Every 24 hours | 00:00 |
| Weekly Tasks | Every 7 days | Monday 00:00 |
| Weekly Challenges | Every 7 days | Monday 00:00 |
| QuickCharge Uses | Every 24 hours | 00:00 |

---

## Document End

**This document provides complete understanding of BunBun's product design, game mechanics, business logic, and system architecture.**

Any development team can use this specification to build BunBun from scratch using their preferred technologies and implementation patterns.

**Key Takeaways:**
1. **Hybrid sync strategy** (localStorage + Supabase) for performance + persistence
2. **Math.max() merge** philosophy prevents data loss
3. **Baseline system** for weekly challenges tracks progress from week start
4. **Exponential pricing** (1.15×) for upgrade costs
5. **Dual tracking** for conversions (total BZ + event count)
6. **Set union** for array merges (upgrades, NFTs)
7. **UPSERT** operations for safe database writes
8. **RLS policies** secure user data at database level

---

*Document can be updated whenever major features are added or architecture changes. Treat it as living documentation.*