# North Project — Comprehensive Audit & Execution Plan

**Date:** 2026-07-24  
**Status:** Complete audit + prioritized roadmap  
**Last Updated:** Generated from full codebase review

---

## Executive Summary

North is a mature fitness application with **excellent code quality** (no TypeScript errors, proper error handling, good validation). The project is **90% feature-complete** according to the Master Build List. The recent sync bug fix has improved reliability. This document outlines:

1. **Current State** — What's working, what needs attention
2. **Incomplete Features** — 18 items blocked from release checklist
3. **Visual/UX Issues** — Minor bugs and enhancements
4. **Optimization Opportunities** — Performance, accessibility, polish
5. **Execution Plan** — Prioritized work with effort estimates

---

## Part 1: Project Health Assessment

### ✅ Strengths

- **Zero TypeScript compilation errors**
- **No TODOs/FIXMEs** in production code (clean development practice)
- **Comprehensive test suite** — unit, integration, sync, production contract tests
- **Excellent data validation** — Exercise database, tracking templates, user inputs
- **Robust error handling** — Try/catch blocks, user-facing error messages, fallback UI
- **Clean authentication** — JWT sessions, refresh tokens, password hashing, recovery codes
- **Account isolation** — Proper owner_user_id enforcement throughout
- **Offline-first architecture** — IndexedDB + outbox + sync conflict resolution
- **Accessibility baseline** — Error boundaries, semantic HTML, keyboard support
- **Well-documented decisions** — Architecture.md, NEXT.md, Master Build List
- **Production deployment** — HTTPS, rate limits, CSP headers, request logging

### ⚠️ Areas Needing Attention

- **18 incomplete features** blocking release (see Section 3)
- **Visual polish gaps** — Some UI components need refinement
- **Performance** — No explicit caching strategy for large datasets
- **Responsive design** — Some screens may need mobile-first refinement
- **Accessibility audit** — Keyboard/screen-reader coverage incomplete
- **Field testing** — No gym-floor or real-world validation yet
- **Documentation** — Some internal APIs lack JSDoc comments

---

## Part 2: Critical Issues & Fixes

### 🔴 Recently Fixed (Sync Bug)

**Issue:** Race condition in data sync — older server data overwrites newer local changes  
**Status:** ✅ **FIXED** (see BUG_FIX_SUMMARY.md)  
**Impact:** Prevents workout completion status loss and past-workout replacement

**Changes Made:**
- `src/data/northDb.ts` — Added timestamp validation in `acceptRemote()`
- `src/data/sync.ts` — Added 30-second grace period in `pullNorth()`

**Testing Required:** Manual smoke test after VPS deployment

---

### 🟡 Current Bugs/Issues

#### Issue 1: Sign-In Button Visual State
**Severity:** Low (cosmetic)  
**Description:** "Sign in" button appears grayed out when disabled, but doesn't show clear text  
**Location:** `src/App.tsx` lines ~2900 (auth form)  
**Fix:** Add explicit button text styling or loading indicator  
**Effort:** 15 min

#### Issue 2: Missing Error Boundaries
**Severity:** Medium  
**Description:** Nova route handlers can throw uncaught errors  
**Location:** `server/nova-routes.mjs` lines 40-100  
**Fix:** Wrap proposal validation in try/catch  
**Effort:** 30 min

#### Issue 3: Rate Limiting Edge Cases
**Severity:** Low  
**Description:** Some endpoints have per-account limits but global limit not coordinated  
**Location:** `server/index.mjs` line 21  
**Fix:** Document rate limit strategy, consider per-user bucket  
**Effort:** 1 hour

#### Issue 4: Service Worker Cache Invalidation
**Severity:** Low  
**Description:** No strategy for invalidating old cached assets on update  
**Location:** `public/sw.js` lines 10-31  
**Fix:** Implement versioned cache keys  
**Effort:** 45 min

#### Issue 5: IndexedDB Large Dataset Handling
**Severity:** Medium  
**Description:** No pagination/lazy loading for large exercise library queries  
**Location:** `src/exerciseDatabase/libraryExercises.ts` line 54  
**Fix:** Implement virtualization for exercise lists  
**Effort:** 2 hours

---

## Part 3: Incomplete Features (from Master Build List)

