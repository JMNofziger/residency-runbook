#!/usr/bin/env node
/**
 * Collect every cited fact object under data/ and cases/ into artifacts/.
 * Usage: node scripts/generate-facts-audit.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts");
const TARGETS = [path.join(ROOT, "data"), path.join(ROOT, "cases")];

/** Skip gitignored private / real-employer fixtures so audit artifacts stay clean. */
function isPrivateCasePath(fullPath) {
  const rel = path.relative(ROOT, fullPath).split(path.sep).join("/");
  if (rel.startsWith("cases/private/")) return true;
  if (/^cases\/.*-private\.json$/i.test(rel)) return true;
  if (/^cases\/vpr-/i.test(rel)) return true;
  if (/^cases\/.*\.local\.json$/i.test(rel)) return true;
  return false;
}

function listJsonFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (isPrivateCasePath(full)) continue;
    if (entry.isDirectory()) out.push(...listJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".json")) out.push(full);
  }
  return out;
}

function isFactObject(node) {
  return (
    node &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    "value" in node &&
    "sourceUrl" in node &&
    "sourceTier" in node &&
    "verifiedDate" in node
  );
}

function isFactsArrayItemPath(pathStr) {
  return /\.facts\[\d+\]$/.test(pathStr) || /^facts\[\d+\]$/.test(pathStr);
}

function ageDays(verifiedDate) {
  return Math.floor((Date.UTC(2026, 7, 15) - Date.parse(verifiedDate)) / (24 * 3600 * 1000));
}

function pushFact(acc, node, file, pathStr, idOverride = null) {
  const age = ageDays(node.verifiedDate);
  acc.push({
    id: idOverride || node.id || null,
    value: node.value,
    labelKey: node.labelKey || null,
    sourceUrl: node.sourceUrl,
    sourceTier: node.sourceTier,
    sourceName: node.sourceName || null,
    verifiedDate: node.verifiedDate,
    ageDaysAsOfAudit: Number.isFinite(age) ? age : null,
    file: path.relative(ROOT, file),
    path: pathStr || "(root)",
  });
}

function walk(node, file, pathStr, acc, catalogById) {
  if (!node || typeof node !== "object") return;
  if (isFactObject(node)) {
    pushFact(acc, node, file, pathStr);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => {
      const itemPath = `${pathStr}[${i}]`;
      if (typeof item === "string" && isFactsArrayItemPath(itemPath) && catalogById[item]) {
        pushFact(acc, catalogById[item], file, itemPath, item);
        return;
      }
      walk(item, file, itemPath, acc, catalogById);
    });
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    walk(v, file, pathStr ? `${pathStr}.${k}` : k, acc, catalogById);
  }
}

const catalogPath = path.join(ROOT, "data/facts-catalog.json");
const catalogData = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const catalogById = catalogData.facts || {};

const facts = [];
for (const [id, fact] of Object.entries(catalogById)) {
  pushFact(facts, fact, catalogPath, `facts.${id}`, id);
}

for (const file of TARGETS.flatMap(listJsonFiles)) {
  if (path.relative(ROOT, file) === "data/facts-catalog.json") continue;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  walk(data, file, "", facts, catalogById);
}

facts.sort((a, b) => String(a.id).localeCompare(String(b.id)) || a.path.localeCompare(b.path));

const auditDate = "2026-08-15";
const payload = {
  generatedAt: auditDate,
  caseId: "example-dool-us-manual-labor",
  factCount: facts.length,
  tier1Count: facts.filter((f) => f.sourceTier === 1).length,
  tier2Count: facts.filter((f) => f.sourceTier === 2).length,
  notes: [
    "Canonical shared fees live in data/facts-catalog.json; steps/checks reference by id. Contested €46.45 / accelerated biometric readings stay in data/uncertainty.json only.",
    "Phase 5 live Tier-1 pass completed 2026-07-31 — see artifacts/phase5-verification.md.",
    "CONFIRMED on HZZ novi sustav: Art. 99 20%/10%, 12 months continuous FTE, €100,000 legal-entity inflow, 30-day blockade, 90-day LMT positive-notice window.",
    "CONFIRMED on MUP Work of third-country nationals (Phase 6e): stay-and-work / Single Permit administrative fee is €74.32 when notified of approval (police filing). Biometric production €31.85 (regular) + admin €9.29. Accelerated biometric production (€59.73) omitted from wizard defaults.",
    "NOTE: MUP temporary-stay page also lists €46.45 — that is the generic temporary-stay administrative fee for other purposes, NOT the stay-and-work path fee used in this runbook. See artifacts/phase6e-verification.md.",
    "CONFIRMED on MUP long-term page: €83.62 decision fee.",
    "CONFIRMED on NN 55/2026: general force 2026-06-04; 90-day decision deadline; employer-change after 6 months; unemployment 3/6 months with 2-year qualifier; A1.1 after 1 year stay; Art. 92.a(1)/(4)/(6) deferred to 2027-06-04.",
    "CONFIRMED on MVEP granting-stay page: short-stay 90/180; alien self-registration within 2 days if provider cannot register (provider: 1 day via eVisitor).",
    "CONFIRMED on MUP address-registration procedure page (2026-08-15): TCN on temporary stay must register boravište / address (and changes) within 3 days of entry or of the change (Form 16a). Distinct from short-stay eVisitor self-registration.",
    "UV list: no newer public UV decision PDF found; still shipping official 2023-03 MUP/HZZ PDF with stale-edition banner.",
    "OMITTED: Blue Card validity months (not stated on live MUP Blue Card page / not confirmed in NN 55/2026 excerpt); Blue Card fee schedule (wrong path); seasonal/student numerics; Form 17a field specs.",
    "Case revenue remains case data, not a legal fact — still needs live tax/bank verification before filing.",
  ],
  facts,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
const jsonPath = path.join(OUT_DIR, "facts-audit.json");
const mdPath = path.join(OUT_DIR, "facts-audit.md");
fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2) + "\n");

const lines = [
  "# Facts audit",
  "",
  `Generated: ${auditDate}`,
  `Case: ${payload.caseId}`,
  `Total cited facts: ${payload.factCount} (Tier 1: ${payload.tier1Count}, Tier 2: ${payload.tier2Count})`,
  "",
  "## Notes",
  "",
  ...payload.notes.map((n) => `- ${n}`),
  "",
  "## Claims",
  "",
  "| ID | Value | Label key | Source | Tier | Verified | Age (days) | File |",
  "|---|---|---|---|---:|---|---:|---|",
  ...facts.map(
    (f) =>
      `| ${f.id || "—"} | ${f.value} | ${f.labelKey || "—"} | ${f.sourceName || f.sourceUrl} | ${f.sourceTier} | ${f.verifiedDate} | ${f.ageDaysAsOfAudit ?? "—"} | ${f.file} |`
  ),
  "",
];
fs.writeFileSync(mdPath, lines.join("\n"));

console.log(`facts-audit: wrote ${facts.length} facts → artifacts/facts-audit.json and artifacts/facts-audit.md`);
