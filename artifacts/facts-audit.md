# Facts audit

Generated: 2026-11-20
Case: example-dool-us-manual-labor
Total cited facts: 62 (Tier 1: 62, Tier 2: 0)

## Notes

- Canonical shared fees live in data/facts-catalog.json; steps/checks reference by id. Contested €46.45 / accelerated biometric readings stay in data/uncertainty.json only.
- Phase 5 live Tier-1 pass completed 2026-07-31 — see artifacts/phase5-verification.md.
- CONFIRMED on HZZ novi sustav: Art. 99 20%/10%, 12 months continuous FTE, €100,000 legal-entity inflow, 30-day blockade, 90-day LMT positive-notice window.
- CONFIRMED on MUP Work of third-country nationals (Phase 6e): stay-and-work / Single Permit administrative fee is €74.32 when notified of approval. Biometric production €31.85 (regular) + admin €9.29. Accelerated biometric production (€59.73) omitted from wizard defaults. November 2026: a new labor-market or deficit-list filing is submitted on the HZZ portal, not at the police counter.
- NOTE: MUP temporary-stay page also lists €46.45 — that is the generic temporary-stay administrative fee for other purposes, NOT the stay-and-work path fee used in this runbook. See artifacts/phase6e-verification.md.
- CONFIRMED on MUP long-term page: €83.62 decision fee.
- CONFIRMED on NN 55/2026: general force 2026-06-04; 90-day decision deadline; employer-change after 6 months; unemployment 3/6 months with 2-year qualifier; A1.1 after 1 year stay; Art. 92.a(1)/(4)/(6) deferred to 2027-06-04.
- CONFIRMED on MVEP granting-stay page: short-stay 90/180; alien self-registration within 2 days if provider cannot register (provider: 1 day via eVisitor).
- ADOPTED 2026-11-20 from NN 55/2026 Art. 51 (in force 2026-06-04): temporary-stay boravište deadline is 15 days from entry or change (Art. 178(1)). The MUP procedure page still printed 3 days on 2026-11-20 — conflicting reading in data/uncertainty.json. Distinct from short-stay eVisitor self-registration. Zagreb how-and-where page receives the post-permit registration by email PDF, not as a required counter visit.
- UV list: no newer public UV decision PDF found; still shipping official 2023-03 MUP/HZZ PDF with stale-edition banner.
- CONFIRMED 2026-11-20 on NN 43/2026 residence ordinance: Form 17a is the housing declaration. Cited figures: 14 m² + 6 m², max 8 TCNs in one apartment, rent at most 30% of net pay. The PDF does not ask for square metres. Notarization of Form 17a is not required.
- CONFIRMED 2026-11-20 on HZZ filing FAQ: employment contract signed by both parties; pre-contract and letter of intent rejected.
- CONFIRMED 2026-11-20 on NN 55/2026: exceptional non-seasonal decision window may be extended by 30 days with notice (Art. 91(9)); natural-person Art. 99 inflow threshold €40,000 (legal entity remains €100,000); work limited to police administrations written on the certificate. Euro fine range for out-of-area work was not restated in the amendment text opened, so it is not a wizard fact.
- NOT ADOPTED: start of work on the employer certificate before a positive decision (old Art. 91 paragraph text not retrieved after renumbering). HZZ 15-day answer, Art. 100.a caps, zadužnica amount, minimum wage, and 16.5% health contribution were not re-verified from a page opened in this pass. Form 18a is not a US-citizen requirement on this path.
- OMITTED: Blue Card validity months (not stated on live MUP Blue Card page / not confirmed in NN 55/2026 excerpt); Blue Card fee schedule (wrong path); seasonal/student numerics.
- Case revenue remains case data, not a legal fact — still needs live tax/bank verification before filing.

## Claims