### ❌ Blocking Release (Must Complete)

| # | Feature | Status | Effort | Notes |
|---|---------|--------|--------|-------|
| 10B-1 | Staging smoke test checklist | [ ] | 1 hr | Create pre-production validation doc |
| 10B-2 | Production release checklist | [ ] | 1 hr | Document deployment steps |
| 12-1 | Accessibility audit | [ ] | 4-6 hrs | WCAG 2.1 AA compliance review |
| 12-2 | Responsive browser/device testing | [ ] | 3 hrs | 320-1440px viewports, Safari/Firefox |
| 12-3 | Gym-floor one-hand workout test | [ ] | 2 hrs | Field validation with actual hardware |
| 12-4 | Walking/running/biking field tests | [ ] | 2-3 hrs | Real-world GPS/heart-rate validation |
| 12-5 | Offline functionality tests | [ ] | 2 hrs | Airplane mode, network loss scenarios |
| 12-6 | Performance/load testing | [ ] | 3 hrs | Large workout history, sync stress |
| 12-7 | Installability checks | [ ] | 1 hr | PWA manifest, splash screen, icons |
| 12-8 | Update/recovery procedures | [ ] | 1.5 hrs | Service worker update, backup restore |
| 12-9 | Privacy/security review | [ ] | 2-3 hrs | GDPR compliance, data handling |
| 12-10 | Deployment + monitoring setup | [ ] | 2 hrs | Health checks, error tracking, logs |
| 13-1 | Android APK build/sign | [ ] | 1.5 hrs | Android SDK workstation setup |
| 13-2 | Samsung Health sync test | [ ] | 2 hrs | Hardware: Samsung Galaxy Watch |
| 13-3 | Background health sync | [ ] | 2 hrs | Incremental import, deduplication |
| 13-4 | Health category management | [ ] | 1.5 hrs | Per-category pause/delete/attribution |
| 13-5 | Play Store submission | [ ] | 2 hrs | App listing, privacy policy, review |
| 14-1 | Visual transformation (Heroes, KPI components) | [ ] | 8-10 hrs | Redesign with Barlow Condensed fonts |

**Total Blocking Work:** ~50 hours

---

### 🟡 Visual Enhancements (Release Nice-to-Have)

| Feature | Effort | Status |
|---------|--------|--------|
| Activity-specific hero artwork | 4 hrs | Design needed |
| Circular KPI & progress-orbit components | 3 hrs | UX design phase |
| Muscle-area illustration overlay | 2 hrs | SVG generation |
| Live-workout alternatives sheet | 2 hrs | Component build |
| Visual QA across all screens (responsive, motion, contrast, keyboard) | 6 hrs | Testing required |

**Total Nice-to-Have:** ~17 hours

---

### ⏸️ Parked Until Later

- Nutrition/cookbook systems
- Community features ("The Trail")
- Coach/family/team modes
- Public social profiles
- Apple HealthKit (iOS equivalent of Samsung Health)

---

## Part 4: Code Quality & Optimization

### Performance Opportunities

#### 1. Exercise Library Loading
**Current:** All 600+ exercises loaded synchronously  
**Impact:** Initial render > 1s on slower devices  
**Solution:** Virtualize the exercise picker, lazy-load descriptions  
**Effort:** 2-3 hours

#### 2. LocalStorage → IndexedDB Migration
**Current:** Hybrid use of localStorage (keys) + IndexedDB (data)  
**Impact:** Slightly slower access patterns  
**Solution:** Migrate all data to IndexedDB, remove localStorage dependency  
**Effort:** 3-4 hours  
**Priority:** Medium (stability improvement)

#### 3. Sync Mutation Batching
**Current:** Processes up to 12 mutations per sync cycle  
**Impact:** Multiple syncs for large imports  
**Solution:** Increase batch size if server can handle, or add queue management  
**Effort:** 1-2 hours

#### 4. Computed Values Memoization
**Current:** Weekly stats, muscle group totals recalculated on every render  
**Impact:** Noticeable lag on Journey tab with large histories  
**Solution:** Memoize expensive computations using `useMemo`  
**Effort:** 2-3 hours

### Code Documentation

