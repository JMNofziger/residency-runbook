# Product & engineering critique — residency-runbook

**Date:** 2026-07-31  
**Scope:** Post–Phase 6 static Croatia employer hiring runbook (Steps 1–8 guided), plus early Phase 7/8 work (case picker, CI lint, gate integrity).  
**Audience:** Product + engineering. Not legal advice.

## Verdict

Architecture and citation machinery are strong for a static runbook. Phase 6 delivered a coherent employer path. The remaining risk is not “missing steps” — it is **trust debt** (fee history, Zagreb/US hard-wiring), **gate integrity** (partially fixed), and **operational maturity** (CI started; hosting and more nationality packs still thin).

---

## What works

1. **Layered data model** — Cases, steps, guided checks, nationality packs, locales, and offices are separated. UI orchestration in `js/app.js` with focused modules (`guided-checks.js`, `step-gates.js`, `case-file.js`, `facts.js`, `reference.js`, `uv-list.js`).
2. **Guided panel factory** — Every step uses the same load → render → `idPrefix:checkId` → parent rollup pattern. Easy to extend; hard to invent one-off UX.
3. **Citation discipline** — Fact objects + `scripts/lint-facts.mjs` fail on unsourced thresholds. This is the product’s trust spine.
4. **Declarative gates** — `advanceRequires` in `data/steps.json` including `whenPath` for UV-skip vs LMT.
5. **Exportable case bundles** — Pretty JSON (`kind: residency-runbook-case`, `schemaVersion: 2`) is the right durable artifact for multi-hire agencies; private cases stay gitignored.
6. **Honest omissions** — Form 2a/17a field specs not invented; no fake national appointment URL; accelerated biometric fee omitted from defaults.

---

## Critiques

### 1. Trust / citation

| Issue | Severity | Notes |
|---|---|---|
| Fee history (€46.45 vs €74.32) | High (mitigated) | Path fee is €74.32 (MUP Work of TCN). Temporary-stay page still lists €46.45 for other purposes. Audit notes historically led with €46.45 and invited reintroduction of the bug. Regenerated notes must keep the Phase 6e distinction loud. |
| Duplicated fee facts | Medium | Same €74.32 / biometric amounts live in `steps.json`, `file-permit-checks.json`, and `start-work-checks.json`. Next fee change is a multi-file footgun — needs a canonical fact catalog. |
| Post-permit address deadline | Medium (closed 2026-08-15) | Catalog `temp-stay-address-deadline` cites MUP procedure: TCN on temporary stay registers boravište / address within **3 days** of entry or change (Form 16a). US-pack short-stay self-registration remains **2 days** and is labeled as a different duty. |
| Appointment check soft | Low–medium | Evidence can be “booking **or** walk-in note” — honest uncertainty, weak readiness signal. |
| UV list edition `2023-03` | Medium | Stale banner is honest; still a filing risk if a newer UV decision exists but is unpublished as PDF. |
| Assertive non-numeric copy | Low | “Wrong desk wastes the visit,” “like any other employee” — process guidance without fact objects; fine if clearly operational, risky if read as law. |

### 2. Product / UX

| Issue | Severity | Notes |
|---|---|---|
| Zagreb-hard scope | High for national use | Competence, PU Zagreb offices, biometrics desk copy, and UV “all Zagreb” toggles assume Grad Zagreb. Banner now states scope; product still *reads* national. |
| US-only nationality pack | High for multi-market | Only `data/nationalities/us.json`. Core `worker-docs` `officeIds` includes `us-embassy` for every case. |
| Nationality checks not gated | Medium | `nat:us:*` FBI/apostille items are not in `advanceRequires` — Step 5 can complete while US pipeline is empty. |
| Eyebrow always “LMT path” | Low | `renderMain` shows `ui.pathLmt` even when occupation path is UV skip. |
| Export vs cache confusion | Medium (copy improved) | In-app hint now states export is durable / localStorage is cache. Still no “unsaved changes” warning on close. |
| No anonymized export | Medium | Full OIB/address/representative ship in every export. Agencies will email these files. |

### 3. Engineering

| Issue | Severity | Notes |
|---|---|---|
| Gate uncheck hole | High (fixed this slice) | Unchecking a guided child left `completedStepIds` intact so later steps stayed unlocked. `reconcileStepCompletion()` now keeps a contiguous valid prefix and clamps the step index. |
| `app.js` god-object | Medium | ~700+ lines: load, progress, gates, occupation UI, import/export, case picker. Next features should split renderers. |
| idPrefix namespaces | Low–medium | `sw:` guided vs `sw-guided-complete` checklist vs `sw-permit-admin-fee` fact ids — three “sw” spaces. `lmtGuide`/`occGuide` vs short `fp`/`wd` inconsistency. |
| Stale US checklist id | Low (fixed) | `us-48h-registration` renamed to `us-self-registration` (fact remains 2 days). |
| Unused helper | Low | `firstBlockedReason` in `step-gates.js` unused. |
| Full `innerHTML` re-render | Low | Acceptable at current scale; will hurt as checklists grow. |
| No EN/HR key-parity CI | Medium | Manual drift risk across ~70KB locale files. |

