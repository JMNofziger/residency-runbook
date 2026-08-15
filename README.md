# Residency runbook (Croatia)

Guided employer checklist for hiring a **third-country national** (outside EU/EEA/Switzerland) for manual work in Croatia.

Usual path: ***labor market test*** (HZZ) → **stay-and-work permit** / Single Permit (MUP). An alternate path exists only when the hire matches the official ***Upravno vijeće deficitary occupations list***.

**Not legal advice.** Fees, deadlines, and thresholds appear only as **cited facts** with official source links (or as explicit uncertainty cards when Tier-1 pages disagree).

## Run locally

```bash
python3 -m http.server 8080
```

Open http://localhost:8080 (needed for JSON/`fetch`; do not open as `file://`).

## In the app

- **Workflow overview** home — pannable node graph of stages, the *labor market test* vs *Upravno vijeće* split, and join; click a node for read-only details, then open the checklist step to make changes
- Eight guided steps from employer fitness through compliance (gates unlock in order; unchecking a required item revokes later completion)
- **Case picker** — `cases/index.json`; private `cases/private/active.json` first when present; **imported** cases appear in the picker for the session
- **Export case** / **Import case** — pretty-printed JSON (`kind: residency-runbook-case`, `schemaVersion: 2`). Browser storage is a last-session cache only; one in-app export reminder after the first durable change, plus a browser leave warning if changes remain unsaved
- **Uncertainty cards** when Tier-1 pages disagree on fees (both sources + last-verified dates; path-adopted value called out)
- **Glossary** and **Offices** drawers; per-step office cards with Zagreb-relevant addresses; small Zagreb scope note lives in office views
- Official *Upravno vijeće* occupation search (titles that may skip the *labor market test*)
- English / Croatian; sun/moon theme toggle; footer **Reset progress** with backup-first dialog (`_{date}_BAK.json`)

## Private cases (local only)

Put a real case at `cases/private/active.json` (gitignored). It appears first in the case picker when present.

Local VPR EVENT CREW test fixture (gitignored; do not commit):

- `cases/private/active.json` — preferred auto-load; exportable schema v2 bundle
- `cases/private/vpr-event-crew-us-manual-labor.json` — same bundle for import/export drills

For multiple hires, export one `{id}-runbook.json` per worker. Exports may include OIB and other identifiers.

## Facts lint / CI

```bash
npm run lint          # facts + EN/HR locale key parity
npm run test:gates
npm run audit:facts   # regenerates artifacts/facts-audit.*
```

GitHub Actions (`.github/workflows/lint-facts.yml`) runs fact lint, locale parity, and gate smoke on pushes/PRs to `main`.

Shared fees live in [`data/facts-catalog.json`](data/facts-catalog.json); contested alternate readings in [`data/uncertainty.json`](data/uncertainty.json). See [`data/facts.schema.md`](data/facts.schema.md).

## Docs

| Doc | Purpose |
|---|---|
| [DEVELOPMENT.md](DEVELOPMENT.md) | Phase board + current priorities |
| [croatia-foreign-worker-sources.md](croatia-foreign-worker-sources.md) | Official source list |
| [data/facts.schema.md](data/facts.schema.md) | Cited-fact shape + catalog rules |
| [data/nationalities/_schema.md](data/nationalities/_schema.md) | Nationality pack shape |
| [artifacts/product-critique.md](artifacts/product-critique.md) | Post–Phase 6 critique + status addendum |
| [artifacts/phase5-verification.md](artifacts/phase5-verification.md) | Phase 5 live source pass |
| [artifacts/phase6e-verification.md](artifacts/phase6e-verification.md) | Stay-and-work fee €74.32 / Form 2a (fee source of truth) |
| [artifacts/facts-audit.md](artifacts/facts-audit.md) | Generated citation audit |