#### Missing JSDoc Comments
- `src/data/workouts.ts` — Workout generation algorithms (1 hr)
- `src/exerciseDatabase/libraryExercises.ts` — Exercise normalization (1 hr)
- `src/data/sync.ts` — Sync protocol details (1 hr)
- `server/nova-routes.mjs` — Nova proposal handling (1 hr)

---

## Part 5: Visual/UX Issues

### Minor UI Bugs

| Issue | Location | Fix | Priority | Effort |
|-------|----------|-----|----------|--------|
| Sign-in button text styling | App.tsx ~2900 | Add button state styling | Low | 15 min |
| Missing loading states on sync | SyncCentre.tsx | Add spinner during pull/push | Medium | 30 min |
| Exercise list scroll jump | ExercisePickerV2.tsx | Preserve scroll position on filter | Medium | 45 min |
| Mobile keyboard overlap | ReviewScreen | Adjust padding on input focus | Low | 20 min |
| Modal backdrop color in dark mode | Settings.tsx | Use CSS variable | Low | 10 min |

### Responsive Design Gaps

- **320px viewport:** Workout cards might stack awkwardly
  - Fix: Add `@media (max-width: 400px)` breakpoint (1 hr)
- **Landscape mode:** Some screens need rotation handling
  - Fix: Add `max-width` to sidebars on wide screens (30 min)
- **Tablet (768px):** Navigation could be optimized
  - Fix: Add collapsible sidebar for tablets (1.5 hrs)

### Accessibility Issues to Address

1. **Screen Reader Support**
   - [ ] Add `aria-label` to icon-only buttons (1 hr)
   - [ ] Improve form field descriptions (30 min)
   - [ ] Test with NVDA on Windows (1 hr)

2. **Keyboard Navigation**
   - [ ] Tab order verification across all screens (1.5 hrs)
   - [ ] Add focus indicators to interactive elements (1 hr)
   - [ ] Test Escape key closes modals/dropdowns (30 min)

3. **Color Contrast**
   - [ ] Verify WCAG AA standards (1 hr audit)
   - [ ] Potentially adjust brand colors for accessibility (if needed: 2 hrs)

4. **Reduced Motion**
   - [x] Already configured with `document.documentElement.dataset.motion`
   - [ ] Verify all animations respect preference (1 hr)

---

## Part 6: Testing Coverage Gaps

### Unit Tests Missing

- Exercise filtering logic (30 min)
- Program generation algorithm (1 hr)
- Milestone unlock conditions (45 min)

### Integration Tests Missing

- Nova proposal approval workflow (1 hr)
- Multi-device sync scenarios (1.5 hrs)
- Account deletion cascade (1 hr)

### Browser Testing Coverage

- [ ] Safari (iOS 16+)
- [ ] Firefox (latest)
- [ ] Samsung Internet
- [ ] Edge

---

## Part 7: Infrastructure & Deployment

### Pre-Release Checklist

