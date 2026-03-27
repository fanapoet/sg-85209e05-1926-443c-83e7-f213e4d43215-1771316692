# BunBun - Telegram Mini App (TMA)
## Complete Product & Technical Specification

**Version:** 1.0  
**Last Updated:** 2026-03-27  
**Document Type:** Product Requirements & Technical Design Specification

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Game Mechanics](#2-game-mechanics)
3. [Resource System](#3-resource-system)
4. [Progression & XP Tiers](#4-progression--xp-tiers)
5. [Hardware Upgrade System (Build)](#5-hardware-upgrade-system-build)
6. [Conversion System](#6-conversion-system)
7. [Energy & Booster System](#7-energy--booster-system)
8. [Task System](#8-task-system)
9. [Weekly Challenge System](#9-weekly-challenge-system)
10. [Daily Rewards System](#10-daily-rewards-system)
11. [Referral System](#11-referral-system)
12. [NFT Collection System](#12-nft-collection-system)
13. [Data Architecture](#13-data-architecture)
14. [Sync Strategy](#14-sync-strategy)
15. [Telegram Integration](#15-telegram-integration)
16. [User Interface Structure](#16-user-interface-structure)
17. [Business Rules & Validation](#17-business-rules--validation)
18. [Appendix: Quick Reference](#18-appendix-quick-reference)

---

## 1. Product Overview

### 1.1 What is BunBun?

BunBun is a **Telegram Mini App (TMA)** that combines idle clicker mechanics with resource management and social features. Players tap a bunny character to earn resources, build passive income generators, complete tasks, and collect NFTs—all within Telegram's ecosystem.

**Core Concept:** Build an energy empire by tapping, upgrading hardware, and optimizing resource conversion.

### 1.2 Target Audience

- Telegram users interested in casual gaming
- Players who enjoy idle/clicker games
- Crypto-curious users (BB token represents potential future blockchain integration)
- Social gamers who benefit from referral systems

### 1.3 Core Gameplay Loop

```
TAP BUNNY → Earn BZ → Upgrade Build Parts → Earn Passive BZ 
    ↓                        ↓                      ↓
Gain XP → Unlock Tiers → Convert BZ to BB → Purchase NFTs
    ↓                        ↓                      ↓
Complete Tasks → Invite Friends → Earn More Rewards
```

### 1.4 Key Features

1. **Manual Tapping System** - Active gameplay for immediate rewards
2. **Passive Income System** - Build hardware that generates BZ while offline
3. **Multi-Currency Economy** - BZ (in-game), BB (premium), XP (progression)
4. **Energy Management** - Strategic tap timing and booster upgrades
5. **XP-Based Progression** - 5 tiers with increasing benefits
6. **Conversion Mechanism** - Exchange BZ for BB with tier bonuses
7. **Task Completion** - Daily, weekly, and progressive challenges
8. **Referral Rewards** - Earn from friends' gameplay forever
9. **NFT Collection** - Unlockable digital collectibles with requirements
10. **Telegram Integration** - Native TMA with seamless authentication

---

## 2. Game Mechanics

### 2.1 Manual Tapping

**How It Works:**
- Player taps the bunny character on the Tap screen
- Each tap consumes energy and produces BZ + XP
- Tap rewards are modified by booster levels and XP tier

**Tap Reward Calculation:**
```
Base BZ Reward = 10 × incomePerTap level
Tier Bonus = Base × (Tier Percentage ÷ 100)
Total BZ = Base + Tier Bonus
XP per Tap = 1 (always)
```

**Tier Bonuses:**
- Bronze: 0% (no bonus)
- Silver: +5%
- Gold: +15%
- Platinum: +25%
- Diamond: +40%

**Example:**
- Player has incomePerTap level 5
- Player is Gold tier (15% bonus)
- Base reward: 10 × 5 = 50 BZ
- Tier bonus: 50 × 0.15 = 7.5 BZ
- Total: 57.5 BZ per tap + 1 XP

**Energy Consumption:**
- Each tap costs energy equal to `energyPerTap` booster level (minimum 1)
- Energy regenerates at `recoveryRate` per second
- Max energy is determined by `energyCapacity` booster level

### 2.2 Passive Income System

**How It Works:**
- Players build and upgrade hardware parts (Stage 1-5, 10 parts each)
- Each owned part generates BZ per hour automatically
- Income accumulates while player is offline (up to 3 hours max)
- Players must "claim" accumulated income periodically

**Passive Income Calculation:**
```
Total Passive BZ/hour = SUM of all owned parts' yields

Where each part's yield = baseYield × (1.15 ^ level) × (1 + 0.15 × stage)
```

**Example:**
- Player owns Stage 2 Part 3 at Level 5
- Base yield: 50 BZ/hour (hypothetical)
- Yield = 50 × (1.15 ^ 5) × (1 + 0.15 × 2)
- Yield = 50 × 2.011 × 1.30 = 130.7 BZ/hour

**Idle Income Rules:**
- Maximum offline accumulation: **3 hours**
- Claim resets the accumulation timer
- If player doesn't claim for >3 hours, they only receive 3 hours' worth

### 2.3 Resource Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     RESOURCE FLOW                           │
└─────────────────────────────────────────────────────────────┘

TAPPING                          BUILDING
   ↓                                ↓
  BZ ←────────────────────────── BZ/hour (passive)
   ↓                                
   ├─→ Upgrade Build Parts
   ├─→ Upgrade Boosters
   ├─→ Convert to BB (1,000,000:1)
   └─→ Complete Tasks
   
XP (from taps + upgrades)
   ↓
XP TIERS (Bronze → Diamond)
   ↓
Tier Bonuses (tap %, conversion %, BB→BZ unlock)

BB (premium currency)
   ↓
   ├─→ Purchase NFTs
   ├─→ Speed up builds
   └─→ Convert back to BZ (with burn penalty)

TASKS → BZ/BB/XP rewards
REFERRALS → BZ + XP + 20% lifetime share
```

---

## 3. Resource System

### 3.1 BunnyZap (BZ) - Primary Currency

**Purpose:** Main in-game currency for progression and upgrades.

**How to Earn:**
1. **Manual Tapping** - 10 × incomePerTap level per tap (+ tier bonus)
2. **Passive Income** - Automatic generation from owned build parts
3. **Idle Claims** - Accumulated passive income (up to 3 hours)
4. **Task Rewards** - Various tasks award BZ
5. **Referral Earnings** - 20% of referrals' tap + idle income (lifetime)
6. **BB Conversion** - Convert BB back to BZ (with burn penalty)

**How to Spend:**
1. **Build Part Upgrades** - Purchase and upgrade hardware (main sink)
2. **Booster Upgrades** - Improve tapping efficiency
3. **Convert to BB** - Exchange at 1,000,000:1 rate

**Properties:**
- Integer values only (no decimals)
- Can reach millions/billions
- Primary progression metric
- Displayed with comma separators (e.g., "1,234,567")

### 3.2 BunnyBucks (BB) - Premium Currency

**Purpose:** Premium currency representing potential future token economics.

**How to Earn:**
1. **BZ Conversion** - Convert 1,000,000 BZ → 1 BB (+ tier bonus)
2. **Task/Challenge Rewards** - Some tasks award BB directly
3. **Referral Milestones** - Milestone bonuses award BB
4. **Weekly Challenges** - Challenge completions award BB

**How to Spend:**
1. **NFT Purchases** - Buy collectible NFTs (0 to 7 BB each)
2. **Build Speed-Ups** - Pay 0.01 BB per hour to instant-complete builds
3. **Convert to BZ** - Exchange back (requires Silver+ tier, has burn penalty)

**Properties:**
- Decimal values (precision: 6 decimal places)
- Scarce resource (harder to obtain than BZ)
- Not earned through tapping directly
- Displayed as "X.XXXXXX BB"

### 3.3 Experience Points (XP)

**Purpose:** Progression currency that unlocks tiers and benefits.

**How to Earn:**
1. **Manual Tapping** - 1 XP per tap (always)
2. **Build Upgrades** - XP = 50 × stage × (1 + level × 0.1)
3. **Task Rewards** - Many tasks award XP
4. **Referral Bonuses** - Initial signup + milestones award XP
5. **Daily Rewards** - Some days award XP

**How XP is Used:**
- XP is **never spent** - it only accumulates
- XP total determines your **Tier**
- Tier determines bonuses and unlocks

**Properties:**
- Integer values
- Permanent (never decreases)
- Visible progress bar shows current tier progress
- Displayed with comma separators

---

## 4. Progression & XP Tiers

### 4.1 Tier System Overview

BunBun uses a **5-tier progression system** based on total accumulated XP. Higher tiers unlock better bonuses and capabilities.

### 4.2 XP Tier Table

| Tier | XP Required | Tap Bonus | BZ→BB Bonus | BB→BZ Max | Booster Unlock |
|------|-------------|-----------|-------------|-----------|----------------|
| **Bronze** | 0 - 9,999 | 0% | 0% | Locked | Level 1-2 |
| **Silver** | 10,000 - 49,999 | +5% | +5% | 5% of BB balance | Level 3 (3 refs) |
| **Gold** | 50,000 - 149,999 | +15% | +15% | 15% of BB balance | Level 4-5 (5 refs) |
| **Platinum** | 150,000 - 499,999 | +25% | +25% | 25% of BB balance | Level 6+ (7 refs) |
| **Diamond** | 500,000+ | +40% | +40% | 40% of BB balance | All levels unlocked |

### 4.3 Tier Benefits Explained

**Tap Bonus:**
- Increases BZ earned per tap
- Applied multiplicatively to base tap reward
- Example: Gold tier (+15%) with 50 BZ base = 57.5 BZ per tap

**BZ→BB Conversion Bonus:**
- Extra BB received when converting BZ to BB
- Applied to base conversion output
- Example: Converting 1M BZ at Gold tier = 1.15 BB (instead of 1.0 BB)

**BB→BZ Conversion Max:**
- Percentage of your BB balance you can convert back to BZ per transaction
- Bronze tier: Completely locked (cannot convert BB→BZ at all)
- Higher tiers unlock larger conversion limits
- Example: Gold tier with 10 BB balance can convert max 1.5 BB per transaction

**Booster Level Unlock:**
- Higher tiers unlock higher booster upgrade levels
- Some booster levels also require referrals (see Booster System section)

### 4.4 Tier Progression Path

Typical player progression timeline (approximate):

1. **Bronze (Day 1-2):** Learn tapping, start building, earn first referrals
2. **Silver (Day 3-5):** Unlock conversions, optimize build strategy
3. **Gold (Week 1-2):** Scale passive income, complete challenges
4. **Platinum (Week 2-4):** Maximize builds, focus on tasks
5. **Diamond (Month 1+):** Endgame content, NFT collection

---

## 5. Hardware Upgrade System (Build)

### 5.1 Build System Overview

The Build screen is where players purchase and upgrade **hardware parts** that generate passive BZ income. The system is organized into **5 stages** with **10 parts each** (50 total parts).

### 5.2 Stage Structure

| Stage | Parts | Theme | Cost Multiplier | Yield Multiplier |
|-------|-------|-------|-----------------|------------------|
| Stage 1 | s1p1 - s1p10 | Basic Components | 1.0× | 1.0× |
| Stage 2 | s2p1 - s2p10 | Power Systems | 1.1× | 1.15× |
| Stage 3 | s3p1 - s3p10 | Advanced Tech | 1.2× | 1.30× |
| Stage 4 | s4p1 - s4p10 | Energy Matrix | 1.3× | 1.45× |
| Stage 5 | s5p1 - s5p10 | Quantum Core | 1.4× | 1.60× |

**Stage Progression:**
- All stages visible from start
- Later stages are more expensive but yield more BZ/hour
- Players can upgrade any part in any order (no forced sequence)

### 5.3 Part Upgrade Mechanics

**Level System:**
- Each part starts at Level 0 (not owned)
- Can be upgraded from Level 0 → Level 10+ (no hard cap)
- Each level increases both cost and yield

**Part Cost Formula:**
```
Cost = baseCost × (1.2 ^ level) × (1 + 0.10 × stage)
```

**Part Yield Formula:**
```
Yield (BZ/hour) = baseYield × (1.15 ^ level) × (1 + 0.15 × stage)
```

**Example Calculation (Stage 2, Part 3):**
```
Assume baseCost = 1000 BZ, baseYield = 50 BZ/hour

Level 0 → 1:
  Cost = 1000 × (1.2 ^ 0) × (1 + 0.10 × 2) = 1000 × 1 × 1.2 = 1,200 BZ
  Yield = 50 × (1.15 ^ 1) × (1 + 0.15 × 2) = 50 × 1.15 × 1.3 = 74.75 BZ/hour

Level 1 → 2:
  Cost = 1000 × (1.2 ^ 1) × 1.2 = 1,440 BZ
  Yield = 50 × (1.15 ^ 2) × 1.3 = 85.96 BZ/hour

Level 5:
  Cost = 1000 × (1.2 ^ 5) × 1.2 = 2,985 BZ
  Yield = 50 × (1.15 ^ 5) × 1.3 = 130.7 BZ/hour
```

### 5.4 Build Time System

**Build Time by Level:**
- **Level 0-2:** Instant (0 seconds)
- **Level 3:** 15 minutes
- **Level 4:** 30 minutes
- **Level 5:** 1 hour
- **Level 6:** 4 hours
- **Level 7:** 8 hours
- **Level 8:** 16 hours
- **Level 9:** 24 hours
- **Level 10:** 36 hours
- **Level 11+:** 48 hours

**Build Queue:**
- Only **1 part** can be building at a time
- Other parts show "Locked" until current build finishes
- Players must wait or speed up the current build

**Speed-Up Options:**
1. **BB Speed-Up:** 0.01 BB per hour remaining
2. **Stars Speed-Up:** 1 Telegram Star per hour remaining (future feature)

**Example:**
- Part is building, 5 hours remaining
- Speed-up cost: 0.05 BB or 5 Stars
- Player pays → build completes instantly

### 5.5 XP Rewards from Building

**Formula:**
```
XP Reward = 50 × stage × (1 + level × 0.1)
```

**Example:**
- Upgrading Stage 3 part to Level 5
- XP = 50 × 3 × (1 + 5 × 0.1) = 150 × 1.5 = 225 XP

**Purpose:**
- Incentivizes building higher stages and levels
- Contributes to tier progression
- Rewards strategic planning

### 5.6 Total Passive Income Calculation

**System Logic:**
- Sum all owned parts' yields
- Display total as "BZ/hour"
- Accumulate while offline (max 3 hours)

**Example:**
```
Player owns:
- Stage 1 Part 1 (Level 5): 100 BZ/hour
- Stage 1 Part 2 (Level 3): 70 BZ/hour
- Stage 2 Part 1 (Level 4): 120 BZ/hour

Total Passive = 100 + 70 + 120 = 290 BZ/hour

After 2 hours offline: 290 × 2 = 580 BZ claimable
After 5 hours offline: 290 × 3 = 870 BZ claimable (capped at 3 hours)
```

---

## 6. Conversion System

### 6.1 Conversion Overview

The Conversion system allows players to exchange between BZ (abundant) and BB (scarce). Two conversion types exist:

1. **BZ → BB** (Primary direction, unlocked for all players)
2. **BB → BZ** (Reverse direction, requires Silver+ tier, has burn penalty)

### 6.2 BZ → BB Conversion

**Anchor Rate:**
```
1,000,000 BZ = 1.000000 BB (base rate, no bonuses)
```

**Conversion Formula:**
```
Base Output = Input BZ ÷ 1,000,000
Tier Bonus = Base Output × (Tier Percentage ÷ 100)
Total Output = Base Output + Tier Bonus
```

**Tier Bonuses:**
- Bronze: 0% (no bonus, 1:1 anchor rate)
- Silver: +5%
- Gold: +15%
- Platinum: +25%
- Diamond: +40%

**Example 1 (Bronze Tier):**
```
Input: 5,000,000 BZ
Base Output: 5,000,000 ÷ 1,000,000 = 5.000000 BB
Tier Bonus: 0 BB (Bronze has no bonus)
Total: 5.000000 BB
```

**Example 2 (Gold Tier):**
```
Input: 5,000,000 BZ
Base Output: 5,000,000 ÷ 1,000,000 = 5.000000 BB
Tier Bonus: 5.000000 × 0.15 = 0.750000 BB
Total: 5.750000 BB
```

**Validation Rules:**
- Player must have sufficient BZ balance
- Input must be positive
- BZ is deducted, BB is added
- Transaction is atomic (all-or-nothing)

### 6.3 BB → BZ Conversion (Reverse)

**Unlock Requirements:**
- **Bronze Tier:** Completely locked (conversion disabled)
- **Silver+ Tier:** Unlocked

**Conversion Limits by Tier:**
- Silver: Max 5% of BB balance per transaction
- Gold: Max 15% of BB balance per transaction
- Platinum: Max 25% of BB balance per transaction
- Diamond: Max 40% of BB balance per transaction

**Burn Penalty Formula:**
```
Burned Amount = Converted Amount ÷ (Tier Percentage × 2)

Total BB Cost = Converted Amount + Burned Amount
Output BZ = Converted Amount × 1,000,000
```

**Example (Gold Tier, 10 BB balance):**
```
Player wants to convert 1 BB to BZ

1. Check limit: 10 × 0.15 = 1.5 BB max → 1 BB is allowed
2. Calculate burn: 1 ÷ (0.15 × 2) = 1 ÷ 0.30 = 3.333 BB burned
3. Total cost: 1 + 3.333 = 4.333 BB
4. Check balance: 10 BB ≥ 4.333 BB → allowed
5. Output: 1 × 1,000,000 = 1,000,000 BZ

Result: -4.333 BB, +1,000,000 BZ
```

**Why the Burn Penalty?**
- Prevents BB→BZ→BB arbitrage loops
- Makes BB more valuable (harder to "undo" conversions)
- Encourages thoughtful conversion decisions
- Creates deflationary pressure on BB supply

**Validation Rules:**
- Must be Silver+ tier
- Cannot convert more than tier percentage of balance
- Must have sufficient BB for conversion + burn
- Transaction is atomic

### 6.4 Conversion History

**What's Tracked:**
Each conversion creates a history record with:
- **Transaction ID** (unique)
- **Timestamp** (when conversion occurred)
- **Type** (bz-to-bb or bb-to-bz)
- **Input Amount** (BZ or BB spent)
- **Output Amount** (BB or BZ received)
- **Bonus Amount** (tier bonus for BZ→BB, 0 for BB→BZ)
- **Tier** (player's tier at conversion time)

**Why Track Both?**
- **Total BZ Converted (Lifetime):** Used for tasks/challenges that check "convert X total BZ"
- **Conversion Event Count:** Used for tasks that check "perform X conversions" (e.g., "convert 10 times")

**Display:**
- Recent transactions shown in Convert screen
- Shows type, amounts, tier, and time ago
- Helps players track their conversion strategy

---

## 7. Energy & Booster System

### 7.1 Energy System

**Purpose:** Limits continuous tapping to prevent infinite resource generation.

**Energy Mechanics:**
- Each tap consumes energy
- Energy regenerates over time
- Players can upgrade boosters to improve energy management

**Energy Properties:**
- **Current Energy:** Real-time energy available (0 to max)
- **Max Energy:** Determined by `energyCapacity` booster level
- **Energy Cost per Tap:** Determined by `energyPerTap` booster level
- **Recovery Rate:** Determined by `recoveryRate` booster level (energy/second)

**Energy Flow:**
```
Tap → Consumes energyPerTap → Energy decreases
Time passes → Recovers at recoveryRate/sec → Energy increases (up to max)
```

### 7.2 Booster System

**Four Boosters:**
1. **incomePerTap** - Increases BZ earned per tap
2. **energyPerTap** - Increases energy cost per tap (higher = more energy needed)
3. **energyCapacity** - Increases maximum energy storage
4. **recoveryRate** - Increases energy regeneration speed

**Booster Level System:**
- Each booster starts at Level 1
- Can be upgraded to Level 10+ (no hard cap)
- Higher levels cost exponentially more

**Booster Cost Formula:**
```
Cost (BZ) = baseCost × (1 + level)² + 1.2 × bzPerHour
```

Where:
- `baseCost` = booster-specific base cost (varies per booster)
- `level` = current level
- `bzPerHour` = player's total passive income rate

**Example:**
```
Player has 500 BZ/hour passive income
Upgrading incomePerTap from Level 5 → Level 6
Assume baseCost = 10,000 BZ

Cost = 10,000 × (1 + 5)² + 1.2 × 500
Cost = 10,000 × 36 + 600
Cost = 360,600 BZ
```

**Why Include bzPerHour in Cost?**
- Scales booster costs with player progression
- Prevents early-game players from over-upgrading
- Creates strategic decisions (build vs boost)

### 7.3 Booster Unlock Requirements

**Level Gates:**
- **Level 1-2:** Always unlocked (no requirements)
- **Level 3:** Requires Silver tier (10K XP) + 3 referrals
- **Level 4-5:** Requires Gold tier (50K XP) + 5 referrals
- **Level 6+:** Requires Platinum tier (150K XP) + 7 referrals

**Validation:**
- System checks tier AND referral count
- Both conditions must be met
- If not met, upgrade button shows "Locked" with requirements

**Purpose:**
- Encourages social engagement (referrals)
- Ties booster progression to overall game progression
- Creates natural pacing

### 7.4 Booster Strategy

**incomePerTap:**
- Directly increases BZ per tap
- Most impactful for active players
- Synergizes with tier bonuses

**energyPerTap:**
- Counter-intuitive: Higher level = worse (more energy per tap)
- Only upgrade if you have excess energy capacity/recovery
- Advanced strategy: Keep low, upgrade capacity/recovery instead

**energyCapacity:**
- Allows longer tapping sessions
- Good for players who tap in bursts
- Synergizes with high recovery rate

**recoveryRate:**
- Enables frequent tapping
- Best for active players
- Diminishing returns at very high levels

**Optimal Strategy (General):**
1. Balance `incomePerTap` with `energyCapacity` early game
2. Upgrade `recoveryRate` once capacity is sufficient
3. Avoid upgrading `energyPerTap` unless energy is abundant
4. Focus on whichever booster is cheapest relative to benefit

---

## 8. Task System

### 8.1 Task Overview

Tasks are objectives players complete for rewards (BZ, BB, or XP). Four task types exist:

1. **Social Tasks** - External actions (follow channels, join groups)
2. **Achievement Tasks** - In-game milestones (reach X taps, earn X BZ)
3. **Daily Tasks** - Reset every 24 hours
4. **Weekly Tasks** - Reset every 7 days

### 8.2 Task Properties

Each task has:
- **ID** (unique identifier)
- **Title** (display name)
- **Description** (what to do)
- **Type** (social, achievement, daily, weekly)
- **Target** (numeric goal)
- **Current Progress** (player's progress toward target)
- **Reward Type** (BZ, BB, or XP)
- **Reward Amount** (how much player receives)
- **Completed** (boolean, true when progress ≥ target)
- **Claimed** (boolean, true after player claims reward)

### 8.3 Task Examples

**Daily Tasks:**
```
1. Daily Check-in
   - Description: "Log in to the game today"
   - Target: 1
   - Progress: Auto-sets to 1 on first login of the day
   - Reward: 1,000 XP

2. Tap 100 Times
   - Description: "Tap the bunny 100 times in a day"
   - Target: 100
   - Progress: Tracks today's tap count
   - Reward: 5,000 BZ

3. Claim Idle Income
   - Description: "Collect income from your build"
   - Target: 1
   - Progress: 0 or 1 (has claimed today or not)
   - Reward: 1,000 XP
```

**Weekly Tasks:**
```
1. Upgrade 10 Parts
   - Description: "Perform 10 upgrades in Build screen"
   - Target: 10
   - Progress: Tracks upgrades this week only
   - Reward: 2,000 XP

2. Convert 500K BZ
   - Description: "Convert BZ to BB tokens"
   - Target: 500,000
   - Progress: Tracks total BZ converted this week
   - Reward: 2,000 XP

3. Invite 3 Friends
   - Description: "Get 3 new referrals"
   - Target: 3
   - Progress: Tracks referrals gained this week
   - Reward: 2,000 XP
```

**Progressive/Achievement Tasks:**
```
1. Master Tapper
   - Description: "Reach 10,000 lifetime taps"
   - Target: 10,000
   - Progress: Total taps ever
   - Reward: 1.0 BB

2. Network Master
   - Description: "Reach 25 total referrals"
   - Target: 25
   - Progress: Total referrals ever
   - Reward: 5.0 BB
```

### 8.4 Task States & Transitions

**State Flow:**
```
LOCKED → ACTIVE → COMPLETED → CLAIMED
```

1. **LOCKED:** Not yet available (future feature, tier-gated, etc.)
2. **ACTIVE:** Available to work on (progress < target)
3. **COMPLETED:** Goal met (progress ≥ target), can claim
4. **CLAIMED:** Reward received, task marked done

### 8.5 Task Progress Tracking

**Automatic Tracking:**
- Most tasks track progress automatically
- Examples: Tap count, upgrade count, conversion totals
- No manual input required

**Manual Verification (Social Tasks):**
- Social tasks use "honor system"
- Player clicks "Verify" → External action (opens Telegram channel)
- Player returns → Marks task as complete
- No server-side verification (trust-based)

**Baseline System (Weekly Tasks):**
- **Problem:** Weekly tasks need to track "progress this week" but player stats are lifetime totals
- **Solution:** Store a "baseline" value at week start
- **Formula:** `Weekly Progress = MAX(0, Current Total - Baseline)`

**Example:**
```
Monday (Week Start):
- Player has 100 lifetime upgrades
- Baseline stored: 100
- Weekly progress: 0

Wednesday:
- Player has 107 lifetime upgrades
- Weekly progress: MAX(0, 107 - 100) = 7

Next Monday (Reset):
- New baseline: 107
- Weekly progress: 0 (reset)
```

### 8.6 Task Reset Logic

**Daily Tasks:**
- Reset at **00:00 UTC** every day
- Progress set to 0
- Claimed set to false
- Completed recalculated based on new progress

**Weekly Tasks:**
- Reset every **Monday at 00:00 UTC**
- Baseline updated to current lifetime totals
- Progress set to 0
- Claimed set to false

**Reset Timing Detection:**
```
If (currentDate - lastResetDate) ≥ resetPeriod:
  - Update baselines
  - Reset progress/claimed flags
  - Update lastResetDate
```

### 8.7 Task Claiming Flow

1. **Player completes task** (progress ≥ target)
2. **Task shows "Claim Reward" button**
3. **Player clicks button**
4. **System validates:**
   - Task is completed
   - Task not already claimed
   - Player exists
5. **System awards reward:**
   - Add BZ/BB/XP to player balance
   - Mark task as claimed
   - Sync to database
6. **UI updates:**
   - Button changes to "Claimed"
   - Checkmark icon appears
   - Task grayed out (if one-time)

---

## 9. Weekly Challenge System

### 9.1 Challenge Overview

Weekly Challenges are special competitive objectives that reset every Monday. Three challenges run simultaneously:

1. **Master Builder** (Upgrade-focused)
2. **Top Recruiter** (Referral-focused)
3. **Exchange Guru** (Conversion-focused)

**Key Difference from Tasks:**
- Challenges are **always active** (no unlock conditions)
- Challenges track **this week's activity only** (not lifetime)
- Rewards are **more valuable** than regular tasks
- Use a **baseline system** to calculate weekly progress

### 9.2 Challenge Definitions

**Master Builder:**
```
- Description: "Perform 50 upgrades this week"
- Target: 50 upgrades
- Progress Tracked: Build part upgrades (any stage, any level)
- Reward: 10,000 BZ
- Icon: Hammer
```

**Top Recruiter:**
```
- Description: "Invite 5 friends this week"
- Target: 5 new referrals
- Progress Tracked: Referrals gained since Monday
- Reward: 0.005 BB
- Icon: Users
```

**Exchange Guru:**
```
- Description: "Convert 10 times this week"
- Target: 10 conversion events
- Progress Tracked: Number of BZ→BB or BB→BZ conversions
- Reward: 5,000 XP
- Icon: ArrowLeftRight
```

### 9.3 Baseline System (CRITICAL)

**The Problem:**
- Player stats are **lifetime totals** (e.g., 1,000 total upgrades)
- Challenges need **this week's activity only**
- How do you calculate "upgrades this week" from "total upgrades"?

**The Solution: Baseline System**

**Baseline Definition:**
- A stored value representing the player's stat at the **start of the week**
- Used to calculate weekly progress

**Formula:**
```
Weekly Progress = MAX(0, Current Total - Baseline)
```

**Example Walkthrough:**

```
=== Monday (Week Start) ===
Player Lifetime Stats:
- totalUpgrades: 200
- referralCount: 10
- totalConversions: 50

System Creates Baselines:
- upgradeBaseline: 200
- referralBaseline: 10
- conversionBaseline: 50

Challenge Progress (All 0):
- Master Builder: MAX(0, 200 - 200) = 0 / 50
- Top Recruiter: MAX(0, 10 - 10) = 0 / 5
- Exchange Guru: MAX(0, 50 - 50) = 0 / 10

=== Wednesday (Mid-Week) ===
Player Lifetime Stats:
- totalUpgrades: 215 (+15 this week)
- referralCount: 12 (+2 this week)
- totalConversions: 53 (+3 this week)

Baselines Unchanged:
- upgradeBaseline: 200
- referralBaseline: 10
- conversionBaseline: 50

Challenge Progress:
- Master Builder: MAX(0, 215 - 200) = 15 / 50
- Top Recruiter: MAX(0, 12 - 10) = 2 / 5
- Exchange Guru: MAX(0, 53 - 50) = 3 / 10

=== Next Monday (Reset) ===
System Detects Week Change:
- Store new baselines:
  - upgradeBaseline: 215
  - referralBaseline: 12
  - conversionBaseline: 53
- Reset claimed flags to false
- Recalculate progress (now 0 for all)
```

**Why MAX(0, ...)?**
- Prevents negative progress if baseline somehow becomes larger than current
- Handles edge cases (data corruption, manual adjustments)
- Ensures progress is always ≥ 0

### 9.4 Challenge Update Triggers

Challenges update in real-time when:
- **Player performs relevant action** (upgrade, convert, referral joins)
- **System recalculates progress** using formula
- **UI refreshes** to show new progress bar percentage

**Example (Master Builder):**
```
1. Player upgrades Stage 2 Part 3
2. totalUpgrades increments: 215 → 216
3. System recalculates: MAX(0, 216 - 200) = 16
4. UI updates: Progress bar shows 16/50 (32%)
```

### 9.5 Challenge Claiming

**Claiming Requirements:**
- Progress ≥ Target
- Not already claimed this week

**Claiming Flow:**
1. Player completes challenge (e.g., 50 upgrades)
2. "Claim Reward" button appears
3. Player clicks button
4. System validates completion
5. System awards reward (BZ/BB/XP added to balance)
6. System marks challenge as claimed
7. Challenge remains "completed" until reset
8. Next Monday: Reset to 0, unclaimed

**Multiple Claims:**
- Cannot claim same challenge twice in one week
- Can claim multiple different challenges in one week
- Can claim same challenge every week if completed

### 9.6 Weekly Reset Logic

**Reset Timing:**
- Every **Monday at 00:00 UTC**
- Automated check on app load and periodic intervals

**Reset Process:**
```
1. Detect reset needed:
   - Calculate days since last reset
   - If ≥ 7 days, trigger reset

2. Update baselines:
   - upgradeBaseline = currentTotalUpgrades
   - referralBaseline = currentReferralCount
   - conversionBaseline = currentTotalConversions

3. Reset challenge state:
   - claimed = false (all challenges)
   - completed = false (all challenges)
   - progress = 0 (all challenges, will recalculate)

4. Update tracking:
   - lastResetDate = today
   - weekNumber = calculated from year

5. Sync to database:
   - Store new baselines
   - Store reset date
```

**Edge Cases:**
- **Player offline >7 days:** System backfills baselines to current values (assumes no activity)
- **Week change during session:** System detects and resets mid-session
- **Multiple resets needed:** System can skip weeks if player absent (updates baseline to current)

### 9.7 Challenge Storage

**Database Table: `user_weekly_challenges`**
- Stores one row per player per challenge per week
- Tracks baseline, progress, completed, claimed
- Indexed by `(telegram_id, challenge_key, year, week_number)`

**localStorage Backup:**
- Also stored in localStorage for instant UI updates
- Synced to database in background
- Database is source of truth on conflicts

---

## 10. Daily Rewards System

### 10.1 Daily Reward Overview

Players can claim one reward per day by logging in. Rewards increase each day of the week (Day 1-7), then reset to Day 1 on week 8.

**Reward Scaling:**
- Rewards scale with the **reward week number**
- Week 1 rewards are base amounts
- Week 2+ rewards multiply base by week number

### 10.2 Daily Reward Schedule

**Week 1 Base Rewards:**

| Day | Reward Type | Base Amount |
|-----|-------------|-------------|
| Day 1 | XP | 2,000 |
| Day 2 | BZ | 5,000 |
| Day 3 | XP | 3,000 |
| Day 4 | BZ | 8,000 |
| Day 5 | XP | 5,000 |
| Day 6 | BB | 0.001 |
| Day 7 | BZ | 15,000 |

**Scaling Formula:**
```
Actual Reward = Base Amount × Reward Week Number
```

**Example (Week 3):**
- Day 1: 2,000 × 3 = 6,000 XP
- Day 2: 5,000 × 3 = 15,000 BZ
- Day 6: 0.001 × 3 = 0.003 BB
- Day 7: 15,000 × 3 = 45,000 BZ

### 10.3 Streak System

**Streak Tracking:**
- **Daily Streak:** Number of consecutive days claimed
- Streak increments when player claims today's reward
- Streak resets to 0 if player misses a day

**Current Day Calculation:**
```
Current Day = (Daily Streak % 7) + 1

Examples:
- Streak 0 → Day 1
- Streak 3 → Day 4
- Streak 6 → Day 7
- Streak 7 → Day 1 (reset to week start)
- Streak 14 → Day 1
```

**Reward Week Calculation:**
```
Reward Week = FLOOR(Daily Streak ÷ 7) + 1

Examples:
- Streak 0-6 → Week 1
- Streak 7-13 → Week 2
- Streak 14-20 → Week 3
```

### 10.4 Claiming Flow

**Validation:**
1. Check if player already claimed today (compare dates)
2. If claimed today → show "Come back tomorrow"
3. If not claimed → allow claim

**Claim Process:**
1. Player clicks "Claim" button
2. System awards today's reward
3. System increments daily streak
4. System records claim date
5. System syncs to database
6. UI updates to show next day's reward

**Example Session:**
```
Monday (Streak 0):
- Shows Day 1 reward: 2,000 XP (Week 1)
- Player claims → Streak becomes 1
- UI now shows Day 2 reward preview

Tuesday (Streak 1):
- Shows Day 2 reward: 5,000 BZ (Week 1)
- Player claims → Streak becomes 2

[Player misses Wednesday]

Thursday (Streak 2, but missed a day):
- System detects gap
- Streak resets to 0
- Shows Day 1 reward: 2,000 XP (Week 1)
```

### 10.5 Reset & Recovery

**Missed Day Handling:**
- No partial credit for missed days
- Streak resets to 0
- Player starts over at Day 1, Week 1

**Timezone Considerations:**
- All resets at **00:00 UTC**
- Player's local time doesn't affect reset
- Date comparison uses UTC timestamps

---

## 11. Referral System

### 11.1 Referral Overview

Players can invite friends to join BunBun and earn rewards from their friends' gameplay. The referral system provides:
1. **One-time signup bonuses** (for both referrer and referee)
2. **Lifetime 20% share** of referrals' earnings
3. **Milestone bonuses** for reaching referral count targets

### 11.2 Referral Link Generation

**Link Format:**
```
https://t.me/bunergy_bot/BunBun?startapp={REFERRAL_CODE}
```

**Referral Code Generation:**
- Derived from Telegram User ID
- 8-character alphanumeric code
- Uses charset: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" (no 0, O, 1, I to avoid confusion)

**Algorithm:**
```
function generateCode(telegramUserId):
  chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  hash = telegramUserId
  code = ""
  
  for i = 0 to 7:
    code += chars[hash % chars.length]
    hash = floor(hash / chars.length)
  
  return code
```

**Properties:**
- Deterministic (same user ID → same code always)
- Reversible (code → user ID)
- Short and shareable

### 11.3 Referral Flow

**Step 1: Referrer Shares Link**
```
1. Referrer opens "Referrals" tab
2. System generates referral code from their Telegram ID
3. Referrer copies link or shares via Telegram
```

**Step 2: Referee Joins**
```
1. Referee clicks referral link
2. Opens BunBun TMA with ?startapp={CODE} parameter
3. System decodes CODE → referrer's Telegram ID
4. System creates profiles for both (if new)
5. System links referee to referrer in database
```

**Step 3: Validation**
```
System checks:
- Referee is new user (not already registered)
- Referee is not the referrer (can't refer yourself)
- Referral link is valid (code decodes to valid user ID)

If valid:
  - Create referral record
  - Award signup bonuses
  - Enable earnings sharing
```

**Step 4: Ongoing Earnings**
```
Every time referee earns BZ (tap or idle):
  1. Calculate 20% of earnings
  2. Add to referrer's pending earnings
  3. Referrer can claim accumulated earnings anytime
```

### 11.4 Referral Rewards

**Signup Bonuses (One-Time):**

| Recipient | Reward |
|-----------|--------|
| **Referrer** (Inviter) | +2,500 XP, +1,000 BZ |
| **Referee** (New Player) | +1,000 XP, +500 BZ |

**Lifetime Earnings Share:**
- **Referrer earns:** 20% of referee's tap income + idle income
- **Tracked as:** Pending earnings (must be claimed)
- **No time limit:** Lasts forever, as long as referee plays

**Example:**
```
Referee earns 10,000 BZ from tapping:
- Referee keeps: 10,000 BZ
- Referrer earns: 10,000 × 0.20 = 2,000 BZ (pending)

Referee claims 50,000 BZ idle income:
- Referee keeps: 50,000 BZ
- Referrer earns: 50,000 × 0.20 = 10,000 BZ (pending)

Referrer's total pending: 2,000 + 10,000 = 12,000 BZ
Referrer clicks "Claim" → Receives 12,000 BZ
```

**Baseline System for Earnings:**
- System tracks referee's baseline (total earnings at last claim)
- On claim: Award referrer 20% of (current total - baseline)
- Update baseline to current total
- Prevents double-counting earnings

### 11.5 Referral Milestones

**Milestone Rewards:**

| Referrals | XP Reward |
|-----------|-----------|
| 5 | 5,000 XP |
| 10 | 15,000 XP |
| 25 | 50,000 XP |
| 50 | 150,000 XP |

**Claiming:**
- Automatically available when milestone reached
- One-time claim per milestone
- Cannot claim same milestone twice
- Independent of weekly challenges (separate system)

### 11.6 Referral Stats Display

**Referrer Sees:**
- Total referrals (count)
- Pending earnings (BZ not yet claimed)
- Total claimed (lifetime BZ claimed from referrals)
- List of referrals with individual earnings

**Referee Sees:**
- Their referrer's name/ID (if applicable)
- Confirmation they joined via referral link

### 11.7 Referral Validation Rules

**Cannot Refer:**
- Self (own Telegram ID)
- Users already registered
- Users who already have a referrer

**Anti-Abuse:**
- One referrer per user (permanent, cannot change)
- Referral link must be used during signup (cannot retroactively add referrer)
- System logs referral timestamp for audit

---

## 12. NFT Collection System

### 12.1 NFT Overview

NFTs (Non-Fungible Tokens) are digital collectibles players can unlock and purchase. Each NFT has:
- **Unique artwork/design**
- **Unlock requirement** (achievement-based)
- **Purchase price** (in BB)
- **Potential future utility** (boosts, badges)

### 12.2 NFT Collection

**7 NFTs Total:**

| NFT | Price (BB) | Requirement | Requirement Type |
|-----|------------|-------------|------------------|
| **Early Adopter** | 0 (Free) | Always unlocked | None |
| **Social King** | 2.0 | 20 referrals | Referral count |
| **Builder Pro** | 2.0 | Complete Stage 2 (10 parts at L5+) | Build progress |
| **Tap Legend** | 4.0 | Earn 10M BZ from tapping | Tap income |
| **Energy Master** | 3.0 | Max all energy boosters (L10+) | Booster levels |
| **Golden Bunny** | 5.0 | 5M total taps | Tap count |
| **Diamond Crystal** | 7.0 | 500K+ XP | XP total |

### 12.3 NFT States

**Three States:**

1. **Locked** 🔒
   - Requirement not met
   - Shows requirement and progress
   - Cannot purchase

2. **Unlocked** 🔓
   - Requirement met
   - Can purchase with BB
   - Shows "Purchase" button

3. **Owned** ✅
   - Already purchased
   - Shows "Owned" badge
   - Cannot purchase again

### 12.4 Unlock Requirements Explained

**Referral-Based (Social King):**
```
Check: referralCount ≥ 20
Progress: "X / 20 referrals"
```

**Build-Based (Builder Pro):**
```
Check: Count Stage 2 parts at Level 5+
Progress: "X / 10 parts at L5+"
Requirement: 10 parts must be Level 5 or higher
```

**Income-Based (Tap Legend):**
```
Check: totalTapIncome ≥ 10,000,000
Progress: "X.XM / 10M BZ"
Note: totalTapIncome = sum of all BZ earned from tapping (not current balance)
```

**Booster-Based (Energy Master):**
```
Check: All 4 boosters at Level 10+
Progress: "X / 4 boosters maxed"
Requirement: incomePerTap, energyPerTap, energyCapacity, recoveryRate all ≥ L10
```

**Tap Count-Based (Golden Bunny):**
```
Check: totalTaps ≥ 5,000,000
Progress: "X.XM / 5M taps"
```

**XP-Based (Diamond Crystal):**
```
Check: xp ≥ 500,000
Progress: "XXXk / 500k XP"
```

### 12.5 Purchase Flow

**Prerequisites:**
1. NFT is unlocked (requirement met)
2. NFT not already owned
3. Player has sufficient BB balance

**Purchase Steps:**
1. Player clicks "Purchase" button
2. System validates prerequisites
3. System deducts BB from player balance
4. System marks NFT as owned
5. System syncs to database
6. UI updates to show "Owned" state

**Example:**
```
Player wants to buy "Tap Legend" (4.0 BB):
- Check requirement: totalTapIncome = 12M ≥ 10M ✓
- Check balance: bb = 5.5 ≥ 4.0 ✓
- Check owned: owned = false ✓
- Deduct: 5.5 - 4.0 = 1.5 BB remaining
- Mark owned: ownedNFTs.push("NFT_TAPPER")
- Sync to DB
```

### 12.6 NFT Display

**NFT Card Shows:**
- NFT name
- NFT icon/artwork
- Description
- Requirement status (locked/unlocked)
- Progress bar (if applicable)
- Price (BB)
- Purchase/Owned status

**Progress Bars:**
- Social King: Linear (0% to 100% based on 0-20 referrals)
- Tap Legend: Linear (0% to 100% based on 0-10M BZ income)
- Golden Bunny: Linear (0% to 100% based on 0-5M taps)
- Diamond Crystal: Linear (0% to 100% based on 0-500K XP)
- Builder Pro: Binary (0% or 100%, no partial progress shown)
- Energy Master: Binary (0% or 100%, no partial progress shown)

### 12.7 Future Utility (Planned)

**Potential NFT Benefits:**
- **Passive boosts:** +X% to specific stats
- **Visual upgrades:** Custom bunny skins, animations
- **Exclusive access:** Special tasks, events, early features
- **Status symbols:** Leaderboard badges, profile flair
- **Trading:** Player-to-player NFT marketplace

*Note: These are planned features, not currently implemented.*

---

## 13. Data Architecture

### 13.1 Why Hybrid Architecture?

BunBun uses a **hybrid data storage model** combining:
1. **localStorage** (client-side, instant access)
2. **Supabase** (server-side, persistent database)

**Why Both?**

**localStorage Benefits:**
- ⚡ Instant read/write (no network latency)
- 🔄 Immediate UI updates
- 📱 Works offline
- 🎮 Smooth gameplay experience

**localStorage Limitations:**
- 🚫 Cleared if user changes devices
- 🚫 Cleared if user clears browser data
- 🚫 No cross-device sync
- 🚫 Limited capacity (~5-10 MB)

**Supabase Benefits:**
- ☁️ Persistent across devices
- 🔐 Secure and backed up
- 🔄 Multi-device sync
- 📊 Server-side analytics
- 🛡️ Data recovery possible

**Supabase Limitations:**
- 🐌 Network latency (200-500ms per request)
- 📶 Requires internet connection
- 💰 API rate limits

**Hybrid Solution:**
- Use **localStorage for runtime state** (fast gameplay)
- Use **Supabase as source of truth** (data persistence)
- **Sync periodically** in background (best of both worlds)

### 13.2 Data Location Map

**What Goes Where:**

| Data Type | localStorage | Supabase | Sync Strategy |
|-----------|--------------|----------|---------------|
| **User Profile** | ✅ Cache | ✅ Primary | On login, on change |
| **Balances (BZ/BB/XP)** | ✅ Runtime | ✅ Backup | Every 30s, on major change |
| **Tier** | ✅ Calculated | ✅ Stored | On XP change |
| **Build Parts** | ✅ State | ✅ State | On purchase, on completion |
| **Boosters** | ✅ Levels | ✅ Levels | On upgrade |
| **Tasks** | ✅ Progress | ✅ Progress | On completion, on claim |
| **Weekly Challenges** | ✅ Progress | ✅ Progress | Real-time, on claim |
| **Daily Rewards** | ✅ Streak | ✅ Streak | On claim |
| **Referrals** | ❌ No | ✅ Only | On signup, on earnings |
| **NFTs** | ✅ Owned list | ✅ Owned list | On purchase |
| **Conversion History** | ✅ Recent | ✅ All | On conversion |
| **Statistics** | ✅ Counters | ✅ Counters | Periodic (30s) |

### 13.3 Database Schema

**Complete Supabase Tables:**

#### **Table: profiles**
```
Stores user identity and core stats

Columns:
- id: UUID (primary key, Supabase auth user ID)
- telegram_id: BIGINT (unique, Telegram user ID)
- username: TEXT (Telegram username)
- first_name: TEXT (Telegram first name)
- last_name: TEXT (Telegram last name)
- photo_url: TEXT (Telegram profile photo)
- bz: BIGINT (BunnyZap balance)
- bb: DECIMAL(20,6) (BunnyBucks balance, 6 decimals)
- xp: BIGINT (Experience points)
- tier: TEXT (Bronze/Silver/Gold/Platinum/Diamond)
- total_taps: BIGINT (lifetime tap count)
- total_tap_income: BIGINT (lifetime BZ from tapping)
- total_idle_income: BIGINT (lifetime BZ from idle)
- total_upgrades: INTEGER (lifetime upgrade count)
- total_conversions: BIGINT (lifetime BZ converted)
- daily_streak: INTEGER (consecutive daily login days)
- current_reward_week: INTEGER (for daily reward scaling)
- last_daily_claim_date: DATE (last daily reward claim)
- last_idle_claim: TIMESTAMPTZ (last idle income claim)
- referral_code: TEXT (8-char referral code)
- referred_by: UUID (referrer's profile ID, foreign key)
- referral_count: INTEGER (total referrals)
- created_at: TIMESTAMPTZ (account creation)
- updated_at: TIMESTAMPTZ (last update)

Indexes:
- telegram_id (unique, for fast lookups)
- referral_code (for referral link validation)
- referred_by (for referral queries)

RLS: Enabled
- Users can read/update own profile only
```

#### **Table: build_parts**
```
Stores player's build part ownership and levels

Columns:
- id: UUID (primary key)
- user_id: UUID (foreign key → profiles.id)
- telegram_id: BIGINT (foreign key → profiles.telegram_id)
- part_id: TEXT (e.g., "s1p1", "s2p5")
- stage: INTEGER (1-5)
- part_number: INTEGER (1-10)
- level: INTEGER (current level, 0 = not owned)
- cost: BIGINT (BZ cost for next upgrade)
- yield: BIGINT (BZ/hour passive income)
- building_until: TIMESTAMPTZ (null if not building, timestamp if building)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

Unique Constraint: (telegram_id, part_id)

RLS: Enabled
- Users can only see/modify their own parts
```

#### **Table: boosters**
```
Stores player's booster levels

Columns:
- id: UUID (primary key)
- user_id: UUID (foreign key → profiles.id)
- telegram_id: BIGINT (foreign key → profiles.telegram_id)
- income_per_tap: INTEGER (level, default 1)
- energy_per_tap: INTEGER (level, default 1)
- energy_capacity: INTEGER (level, default 1)
- recovery_rate: INTEGER (level, default 1)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

Unique Constraint: telegram_id (one row per user)

RLS: Enabled
```

#### **Table: tasks**
```
Defines available tasks (admin-managed)

Columns:
- id: UUID (primary key)
- task_id: TEXT (unique, e.g., "daily_check_in")
- title: TEXT (display name)
- description: TEXT
- task_type: TEXT (social/achievement/daily/weekly)
- target: INTEGER (goal value)
- reward_type: TEXT (BZ/BB/XP)
- reward_amount: INTEGER or DECIMAL
- is_active: BOOLEAN (whether task is available)
- created_at: TIMESTAMPTZ

Note: This is a reference table, not user-specific
```

#### **Table: user_tasks**
```
Stores player's task progress

Columns:
- id: UUID (primary key)
- user_id: UUID (foreign key → profiles.id)
- telegram_id: BIGINT (foreign key → profiles.telegram_id)
- task_id: TEXT (foreign key → tasks.task_id)
- current_progress: INTEGER (player's progress)
- baseline_value: INTEGER (for weekly tasks, starting value)
- completed: BOOLEAN (progress ≥ target)
- claimed: BOOLEAN (reward received)
- reset_at: DATE (for daily/weekly reset tracking)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

Unique Constraint: (telegram_id, task_id, reset_at)

RLS: Enabled
```

#### **Table: user_weekly_challenges**
```
Stores player's weekly challenge progress

Columns:
- id: UUID (primary key)
- user_id: UUID (foreign key → profiles.id)
- telegram_id: BIGINT (foreign key → profiles.telegram_id)
- challenge_key: TEXT (builder/recruiter/converter)
- baseline_value: INTEGER (stat value at week start)
- current_progress: INTEGER (progress this week)
- target_value: INTEGER (goal)
- completed: BOOLEAN (progress ≥ target)
- claimed: BOOLEAN (reward received)
- week_start_date: DATE (Monday of this week)
- year: INTEGER (for historical tracking)
- week_number: INTEGER (1-52)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

Unique Constraint: (telegram_id, challenge_key, year, week_number)

RLS: Enabled
```

#### **Table: referrals**
```
Stores referral relationships

Columns:
- id: UUID (primary key)
- inviter_id: UUID (referrer's profile ID)
- inviter_telegram_id: BIGINT
- invitee_id: UUID (referee's profile ID)
- invitee_telegram_id: BIGINT
- invited_at: TIMESTAMPTZ (signup timestamp)
- signup_bonus_claimed: BOOLEAN (one-time bonus claimed)
- lifetime_earnings_baseline: BIGINT (for 20% share calculation)
- total_earned: BIGINT (cumulative BZ earned for inviter)
- created_at: TIMESTAMPTZ

Unique Constraint: invitee_telegram_id (one referrer per user)
Indexes: inviter_telegram_id (for stats queries)

RLS: Enabled
```

#### **Table: nfts**
```
Defines available NFTs (admin-managed)

Columns:
- id: UUID (primary key)
- nft_id: TEXT (unique, e.g., "NFT_EARLY")
- name: TEXT (display name)
- description: TEXT
- icon: TEXT (icon name)
- price_bb: DECIMAL(20,6) (purchase price)
- requirement_type: TEXT (referral/build/tap/xp/booster)
- requirement_value: INTEGER (threshold)
- is_active: BOOLEAN
- created_at: TIMESTAMPTZ
```

#### **Table: user_nfts**
```
Stores player's NFT ownership

Columns:
- id: UUID (primary key)
- user_id: UUID (foreign key → profiles.id)
- telegram_id: BIGINT (foreign key → profiles.telegram_id)
- nft_id: TEXT (foreign key → nfts.nft_id)
- purchased_at: TIMESTAMPTZ
- purchase_price: DECIMAL(20,6) (historical price)
- created_at: TIMESTAMPTZ

Unique Constraint: (telegram_id, nft_id)

RLS: Enabled
```

#### **Table: conversion_history**
```
Stores BZ↔BB conversion transactions

Columns:
- id: UUID (primary key)
- user_id: UUID (foreign key → profiles.id)
- telegram_id: BIGINT (foreign key → profiles.telegram_id)
- transaction_id: TEXT (unique, client-generated)
- conversion_type: TEXT (bz-to-bb or bb-to-bz)
- input_amount: BIGINT or DECIMAL (BZ or BB spent)
- output_amount: DECIMAL or BIGINT (BB or BZ received)
- bonus_amount: DECIMAL (tier bonus, if applicable)
- tier: TEXT (player's tier at conversion time)
- conversion_rate: DECIMAL (for historical tracking)
- created_at: TIMESTAMPTZ

Indexes: telegram_id, created_at (for history queries)

RLS: Enabled
```

### 13.4 Row Level Security (RLS)

**What is RLS?**
- Security feature that filters database rows by user
- Prevents users from seeing/modifying others' data
- Enforced at database level (cannot be bypassed)

**BunBun RLS Rules:**
```
For all user-specific tables:
  SELECT: WHERE telegram_id = current_user_telegram_id
  INSERT: WITH CHECK (telegram_id = current_user_telegram_id)
  UPDATE: WHERE telegram_id = current_user_telegram_id
  DELETE: WHERE telegram_id = current_user_telegram_id

For reference tables (tasks, nfts):
  SELECT: All users can read
  INSERT/UPDATE/DELETE: Admin only
```

**How It Works:**
1. User authenticates via Telegram
2. System retrieves user's telegram_id
3. All queries automatically filtered by RLS
4. User can only access their own data

---

## 14. Sync Strategy

### 14.1 Sync Philosophy

**Core Principle: Math.max() for Progress**

When merging data from localStorage and Supabase:
- **Always keep the higher value** for progress metrics
- Assumes progress only moves forward (never backward)
- Prevents data loss from out-of-sync states

**Formula:**
```
finalValue = Math.max(localStorageValue, supabaseValue)
```

**Why This Works:**
- If device A is ahead, use device A's value
- If database is ahead, use database's value
- Handles device switches gracefully
- Resolves most conflicts automatically

### 14.2 Sync Flow

**Three Phases:**

**Phase 1: Load (App Start)**
```
1. Read localStorage (instant)
2. Display UI with localStorage data
3. Fetch from Supabase in background
4. Merge Supabase data using Math.max()
5. Update UI if Supabase had higher values
6. Save merged state back to localStorage
```

**Phase 2: Runtime (During Gameplay)**
```
1. All changes write to localStorage first (instant)
2. UI updates immediately
3. Queue sync to Supabase in background
4. Debounce sync (wait for burst of changes to finish)
5. Send bulk update to Supabase
6. Handle errors (retry with exponential backoff)
```

**Phase 3: Background Sync (Periodic)**
```
Every 30 seconds:
1. Check if local state differs from last sync
2. If changed, send update to Supabase
3. On success, update "last synced" timestamp
4. On failure, queue for retry
```

### 14.3 Merge Logic Examples

**Example 1: Balances**
```
localStorage: { bz: 50000, bb: 2.5, xp: 25000 }
Supabase: { bz: 45000, bb: 3.0, xp: 30000 }

Merged:
bz = Math.max(50000, 45000) = 50000 (local wins)
bb = Math.max(2.5, 3.0) = 3.0 (database wins)
xp = Math.max(25000, 30000) = 30000 (database wins)

Result: { bz: 50000, bb: 3.0, xp: 30000 }
```

**Example 2: Build Parts (Array)**
```
localStorage: [
  { part_id: "s1p1", level: 5 },
  { part_id: "s1p2", level: 3 }
]

Supabase: [
  { part_id: "s1p1", level: 4 },
  { part_id: "s1p3", level: 2 }
]

Merge Process:
1. Create map by part_id
2. For each part, use Math.max(level)
3. Union all parts

Merged: [
  { part_id: "s1p1", level: Math.max(5,4) = 5 },
  { part_id: "s1p2", level: 3 }, // only in local
  { part_id: "s1p3", level: 2 }  // only in database
]
```

**Example 3: Tasks**
```
localStorage task "daily_tap_100":
  progress: 75, completed: false, claimed: false

Supabase same task:
  progress: 50, completed: false, claimed: false

Merged:
  progress: Math.max(75, 50) = 75
  completed: 75 ≥ 100 = false
  claimed: false (both same)

Result: Use local progress (higher)
```

**Example 4: Claimed Flags**
```
localStorage: daily_reward claimed: true
Supabase: daily_reward claimed: false

Merged: claimed = true (local wins)

Logic: If claimed locally, assume it happened recently
       Supabase may not have synced yet
       Safe to trust local "true" value
```

### 14.4 Conflict Resolution

**Scenario 1: Device Switch (Common)**
```
Device A (Phone):
  - Player plays, earns 10K BZ
  - localStorage: bz = 60K
  - Synced to Supabase: bz = 60K

Device B (Tablet):
  - Player switches devices
  - localStorage: bz = 50K (old data)
  - Loads from Supabase: bz = 60K
  - Math.max(50K, 60K) = 60K ✓ Correct!
```

**Scenario 2: Offline Play**
```
Player goes offline:
  - Plays for 1 hour, earns 20K BZ
  - localStorage: bz = 70K
  - Supabase: bz = 50K (not synced)

Player reconnects:
  - Sync detects difference
  - Uploads local state (70K) to Supabase
  - Math.max(70K, 50K) = 70K ✓ Progress kept!
```

**Scenario 3: Simultaneous Edits (Rare)**
```
Device A: Player taps, earns 5K BZ → bz = 55K
Device B: Player claims idle, earns 10K BZ → bz = 60K

Both devices offline, then sync:
  - A uploads: bz = 55K
  - B uploads: bz = 60K
  - Database has 60K (last write wins)
  - A re-fetches: Math.max(55K, 60K) = 60K
  - A's local 5K taps are lost ✗

Mitigation: Very rare (requires simultaneous play on 2 devices)
            Acceptable loss for simplicity
```

### 14.5 Performance Optimizations

**Debouncing:**
```
Problem: Player taps 100 times → 100 sync requests
Solution: Wait 2 seconds after last change, then sync once

Implementation:
  let syncTimer = null
  
  function scheduleSync():
    clearTimeout(syncTimer)
    syncTimer = setTimeout(() => performSync(), 2000)
```

**Selective Sync:**
```
Problem: Syncing entire state is expensive
Solution: Only sync changed fields

Track "dirty" fields:
  dirtyFields = { bz: true, xp: true }
  
Sync only dirty:
  UPDATE profiles SET bz = ?, xp = ? WHERE telegram_id = ?
```

**Batch Updates:**
```
Problem: Multiple changes → multiple network requests
Solution: Batch into one request

Example:
  Single request:
    UPDATE profiles SET 
      bz = ?, 
      xp = ?, 
      total_taps = ?, 
      total_tap_income = ?
    WHERE telegram_id = ?
```

**Error Handling:**
```
Retry Strategy:
  Attempt 1: Immediate sync
  Attempt 2: 5 seconds later (if failed)
  Attempt 3: 15 seconds later (exponential backoff)
  Attempt 4+: 30 seconds later (max interval)

Failure Actions:
  - Keep trying in background
  - Show "Offline Mode" indicator in UI
  - Ensure localStorage persists data
  - Sync automatically when connection restored
```

---

## 15. Telegram Integration

### 15.1 Telegram Mini App (TMA) Basics

**What is a TMA?**
- Web app that runs inside Telegram
- Uses Telegram WebApp SDK (JavaScript)
- Full access to Telegram user data
- Can use Telegram UI elements (buttons, popups)
- Can accept Telegram Payments (Stars, in-app purchases)

**How Users Access:**
1. Open Telegram bot (@bunergy_bot)
2. Click "Play Game" button
3. TMA opens in embedded browser
4. Seamless experience (no app install needed)

### 15.2 Telegram WebApp SDK

**SDK Initialization:**
```javascript
// Load SDK from Telegram CDN
<script src="https://telegram.org/js/telegram-web-app.js"></script>

// Initialize in app
window.Telegram.WebApp.ready()
window.Telegram.WebApp.expand() // Full-screen mode
```

**Available APIs:**
- `initData` - User authentication data
- `initDataUnsafe` - Parsed user data
- `colorScheme` - Light/dark theme
- `themeParams` - Telegram colors
- `viewportHeight` - Available screen height
- `showPopup()` - Show Telegram-style popups
- `showAlert()` - Show alerts
- `close()` - Close TMA
- `HapticFeedback` - Vibration feedback

### 15.3 Authentication Flow

**Step 1: Telegram Sends initData**
```
When TMA opens, Telegram attaches URL parameter:
  ?tgWebAppData={INIT_DATA}

initData contains (URL-encoded):
  - user: {id, first_name, last_name, username, photo_url}
  - auth_date: timestamp
  - hash: HMAC signature for verification
```

**Step 2: Client Parses initData**
```javascript
const initData = window.Telegram.WebApp.initDataUnsafe
const telegramUser = initData.user

// Extract user info
const userId = telegramUser.id // Telegram user ID (integer)
const firstName = telegramUser.first_name
const username = telegramUser.username
```

**Step 3: Backend Verifies initData**
```
1. Receive initData from client
2. Parse query string
3. Extract hash
4. Recreate hash using bot token as key
5. Compare hashes
6. If match → user is authenticated ✓
7. If mismatch → reject request ✗
```

**Step 4: Create/Fetch User Profile**
```
1. Query database: SELECT * FROM profiles WHERE telegram_id = ?
2. If exists → load profile
3. If not exists → create new profile with Telegram data
4. Return profile to client
5. Client stores in context + localStorage
```

**Security Notes:**
- Never trust client-sent user IDs directly
- Always verify initData hash on backend
- Use bot token as HMAC secret
- Reject requests with invalid/expired hashes

### 15.4 Deep Linking (Referrals)

**Link Format:**
```
https://t.me/{BOT_USERNAME}/BunBun?startapp={REFERRAL_CODE}
```

**How It Works:**
1. User clicks referral link (anywhere)
2. Telegram opens bot
3. If user hasn't started bot yet → Shows "Start" button
4. User clicks "Start"
5. TMA opens with `startapp` parameter
6. Client reads parameter from `initDataUnsafe.start_param`
7. Client sends referral code to backend
8. Backend validates and links users

**Example:**
```javascript
const startParam = window.Telegram.WebApp.initDataUnsafe.start_param
if (startParam) {
  // startParam = "ABC12345" (referral code)
  await registerReferral(startParam)
}
```

### 15.5 Telegram Payments (Future)

**Telegram Stars:**
- In-app currency (1 Star ≈ $0.01 USD)
- Players buy Stars with real money
- Developers receive 70% of revenue

**Payment Flow (Planned):**
1. Player clicks "Speed Up Build" with Stars
2. Client calls `window.Telegram.WebApp.showPopup()` with invoice
3. Telegram shows payment UI
4. Player confirms payment
5. Telegram processes payment
6. Backend receives webhook notification
7. Backend grants in-game item
8. Client refreshes state

**Implementation:**
```javascript
// Create invoice (backend)
const invoice = await telegram.createInvoiceLink({
  title: "Speed Up Build",
  description: "Complete upgrade instantly",
  payload: JSON.stringify({ type: "speed_up", part_id: "s2p3" }),
  currency: "XTR", // Telegram Stars
  prices: [{ label: "Speed Up", amount: 5 }] // 5 Stars
})

// Show payment UI (frontend)
window.Telegram.WebApp.openInvoice(invoice.url, (status) => {
  if (status === "paid") {
    // Payment successful, grant item
  }
})
```

### 15.6 Bot Commands

**Available Commands (In Bot Chat):**
```
/start - Open BunBun TMA
/play - Open TMA (alias)
/stats - Show player stats inline
/help - Show help text
/referral - Get referral link
```

**Command Handlers (Backend):**
- Bot receives command from Telegram
- Bot fetches user data from database
- Bot sends reply (text, image, inline buttons)
- Bot can also open TMA via inline keyboard button

---

## 16. User Interface Structure

### 16.1 Navigation Overview

**Bottom Navigation Bar (Always Visible):**
- 6 main tabs
- Fixed position at bottom
- Icon + label for each tab
- Active tab highlighted

**Tabs:**
1. **Tap** - Main gameplay (tap bunny, earn BZ)
2. **Boost** - Energy booster upgrades
3. **Build** - Hardware part upgrades
4. **Convert** - BZ ↔ BB exchange
5. **XP Tiers** - View tier progression
6. **Rewards** - Daily/weekly rewards, tasks, NFTs

### 16.2 Screen Details

**Tap Screen:**
```
Components:
- Large bunny character (tappable)
- Energy bar (current/max, color-coded)
- Balance display (BZ, BB, XP)
- Tier badge
- Stats panel (BZ/hour, taps today)
- Compact dashboard (optional)

Interactions:
- Tap bunny → earn BZ + XP
- Energy depletes with each tap
- Energy regenerates over time
- Visual feedback (animation, haptics)
```

**Boost Screen:**
```
Components:
- 4 booster cards
- Each card shows:
  * Booster name
  * Current level
  * Effect (e.g., "+50 BZ per tap")
  * Upgrade cost
  * Upgrade button
  * Lock status (if tier/referral gate not met)

Layout:
- 2x2 grid or vertical list
- Color-coded by booster type
```

**Build Screen:**
```
Components:
- 5 stage accordions/tabs
- Each stage contains 10 parts
- Each part card shows:
  * Part name
  * Current level
  * Yield (BZ/hour)
  * Upgrade cost
  * Build time (if applicable)
  * Upgrade/Speed-up buttons
  * Building progress (if in progress)

Features:
- Build queue (1 at a time)
- Speed-up options (BB or Stars)
- Total passive income display at top
```

**Convert Screen:**
```
Components:
- Balance display (BZ, BB)
- Conversion type toggle (BZ→BB or BB→BZ)
- Input field (amount to convert)
- Quick fill buttons (Half, Max)
- Conversion preview (shows output + bonus/burn)
- Convert button
- Conversion history list (recent transactions)

Features:
- Real-time calculation preview
- Tier bonus indicator
- Validation messages (insufficient balance, tier locked)
```

**XP Tiers Screen:**
```
Components:
- Current tier badge (large)
- XP progress bar
- Next tier display
- Tier benefits table
- Tier progression roadmap

Features:
- Visual tier icons
- Benefits comparison
- Motivational milestones
```

**Rewards Screen:**
```
3 Sub-Sections (Tabs):

1. Daily Rewards:
   - 7-day calendar grid
   - Current day highlighted
   - Claim button
   - Streak counter

2. Weekly Challenges:
   - 3 challenge cards
   - Progress bars
   - Claim buttons
   - Reset countdown

3. NFTs:
   - NFT collection grid
   - Each NFT card shows:
     * Artwork/icon
     * Name
     * Requirement (locked/unlocked)
     * Price
     * Purchase/Owned status
   - Progress bars for unlock requirements
```

**Tasks Screen:**
```
Components:
- Task type filters (Daily, Weekly, Progressive)
- Task list (grouped by type)
- Each task card shows:
  * Title + description
  * Progress bar
  * Reward display
  * Claim button (if completed)
  * Completion status

Features:
- Collapsible sections
- Search/filter
- Sort by reward, progress, etc.
```

**Referrals Screen:**
```
Components:
- Referral stats card:
  * Total referrals count
  * Pending earnings (BZ)
  * Total claimed (BZ)
- Referral code display (large, copyable)
- Referral link (copyable)
- Share buttons (Telegram, copy)
- Referral list (shows each referee + earnings)
- Milestone progress (visual checklist)
- Claim button (for pending earnings)

Features:
- One-tap share to Telegram
- Automatic code generation
- Real-time earnings updates
```

### 16.3 Always-Visible Elements

**Header:**
- App logo/name
- Current balance (BZ, BB, XP) - always visible
- Settings icon (opens modal)

**Settings Modal:**
- Sound/haptic toggles
- Theme selector (light/dark/auto)
- Account info (Telegram user)
- Sync status
- Logout option

**Loading States:**
- Skeleton loaders while fetching data
- Spinner for long operations
- Offline indicator (if no connection)

**Notifications/Toasts:**
- Success messages (rewards claimed, upgrades completed)
- Error messages (insufficient balance, server errors)
- Info messages (new tier reached, milestones)

---

## 17. Business Rules & Validation

### 17.1 Resource Spending Rules

**BZ Spending:**
- Can only spend up to current balance
- Must have exact amount (no partial spends)
- Negative balances not allowed

**BB Spending:**
- Must have sufficient balance for purchase + burn (if applicable)
- Precision: 6 decimals
- Cannot spend below 0.000001 BB

**XP:**
- Never spent (only accumulated)
- Used for tier calculation (read-only)

### 17.2 Purchase Validation

**Build Part Upgrades:**
```
Checks:
1. Player has sufficient BZ
2. No other part currently building (if build time > 0)
3. Part exists in system
4. Level increase is exactly +1 (no skipping)

On Success:
- Deduct BZ
- Set building_until timestamp (if applicable)
- Increment level
- Sync to database
```

**Booster Upgrades:**
```
Checks:
1. Player has sufficient BZ
2. Tier requirement met (Level 3+ needs Silver+)
3. Referral requirement met (Level 3+ needs X refs)
4. Level increase is exactly +1

On Success:
- Deduct BZ
- Increment booster level
- Recalculate effects (income per tap, energy, etc.)
- Sync to database
```

**NFT Purchases:**
```
Checks:
1. NFT unlocked (requirement met)
2. NFT not already owned
3. Player has sufficient BB

On Success:
- Deduct BB
- Mark NFT as owned
- Record purchase in database
- Add to owned list
```

### 17.3 Task/Challenge Claiming Rules

**Task Claiming:**
```
Checks:
1. Task is completed (progress ≥ target)
2. Task not already claimed
3. Task is active

On Success:
- Award reward (BZ/BB/XP)
- Mark task as claimed
- Update UI
- Sync to database

One-Time vs Repeating:
- Daily/Weekly: Can claim again after reset
- Progressive: One-time only
```

**Challenge Claiming:**
```
Same as task claiming, plus:
- Challenge resets weekly (can claim again next week)
- Baseline updates on reset
```

### 17.4 Referral Validation

**Signup Validation:**
```
Checks:
1. Referral code is valid (decodes to existing user)
2. Referee is new (not already registered)
3. Referee is not referrer (no self-referrals)
4. Referee doesn't already have a referrer

On Success:
- Link referee to referrer
- Award signup bonuses (both users)
- Create referral record
- Enable earnings sharing
```

**Earnings Claim:**
```
Checks:
1. Pending earnings > 0
2. User has referrals

On Success:
- Calculate: 20% × (referee's current total - baseline)
- Award BZ to referrer
- Update baseline to referee's current total
- Reset pending to 0
```

### 17.5 Data Integrity Rules

**Immutable Fields:**
- `telegram_id` (never changes)
- `created_at` (set once)
- `referred_by` (permanent link)

**Monotonic Fields (Only Increase):**
- `total_taps`
- `total_tap_income`
- `total_idle_income`
- `total_upgrades`
- `total_conversions`
- `xp` (never decreases)

**Calculated Fields:**
- `tier` (derived from xp)
- `daily_streak` (can reset)
- `referral_count` (count of referrals table)

**Validation on Write:**
- Balances ≥ 0 (never negative)
- Levels ≥ 0 (never negative)
- Timestamps are valid ISO 8601
- Enums match allowed values (e.g., tier = Bronze/Silver/Gold/Platinum/Diamond)

---

## 18. Appendix: Quick Reference

### 18.1 All Formulas

**Tapping:**
```
BZ per tap = (10 × incomePerTap level) × (1 + tier%)
XP per tap = 1
Energy per tap = energyPerTap level
```

**Build Parts:**
```
Cost = baseCost × (1.2 ^ level) × (1 + 0.10 × stage)
Yield = baseYield × (1.15 ^ level) × (1 + 0.15 × stage)
XP reward = 50 × stage × (1 + level × 0.1)
```

**Boosters:**
```
Cost = baseCost × (1 + level)² + 1.2 × bzPerHour
```

**Conversion (BZ → BB):**
```
Base output = Input BZ ÷ 1,000,000
Tier bonus = Base × (tier% ÷ 100)
Total BB = Base + Tier bonus
```

**Conversion (BB → BZ):**
```
Burned = Converted ÷ (tier% × 2)
Total cost = Converted + Burned
Output BZ = Converted × 1,000,000
```

**Weekly Challenge Progress:**
```
Progress = MAX(0, Current Total - Baseline)
```

**Referral Earnings:**
```
Pending = 20% × (Referee's Current Total - Baseline)
```

### 18.2 Key Ratios & Constants

```
BZ:BB Anchor Rate = 1,000,000:1
Referral Share = 20%
Max Offline Accumulation = 3 hours
Daily Reset Time = 00:00 UTC
Weekly Reset Day = Monday 00:00 UTC
Max Build Queue = 1 part at a time
BB Decimal Precision = 6 places
```

### 18.3 XP Tier Thresholds

```
Bronze: 0 - 9,999
Silver: 10,000 - 49,999
Gold: 50,000 - 149,999
Platinum: 150,000 - 499,999
Diamond: 500,000+
```

### 18.4 Build Times by Level

```
L0-L2: Instant
L3: 15 minutes
L4: 30 minutes
L5: 1 hour
L6: 4 hours
L7: 8 hours
L8: 16 hours
L9: 24 hours
L10: 36 hours
L11+: 48 hours
```

### 18.5 Task Reward Ranges

```
Daily Tasks: 1,000 - 5,000 BZ or XP
Weekly Tasks: 2,000 - 10,000 BZ/XP
Progressive Tasks: 1.0 - 5.0 BB
Challenge Rewards: 5,000 - 10,000 BZ/XP or 0.005 BB
Referral Signup: 2,500 XP + 1,000 BZ (referrer)
```

### 18.6 NFT Price Ranges

```
Free: 0 BB (Early Adopter)
Common: 2.0 BB
Rare: 3.0 - 4.0 BB
Epic: 5.0 BB
Legendary: 7.0 BB
```

---

## Document Maintenance

**This document should be updated whenever:**
- New features are added
- Game balance changes (formulas, costs, rewards)
- Database schema changes
- New integrations added

**Treat this as living documentation that evolves with the product.**

---

**END OF TECHNICAL SPECIFICATION**