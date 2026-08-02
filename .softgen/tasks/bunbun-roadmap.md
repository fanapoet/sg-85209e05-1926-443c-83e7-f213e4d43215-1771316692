---
title: BunBun TMA Full Functionality Roadmap
status: in_progress
priority: urgent
type: chore
tags: [audit, roadmap, tma, supabase]
created_by: agent
created_at: 2026-08-02T14:45:00Z
position: 1
---

## Notes
Roadmap to make BunBun TMA fully functional. Prioritized by user-facing impact.

## Checklist
- [ ] P0: Fix weekly challenges (Supabase as source of truth, remove localStorage races)
- [ ] P1: Remove localStorage as database for critical state
- [ ] P2: Fix conversion history loading from DB
- [ ] P3: Harden Telegram auth and remove mock fallbacks
- [ ] P4: Refactor syncService into smaller, reliable modules
- [ ] P5: Clean up debug code and console logs

## Acceptance
- Weekly challenges reset correctly and can only be claimed once per period
- Conversion history loads from Supabase on any device
- No mock/fallback auth in production
- All lint/type checks pass
- Debug panel hidden in production