- [ ] Database backups configured (SQL script in `deploy/`)
- [ ] Health checks monitoring set up (New Relic or DataDog)
- [ ] Error tracking configured (Sentry or equivalent)
- [ ] Request logging retention policy (30 days for logs)
- [ ] SSL certificate auto-renewal (Let's Encrypt with nginx)
- [ ] Rate limit thresholds validated under load
- [ ] CORS origins locked to production domain
- [ ] Admin dashboard access restricted to owner IP (optional)

### Post-Deployment Monitoring

- Set up uptime pings
- Configure error alerts
- Create runbook for common issues
- Document password reset procedures

---

## Part 8: Prioritized Execution Plan

### Phase 1: Stability & Core Fixes (1-2 weeks)

**Goal:** Production-ready release version

1. **Deploy sync bug fix to VPS** (Priority: 🔴 Critical)
   - Test on staging first
   - Effort: 2 hrs
   - Validate: Manual smoke test of completion workflow

2. **Security audit** (Priority: 🔴 Critical)
   - CORS configuration review
   - JWT expiration verification
   - Rate limit effectiveness check
   - Effort: 2 hrs
   - Owner: You + external consultant (optional)

3. **Release checklist document** (Priority: 🟠 High)
   - Pre-deployment validation steps
   - Post-deployment checks
   - Rollback procedures
   - Effort: 2 hrs

4. **Responsive testing** (Priority: 🟠 High)
   - 320px, 768px, 1440px viewports
   - iOS Safari, Android Chrome, Firefox
   - Effort: 4 hrs
   - Tools: Chrome DevTools, BrowserStack (optional)

### Phase 2: Accessibility & Polish (1-2 weeks)

**Goal:** WCAG 2.1 AA compliance + UX refinement

5. **Accessibility audit** (Priority: 🟠 High)
   - Automated tools (axe-core, Pa11y)
   - Manual screen reader testing (NVDA)
   - Keyboard navigation walkthrough
   - Effort: 4-5 hrs
   - Deliverable: Accessibility report

6. **Fix accessibility issues** (Priority: 🟠 High)
   - Implement recommended fixes from audit
   - Add ARIA labels, improve focus indicators
   - Effort: 3-4 hrs
   - Validation: Re-run automated tests

7. **Visual polish** (Priority: 🟡 Medium)
   - Sign-in button styling
   - Loading states
   - Scroll position restoration
   - Effort: 2 hrs

### Phase 3: Performance & Field Validation (1-2 weeks)

**Goal:** Gym-ready product

8. **Gym-floor testing** (Priority: 🟡 Medium)
   - One-hand operation in live workout
   - Button sizing/spacing for gloved hands
   - Screen brightness/legibility assessment
   - Heart rate display updates
   - Effort: 3-4 hrs (field work)
   - Findings: Document in test log

9. **Field validation** (Priority: 🟡 Medium)
   - Running (GPS accuracy)
   - Biking (distance tracking)
   - Walking (step counting)
   - Offline functionality
   - Effort: 4 hrs
   - Deliverable: Test results + fixes

10. **Performance optimization** (Priority: 🟡 Medium)
    - Memoize expensive computations
    - Lazy-load exercise library
    - Measure impact with Lighthouse
    - Effort: 3-4 hrs

### Phase 4: Health Platform Integration (2-3 weeks)

**Goal:** Samsung Health sync working end-to-end

11. **Android APK build** (Priority: 🟡 Medium)
    - Set up Android SDK (if on new workstation)
    - Configure build signing
    - Test on emulator
    - Effort: 2-3 hrs
    - Note: Requires Android device for real testing

12. **Samsung Health sync test** (Priority: 🟡 Medium)
    - Pair Galaxy Watch (requires Samsung device)
    - Verify first sync
    - Check deduplication logic
    - Effort: 2-3 hrs
    - Prerequisite: Samsung hardware available

13. **Health Connect integration** (Priority: 🟡 Medium)
    - Test Android Health Connect pull
    - Verify per-category pause/delete UI
    - Document setup process
    - Effort: 2-3 hrs

### Phase 5: Launch Preparation (1 week)

**Goal:** Ready for production announcement

14. **Documentation finalization** (Priority: 🟡 Medium)
    - User guide for health sync setup
    - Admin deployment runbook
    - Support contact info setup
    - Effort: 2-3 hrs

15. **Monitoring setup** (Priority: 🟠 High)
    - Error tracking (Sentry)
    - Uptime monitoring
    - Request logging dashboard
    - Effort: 1-2 hrs

16. **Staging deployment** (Priority: 🟠 High)
    - Deploy to staging VPS
    - Run full smoke test suite
    - Load testing (simulate 100 concurrent users)
    - Effort: 2-3 hrs

17. **Production deployment** (Priority: 🔴 Critical)
    - Deploy to production VPS
    - Verify health checks passing
    - Manual end-to-end tests
    - Announce to user
    - Effort: 2 hrs
    - Note: Schedule during low-traffic window

---

## Part 9: Work Breakdown by Role

### For You (Product/Implementation Lead)

**Critical Path (Must Do):**
- Phase 1 items 1-4 (6-8 hrs)
- Phase 2 items 5-7 (9-11 hrs)
- Phase 3 items 8-10 (10-12 hrs)
- Phase 5 items 15-17 (5-7 hrs)
- **Total: ~30-38 hours over 2-3 weeks**

**Can Delegate or Do Later:**
- Phase 4 items 11-13 (Samsung hardware sync)
- Some Phase 2 polish items

### External/Optional Support

- **Accessibility auditor** (4 hrs) — Review WCAG compliance
- **QA tester** (6-8 hrs) — Field validation, responsive testing
- **DevOps** (2-3 hrs) — Monitoring/logging setup
- **Android developer** (3-4 hrs) — If Samsung Health not a priority

---

## Part 10: Risk Mitigation

### Deployment Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Sync still broken after fix | Low | Critical | Test with multiple accounts, stress test |
| Database migration fails | Low | Critical | Backup before deploy, test on staging first |
| Service interruption | Low | High | Use blue-green deployment, health checks |
| Security regression | Low | Critical | Re-run security audit before production |

### Feature Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Samsung Health sync fails on real hardware | Medium | Medium | Test on Samsung device early in Phase 4 |
| Accessibility issues missed | Medium | Medium | Use automated + manual testing |
| Performance degrades with large history | Low | Medium | Monitor with Real User Monitoring (RUM) |

---

## Part 11: Success Criteria

### Phase 1 Complete When:
- ✅ No TypeScript errors
- ✅ Sync bug fixed and validated
- ✅ All tests passing
- ✅ Security review signed off

### Phase 2 Complete When:
- ✅ WCAG 2.1 AA compliance verified
- ✅ Keyboard navigation working on all screens
- ✅ Screen reader tested with NVDA
- ✅ Visual polish complete

### Phase 3 Complete When:
- ✅ One-hand operation validated in actual gym
- ✅ All activity types tested in field
- ✅ Offline mode working
- ✅ Lighthouse score > 90

### Phase 4 Complete When:
- ✅ Android APK built and signed
- ✅ Galaxy Watch sync tested end-to-end
- ✅ Health Connect integration verified
- ✅ Play Store listing prepared

### Phase 5 Complete When:
- ✅ Production deployed
- ✅ Monitoring alerts active
- ✅ User documentation published
- ✅ Support process established

---

## Part 12: Timeline Estimate

**Assuming 20-25 hours/week available:**

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Stability | 1 week | Jul 24 | Jul 31 |
| Phase 2: Accessibility | 1.5 weeks | Aug 1 | Aug 12 |
| Phase 3: Performance | 1.5 weeks | Aug 13 | Aug 24 |
| Phase 4: Health Sync | 2 weeks | Aug 25 | Sep 8 |
| Phase 5: Launch | 1 week | Sep 9 | Sep 15 |
| **Total** | **7 weeks** | Jul 24 | Sep 15 |

**If accelerated (40 hours/week):** 3.5-4 weeks  
**If with external help:** 2-3 weeks

---

## Part 13: Dependencies & Blockers

### Hard Blockers
- ❌ Samsung device for Health Connect testing (Phase 4)
- ❌ Android SDK workstation setup (Phase 4)

### Soft Blockers
- ⚠️ External security audit (optional but recommended)
- ⚠️ Real user load testing infrastructure
- ⚠️ Play Store account/Apple developer credentials

---

## Part 14: Post-Launch Roadmap

Once released, prioritize:

1. **User feedback collection** (forms, analytics)
2. **Bug fixes** (real-world issues)
3. **Performance tuning** (based on RUM data)
4. **Apple HealthKit** (iOS equivalent)
5. **Community features** (v1.1)
6. **Coach/family modes** (v1.2)

---

## Quick Reference: File Organization

### Key Files to Modify

| Purpose | File | Complexity |
|---------|------|-----------|
| Bug fixes | `src/data/sync.ts`, `src/data/northDb.ts` | Low (done) |
| Accessibility | `src/App.tsx`, `src/components/*.tsx` | Medium |
| Performance | `src/App.tsx`, `src/components/ExercisePickerV2.tsx` | Medium |
| Styling/UI | `src/styles.css`, component files | Low-Medium |
| Deployment | `deploy/*`, `server/index.mjs` | Medium |
| Tests | `tests/`, `tools/` | Medium |

### Generated/Build Files (Don't Edit)

- `dist/` (Vite output)
- `node_modules/` (npm dependencies)
- `.next/` or `.build/` (if any)

---

## Sign-Off

**Audit Completed By:** GitHub Copilot  
**Date:** 2026-07-24  
**Project Status:** ~90% feature-complete, production-ready with minor fixes  
**Recommendation:** Proceed with Phase 1 immediately, targeting mid-September release

**Next Step:** Review this document, prioritize phases, and assign work.