### 4. Security / privacy

- Private case under `cases/private/` is gitignored and auto-loaded when present — correct for solo use; dangerous on shared demos.
- Export has no redaction mode.
- Public repo: risk is `git add -f` of private case or committing `*-runbook.json` exports.

### 5. Docs / process

- Phase board was accurate after 6i; Phase 7/8 were “Planned” without interim acceptance criteria.
- `phase5-verification.md` is a changelog, not the fee source of truth — must always defer to Phase 6e for stay-and-work fees.
- Tier-2 blogs were culled from sources (good); keep resisting reintroduction.

---

## Highest-leverage remaining work

1. **Canonical fact catalog** — one id → one fee/deadline; checks/steps reference by id only.  
2. **More nationality packs** — pick next markets with product; drive embassy offices from pack, not core steps.  
3. **Gate nationality slots** (optional require) or explicit “nationality panel recommended” banner on Step 5.  
4. **Anonymized / progress-only export**.  
5. **EN/HR key-parity script in CI**.  
6. **Hosting** — static host + custom domain; keep lint in CI (workflow added).  
7. **Cite or formally omit** post-permit address registration day-count with `omittedReason`. ✅ cited 2026-08-15 (`temp-stay-address-deadline`).  
8. **Non-Zagreb competence** — only when a real second city case exists; don’t fake a matrix.  
9. **Split `app.js`** — `render-step.js`, `case-session.js`.  
10. **Progress migration** for renamed check ids on import.

---

## Changes shipped with this critique cycle

- Gate integrity: `reconcileStepCompletion()` on check and mark-complete.  
- Case picker: `cases/index.json` + sidebar select (private `active.json` preferred when present).  
- Zagreb scope banner in chrome.  
- CI: `.github/workflows/lint-facts.yml` + `npm run lint:facts` / `test:gates`.  
- Audit notes corrected for €74.32 vs €46.45.  
- Renamed `us-48h-registration` → `us-self-registration`.

---

## Bottom line for product

Ship the runbook as a **Zagreb + US-first employer operating manual with cited facts**, not as a finished national multi-nationality product. The trust system is the advantage — protect it with canonical facts and CI before expanding geography or nationality packs.

---

## Status addendum — 2026-07-31 (afternoon)

Update against the critique above after follow-on shipping. Historical sections kept for context; **this section is the current scorecard.**

### Closed since critique

| Item | Where |
|---|---|
| Canonical fact catalog | `data/facts-catalog.json` + lint; checks/steps may reference by id |
| EN/HR key-parity CI | `scripts/lint-locale-parity.mjs`, `npm run lint`, workflow |
| Fee conflict UX (€74.32 vs €46.45; biometric options) | `data/uncertainty.json` + uncertainty cards |
| Workflow overview home | `js/overview.js`; checklist entry from hero / top / footer |
| Export vs cache / leave warning | One-shot in-app export nudge; `beforeunload` if still dirty |
| Import does not activate case | Imported hire registered in sidebar (`imported:` path + snapshot) with progress applied |
| Zagreb scope placement | Small note in office panes (global banner removed) |
| Offices addresses for Grad Zagreb case | `data/offices.json` (HZZ Zvonimira 15, PU Remetinečki gaj 13 / Petrinjska 30, etc.) |
| UI polish | Sun/moon theme; footer reset + `_{date}_BAK` backup; offices close; full italic term names for labor market test / Upravno vijeće list |
| Post-permit address day-count | Catalog `temp-stay-address-deadline` (MUP Form 16a procedure, verified 2026-08-15); Step 7 + US pack distinguish 3-day boravište vs 2-day short-stay self-reg |

### Still open (prioritized)

1. Hosting (RES-11) — Pages workflow is `workflow_dispatch` only until repo Pages is enabled  
2. More nationality packs (RES-8) — embassy offices from pack, not core steps  
3. Anonymized / redacted export  
4. Optional nationality checklist gate / banner on worker-docs  
5. Non-Zagreb competence only with a real second-city case  
6. Split `app.js`; progress migration for renamed check ids  
7. Expand catalog beyond shared fees (RES-19)  

### Product framing (unchanged)

Still ship as **Zagreb + US-first** with citation discipline. Do not fake a national matrix or invent form-field specs.
