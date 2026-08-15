# Development phases

Progress board for the Croatia employer hiring runbook.

**Goal:** Static guided checklist: *labor market test* (HZZ) → stay-and-work permit (MUP), with nationality packs, cited facts, glossary, offices, step gates, and exportable case files. Real employer cases stay local (`cases/private/`).

**Not legal advice.** Numeric claims must be cited fact objects; contested Tier-1 disagreements use uncertainty cards. `npm run lint` is build-blocking (also on CI).

**Linear board:** [residency-runbook](https://linear.app/personal-interests-llc/project/residency-runbook-c5b480e87a88) — milestones, Todo/Backlog, deferred debt. Prefer Linear for planning; keep this file as the repo-local status snapshot.

**Updated:** 2026-08-16

## Status legend

| | Meaning |
|---|---|
| 🟢 | Shipped on `main` |
| 🟡 | Next / in progress (unblocked) |
| 🔴 | Blocked or parked (needs a product decision, credentials, or a real second case) |

## Delivery board

| Slice | Name | Status | Notes |
|---|---|---|---|
| 0–5 | Sources, shell, facts, US pack, Art. 99 + UV list, live Tier-1 verify | 🟢 | Linear RES-1 |
| 6 | Guided Steps 1–8, glossary/offices, gates, case file I/O | 🟢 | Linear RES-2 |
| 7a | Case picker (`cases/index.json`) + Zagreb scope (office panes) | 🟢 | Linear RES-3 |
| 8a | CI lint-facts + gate smoke | 🟢 | Linear RES-4 |
| Trust | Canonical fact catalog + fee-history guardrails | 🟢 | Linear RES-5, RES-6 |
| 8b | EN/HR locale parity CI + fee uncertainty cards + workflow overview | 🟢 | Linear RES-13, RES-18 |
| UX | Offices addresses, theme icon, footer reset+backup, import activation, one-shot export nudge | 🟢 | Linear RES-20 |
| UX | Overview node graph (pan/zoom, inspector, gating child tasks, loop-backs) | 🟢 | PRs #5 / #6 |
| Trust | Post-permit address day-count (temp-stay boravište vs short-stay self-reg) | 🟢 | Linear RES-7 — MUP procedure, Form 16a, catalog `temp-stay-address-deadline` |
| 8 | Static hosting + custom domain | 🟡 | Linear RES-11 — **next**. Workflow is in repo (`workflow_dispatch`); Pages + domain still need repo settings |
| 7 | Nationality discovery spike (no invented packs) | 🔴 | Linear RES-8 — parked until product picks the next market |
| Trust | Expand catalog beyond shared fees/deadlines | 🟡 | Linear RES-19 — after hosting, migrate duplicated one-offs |
| Product | Embassy/office refs from nationality pack | 🔴 | Linear RES-9 — depends on RES-8 |
| Product | Optional Step 5 nationality gates / banner | 🔴 | Linear RES-10 — product choice first |
| Privacy | Anonymized / progress-only export | 🟡 | Linear RES-12 — unblocked; not this slice |
| Eng | Split `app.js` | 🟡 | Linear RES-14 — unblocked; not this slice |
| Geo | Non-Zagreb competence | 🔴 | Linear RES-15 — park until a real second-city case exists |
| Eng | Checklist-id migration on import | 🟡 | Linear RES-16 — unblocked; not this slice |
| Trust | UV list edition refresh process | 🟡 | Linear RES-17 — cadence doc; no newer official PDF yet |

## Next (do this)

1. **RES-11 hosting** — enable GitHub Pages (Settings → Pages → GitHub Actions), run **Deploy GitHub Pages**, confirm a production HTTPS URL, then optional custom domain. Do not claim hosted until that URL exists.
2. **RES-12 or RES-14** if hosting waits on credentials — redacted export (agencies email case files) or split `app.js` (no behavior change).
3. **Do not** invent nationality packs (RES-8) or a non-Zagreb office matrix (RES-15).

## Current product shape (as of 2026-08-15)

- Lands on **workflow overview**; expandable node graph shows each stage’s child tasks (from guided checks), blocked edges, and loop-backs; checklist work happens on the step pages
- **Import** registers the hire in the sidebar for the session and applies imported progress
- **Export** is the durable artifact; localStorage is cache; nudge once per session + `beforeunload` if still dirty
- Office drawer carries **Grad Zagreb** desk addresses and a small scope note (not a global chrome banner)
- UI prefers full italicized names for *labor market test* and *Upravno vijeće deficitary occupations list* over LMT/UV shorthand
- Step 7 `register-address` cites the MUP **3-day** temporary-stay boravište / address clock (Form 16a). US-pack short-stay self-registration remains a **different** **2-day** duty.

## Known gaps

Deep review + addendum: [`artifacts/product-critique.md`](artifacts/product-critique.md).

**Open on Linear**

- Hosting (RES-11) — 🟡 workflow ready, Pages not enabled
- Nationality discovery spike (RES-8); embassy-from-pack + optional Step 5 gates (RES-9, RES-10) — 🔴
- Expand catalog beyond shared fees (RES-19) — 🟡
- Backlog: anonymized export (RES-12), `app.js` split (RES-14), non-Zagreb (RES-15), checklist-id migration (RES-16), UV refresh (RES-17)

**Recently closed**

- Cite post-permit address registration day-count (RES-7)
- Overview node graph + gating child tasks (PRs #5 / #6)
- Canonical shared-fee catalog + fee-history guardrails
- EN/HR key-parity in CI
- Fee uncertainty spectrum cards
- Workflow overview home
- Export leave warning + quieter in-app nudge
- Import case picker / progress activation

## Done highlights

- Guided panels via [`js/guided-checks.js`](js/guided-checks.js) for every step
- Step gates + completion reconcile: [`js/step-gates.js`](js/step-gates.js), `reconcileStepCompletion` in [`js/app.js`](js/app.js)
- Case file I/O: [`js/case-file.js`](js/case-file.js); picker: [`cases/index.json`](cases/index.json); imports registered in-session
- CI: [`.github/workflows/lint-facts.yml`](.github/workflows/lint-facts.yml) — facts + EN/HR parity + gate smoke
- Overview + uncertainty: [`js/overview.js`](js/overview.js), [`js/uncertainty.js`](js/uncertainty.js), [`data/uncertainty.json`](data/uncertainty.json)
- Canonical fees/deadlines: [`data/facts-catalog.json`](data/facts-catalog.json) (reference by id; contested readings in uncertainty)
- Offices: [`data/offices.json`](data/offices.json) + [`js/reference.js`](js/reference.js)
- Live verifies: [`artifacts/phase5-verification.md`](artifacts/phase5-verification.md), [`artifacts/phase6e-verification.md`](artifacts/phase6e-verification.md) (**fee SoT for stay-and-work admin fee**)

## Contribute

1. `python3 -m http.server 8080`
2. `npm run lint` and `npm run test:gates` before push
3. Prefer Tier 1 URLs in [`croatia-foreign-worker-sources.md`](croatia-foreign-worker-sources.md)
4. Shared fees/deadlines → catalog id; contested figures → [`data/uncertainty.json`](data/uncertainty.json)
5. Multi-hire: **Export case** after progress; keep `cases/private/` and exports out of git
6. Update this board (and Linear) when a slice ships — keep the 🟢🟡🔴 column honest
