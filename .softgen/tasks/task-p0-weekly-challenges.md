---
title: P0 — Weekly Challenges Source-of-Truth Refactor
status: in_progress
priority: urgent
type: bug
tags: [weekly-challenges, supabase, rewards, tma]
created_by: agent
created_at: 2026-08-02T14:47:00Z
position: 1
---

## Notes
Refactor RewardsNFTsScreen and weeklyChallengeService so Supabase is the single source of truth. Remove localStorage races that cause duplicates, repeated claimability, and incorrect 10/10 progress.

## Checklist
- [ ] Load weekly challenges from Supabase on mount
- [ ] Compute progress from DB baseline minus current totals
- [ ] Claim button disabled when DB says claimed
- [ ] After claim, re-fetch challenge row from DB
- [ ] Remove localStorage mutation for weekly challenges state
- [ ] Fix baseline reset logic in GameStateContext
- [ ] Validate check_for_errors

## Acceptance
- Only 3 unique challenges display
- Claimed challenges cannot be claimed again
- Progress shows correctly (0/10 when no conversions done in current week)
- Weekly reset clears claimed state