# Development phases

Progress board for the Croatia employer hiring runbook.

**Goal:** Static guided checklist: *labor market test* (HZZ) → stay-and-work permit (MUP), with nationality packs, cited facts, glossary, offices, step gates, and exportable case files. Real employer cases stay local (`cases/private/`).

**Not legal advice.** Numeric claims must be cited fact objects; contested Tier-1 disagreements use uncertainty cards. `npm run lint` is build-blocking (also on CI).

**Linear board:** [residency-runbook](https://linear.app/personal-interests-llc/project/residency-runbook-c5b480e87a88) — milestones, Todo/Backlog, deferred debt. Prefer Linear for planning; keep this file as the repo-local status snapshot.

## Status

| Phase | Name | Status |
|---|---|---|
| 0–5 | Sources, shell, facts, US pack, Art. 99 + UV list, live Tier-1 verify | Done |
| 6 | Guided Steps 1–8, glossary/offices, gates, case file I/O | Done |
| 7a | Case picker (`cases/index.json`) + Zagreb scope (now in office panes) | Done |
| 7 | More nationality packs (beyond US) | Next (discovery — Linear RES-8) |
| 8a | CI lint-facts + gate smoke | Done |
| 8b | EN/HR locale parity CI + fee uncertainty cards + workflow overview | Done (Linear RES-18) |
| UX | Read-only node graph on overview (pan/zoom, inspector, jump to step) | Done |
| Trust | Canonical fact catalog + fee-history guardrails | Done (Linear RES-5, RES-6) |
| UX | Offices addresses, theme icon, footer reset+backup, import activation, one-shot export nudge | Done |
| 8 | Hosting (static deploy) | Planned (Linear RES-11) |

## Current product shape (as of 2026-07-31)

- Lands on **workflow overview**; expandable node graph shows each stage’s child tasks (from guided checks), blocked edges, and loop-backs; checklist work happens on the step pages
- **Import** registers the hire in the sidebar for the session and applies imported progress
- **Export** is the durable artifact; localStorage is cache; nudge once per session + `beforeunload` if still dirty
- Office drawer carries **Grad Zagreb** desk addresses and a small scope note (not a global chrome banner)
- UI prefers full italicized names for *labor market test* and *Upravno vijeće deficitary occupations list* over LMT/UV shorthand

## Known gaps

Deep review + addendum: [`artifacts/product-critique.md`](artifacts/product-critique.md).

**Open on Linear**

- Hosting (RES-11)
- Nationality discovery spike (RES-8); embassy-from-pack + optional Step 5 gates (RES-9, RES-10)
- Address day-count cite/omit (RES-7)
- Expand catalog beyond shared fees (RES-19)
- Backlog debt: anonymized export (RES-12), `app.js` split (RES-14), non-Zagreb (RES-15), checklist-id migration (RES-16), UV refresh (RES-17)

**Recently closed (no longer “next”)**

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
- Canonical fees: [`data/facts-catalog.json`](data/facts-catalog.json) (reference by id; contested readings in uncertainty)
- Offices: [`data/offices.json`](data/offices.json) + [`js/reference.js`](js/reference.js)
- Live verifies: [`artifacts/phase5-verification.md`](artifacts/phase5-verification.md), [`artifacts/phase6e-verification.md`](artifacts/phase6e-verification.md) (**fee SoT for stay-and-work admin fee**)

## Contribute

1. `python3 -m http.server 8080`
2. `npm run lint` and `npm run test:gates` before push
3. Prefer Tier 1 URLs in [`croatia-foreign-worker-sources.md`](croatia-foreign-worker-sources.md)
4. Shared fees → catalog id; contested figures → [`data/uncertainty.json`](data/uncertainty.json)
5. Multi-hire: **Export case** after progress; keep `cases/private/` and exports out of git
6. Update this board (and Linear) when a slice ships