| ID | Value | Label key | Source | Tier | Verified | Age (days) | File |
|---|---|---|---|---:|---|---:|---|
| a1-deferred-force | 2027-06-04 | facts.a1DeferredForce | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/steps.json |
| art99-blocked-account | 30 days | facts.art99BlockedAccount | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/steps.json |
| art99-check-blocked | 30 days | facts.art99BlockedAccount | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/art99-checks.json |
| art99-check-continuous | 12 months | facts.art99ContinuousEmployment | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/art99-checks.json |
| art99-check-inflow | €100,000 | facts.art99InflowThreshold | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/art99-checks.json |
| art99-check-inflow-natural | €40,000 | facts.art99InflowNaturalPerson | Narodne novine — NN 55/2026, Aliens Act Art. 99(1)(7)(b) | 1 | 2026-11-20 | -97 | data/art99-checks.json |
| art99-check-ratio-10 | 10% | facts.art99DeficitaryDomesticRatio | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/art99-checks.json |
| art99-check-ratio-20 | 20% | facts.art99DomesticRatio | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/art99-checks.json |
| art99-continuous-employment | 12 months | facts.art99ContinuousEmployment | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/steps.json |
| art99-domestic-ratio | 20% | facts.art99DomesticRatio | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/steps.json |
| art99-inflow-threshold | €100,000 | facts.art99InflowThreshold | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/steps.json |
| biometric-accelerated | €59.73 | — | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/uncertainty.json |
| biometric-admin-fee | €9.29 | facts.biometricAdminFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/start-work-checks.json |
| biometric-admin-fee | €9.29 | facts.biometricAdminFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/file-permit-checks.json |
| biometric-admin-fee | €9.29 | facts.biometricAdminFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/facts-catalog.json |
| biometric-admin-fee | €9.29 | facts.biometricAdminFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/steps.json |
| biometric-production-fee | €31.85 | facts.biometricProductionFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/start-work-checks.json |
| biometric-production-fee | €31.85 | facts.biometricProductionFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/file-permit-checks.json |
| biometric-production-fee | €31.85 | facts.biometricProductionFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/facts-catalog.json |
| biometric-production-fee | €31.85 | facts.biometricProductionFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/steps.json |
| biometric-regular | €31.85 | — | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/uncertainty.json |
| case-art99-blocked | 30 days | facts.art99BlockedAccount | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | cases/example-dool-us-manual-labor.json |
| case-art99-continuous | 12 months | facts.art99ContinuousEmployment | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | cases/example-dool-us-manual-labor.json |
| case-art99-ratio | 20% | facts.art99DomesticRatio | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | cases/example-dool-us-manual-labor.json |
| case-inflow-threshold | €100,000 | facts.art99InflowThreshold | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | cases/example-dool-us-manual-labor.json |
| cy-a1-deferred-force | 2027-06-04 | facts.a1DeferredForce | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/comply-checks.json |
| cy-a1-within | 1 year | facts.a1LanguageWithin | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/comply-checks.json |
| cy-employer-change-after | 6 months | facts.employerChangeAfter | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/comply-checks.json |
| cy-long-term-fee | €83.62 | facts.longTermFee | MUP — Long-term residence and permanent stay | 1 | 2026-07-31 | 15 | data/comply-checks.json |
| cy-unemployment-long-hold-qualifier | 2 years | facts.unemploymentLongHoldQualifier | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/comply-checks.json |
| cy-unemployment-window-long-hold | 6 months | facts.unemploymentWindowLongHold | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/comply-checks.json |
| cy-unemployment-window-standard | 3 months | facts.unemploymentWindowStandard | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/comply-checks.json |
| employer-change-after | 6 months | facts.employerChangeAfter | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/steps.json |
| fp-lmt-positive-notice-window | 90 days | facts.lmtPositiveNoticeWindow | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/file-permit-checks.json |
| fp-permit-decision-timeline | 90 days | facts.permitDecisionTimeline | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/file-permit-checks.json |
| lmt-positive-notice-window | 90 days | facts.lmtPositiveNoticeWindow | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/lmt-checks.json |
| mup-procedure-3 | 3 days | — | MUP — Address registration procedure (foreigners) | 1 | 2026-11-20 | -97 | data/uncertainty.json |
| nn552026-in-force | 2026-06-04 | facts.nn552026InForce | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/steps.json |
| — | 2023-03 | uv.listEdition | MUP/HZZ — Lista zanimanja (izuzetak od TTR) PDF | 1 | 2026-07-31 | 15 | data/uv-occupations.json |
| permit-admin-fee | €74.32 | facts.permitFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/start-work-checks.json |
| permit-admin-fee | €74.32 | facts.permitFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/file-permit-checks.json |
| permit-admin-fee | €74.32 | facts.permitFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/facts-catalog.json |
| permit-admin-fee | €74.32 | facts.permitFee | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/steps.json |
| permit-decision-timeline | 90 days | facts.permitDecisionTimeline | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/steps.json |
| pkg-blocked-account | 30 days | facts.art99BlockedAccount | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/employer-package-checks.json |
| pkg-housing-extra-area | 6 m² | facts.housingExtraArea | Narodne novine — NN 43/2026, residence ordinance Art. 48(4) | 1 | 2026-11-20 | -97 | data/employer-package-checks.json |
| pkg-housing-max-apartment | 8 | facts.housingMaxInApartment | Narodne novine — NN 43/2026, residence ordinance Art. 48(5) | 1 | 2026-11-20 | -97 | data/employer-package-checks.json |
| pkg-housing-min-area | 14 m² | facts.housingMinArea | Narodne novine — NN 43/2026, residence ordinance Art. 48(4) | 1 | 2026-11-20 | -97 | data/employer-package-checks.json |
| pkg-housing-rent-cap | 30% | facts.housingRentCap | Narodne novine — NN 43/2026, residence ordinance Art. 49(1) | 1 | 2026-11-20 | -97 | data/employer-package-checks.json |
| pkg-inflow-handoff | €100,000 | facts.art99InflowThreshold | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/employer-package-checks.json |
| statute-15 | 15 days | — | Narodne novine — NN 55/2026, Art. 51 | 1 | 2026-11-20 | -97 | data/uncertainty.json |
| sw-permit-decision-extension | 30 days | facts.permitDecisionExtension | Narodne novine — NN 55/2026, Aliens Act Art. 91(9) | 1 | 2026-11-20 | -97 | data/start-work-checks.json |
| sw-permit-decision-timeline | 90 days | facts.permitDecisionTimeline | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/start-work-checks.json |
| temp-stay-46 | €46.45 | — | MUP — Temporary stay of third-country nationals | 1 | 2026-07-31 | 15 | data/uncertainty.json |
| temp-stay-address-deadline | 15 days | facts.tempStayAddressDeadline | Narodne novine — NN 55/2026, Art. 51 amending Aliens Act Art. 178(1) | 1 | 2026-11-20 | -97 | data/start-work-checks.json |
| temp-stay-address-deadline | 15 days | facts.tempStayAddressDeadline | Narodne novine — NN 55/2026, Art. 51 amending Aliens Act Art. 178(1) | 1 | 2026-11-20 | -97 | data/facts-catalog.json |
| unemployment-window-standard | 3 months | facts.unemploymentWindowStandard | Narodne novine — NN 55/2026 | 1 | 2026-07-31 | 15 | data/steps.json |
| us-police-registration | 2 days | facts.usPoliceRegistration | MVEP — Granting Stay in Croatia | 1 | 2026-07-31 | 15 | data/nationalities/us.json |
| us-visa-free-window | 90/180 | facts.usVisaFreeWindow | MVEP — Granting Stay in Croatia | 1 | 2026-07-31 | 15 | data/nationalities/us.json |
| us-visa-free-window-docs | 90/180 | facts.usVisaFreeWindow | MVEP — Granting Stay in Croatia | 1 | 2026-07-31 | 15 | data/nationalities/us.json |
| wd-lmt-window-reminder | 90 days | facts.lmtPositiveNoticeWindow | HZZ — Novi sustav zapošljavanja stranaca | 1 | 2026-07-31 | 15 | data/worker-docs-checks.json |
| work-tcn-74 | €74.32 | — | MUP — Work of third-country nationals | 1 | 2026-07-31 | 15 | data/uncertainty.json |
