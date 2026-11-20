# Phase 6e — Live Tier-1 verification (file-permit)

> **Fee source of truth** for this path’s stay-and-work admin fee (**€74.32** on MUP Work of TCN). Temporary-stay **€46.45** is a different purpose — see in-app uncertainty cards / `data/uncertainty.json`.
>
> Filing channel superseded 2026-11-20: a new labor-market or deficit-list application is filed on the HZZ portal. See [`zagreb-2026-11-verification.md`](zagreb-2026-11-verification.md). This note remains the fee source.

**Date:** 2026-07-31  
**Scope:** Stay-and-work filing fees, Form 2a, Zagreb competence wording.

## Sources checked

| Source | URL | Result |
|---|---|---|
| MUP — Work of TCN | https://mup.gov.hr/aliens-281621/stay-and-work/work-of-third-country-nationals/281663 | Stay-and-work admin **€74.32**; biometric production **€31.85** (regular); biometric admin **€9.29** |
| MUP — Temporary stay | https://mup.gov.hr/aliens-281621/stay-and-work/temporary-stay-of-third-country-nationals/281661 | €46.45 is **temporary stay** admin (other purposes) — not the Single Permit fee for this path. Competence: PA/PS by intended stay / employer seat / place of work. |
| MUP — TCN hub | https://mup.gov.hr/gradjani-281562/moji-dokumenti-281563/stranci-333/drzavljani-trecih-zemalja/281820 | Confirms €74.32 due when notified that stay-and-work is approved |
| MUP — Obrasci | https://mup.gov.hr/obrasci-281565/281565 | **Obrazac 2a** = application for stay and work permit |
| Employer e-filing PDF | https://mup.gov.hr/UserDocsImages/2025/stranci%20izmjene%20na%20webu%20novo/Uputa%20za%20poslodavce.pdf | `radna.dozvola.zagreb@mup.hr` only for non-LMT / extensions / Art. 110 — not default LMT path |
| NN 55/2026 | https://narodne-novine.nn.hr/clanci/sluzbeni/2026_05_55_692.html | 90-day decision planning window kept |

## Corrections applied

1. **`permit-admin-fee`:** €46.45 → **€74.32**; source retargeted to MUP Work of TCN; label clarifies stay-and-work (not generic temporary stay).
2. Biometric fee sources retargeted to Work of TCN (same amounts).
3. Accelerated biometric production (€59.73) remains omitted from wizard defaults.
4. Biometrics **attendance** stays Step 7; fee amounts may appear on Step 6 with “pay when MUP instructs / at collection” copy.

## Intentional non-goals

- No invented national appointment-booking URL
- No Form 2a field specifications
- No non-Zagreb competence matrix
