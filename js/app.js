import { I18n } from "./i18n.js";
import { Theme } from "./theme.js";
import { Nationality } from "./nationality.js";
import { FactsCatalog, renderFactList } from "./facts.js";
import { Art99 } from "./art99.js";
import { EmployerPackage } from "./employer-package.js";
import { LmtGuide } from "./lmt-guide.js";
import { OccupationGuide } from "./occupation-guide.js";
import { WorkerDocsGuide } from "./worker-docs-guide.js";
import { FilePermitGuide } from "./file-permit-guide.js";
import { StartWorkGuide } from "./start-work-guide.js";
import { ComplyGuide } from "./comply-guide.js";
import { UvList } from "./uv-list.js";
import { Reference } from "./reference.js";
import { canEnterStep, canMarkStepComplete } from "./step-gates.js";
import { toBundle, downloadBundle, parseFile } from "./case-file.js";
import { Uncertainty } from "./uncertainty.js";
import { renderWorkflowOverview, bindWorkflowOverview } from "./overview.js";
import { WorkflowGraph } from "./workflow-graph.js";

const GUIDED_PANELS = {
  art99: Art99,
  occupation: OccupationGuide,
  "employer-package": EmployerPackage,
  lmt: LmtGuide,
  "worker-docs": WorkerDocsGuide,
  "file-permit": FilePermitGuide,
  "start-work": StartWorkGuide,
  comply: ComplyGuide,
};

function resolveGuidedPanel(step) {
  if (step?.guidedPanel && GUIDED_PANELS[step.guidedPanel]) {
    return GUIDED_PANELS[step.guidedPanel];
  }
  if (step?.showArt99Checks) return GUIDED_PANELS.art99;
  return null;
}

function panelForCheckId(checkId) {
  return Object.values(GUIDED_PANELS).find((p) => p.ownsCheckId(checkId)) || null;
}

function applyParentChecked(parentId, parentChecked) {
  const s = new Set(state.progress.checkedItemIds);
  if (parentChecked) s.add(parentId);
  else s.delete(parentId);
  state.progress.checkedItemIds = [...s];
}

function syncAllGuidedParents() {
  for (const panel of Object.values(GUIDED_PANELS)) {
    panel.syncParentChecklist(isChecked, applyParentChecked);
  }
}

/** Public anonymized fixture (committed). */
const DEFAULT_CASE_PATH = "cases/example-dool-us-manual-labor.json";
/** Local real-case override (gitignored). Prefer this when present. */
const LOCAL_CASE_PATH = "cases/private/active.json";
const CASE_INDEX_PATH = "cases/index.json";
const DEFAULT_LOCALE = "en";
const IMPORTED_PATH_PREFIX = "imported:";

async function loadCaseCatalog() {
  const entries = [];
  try {
    const idx = await fetch(CASE_INDEX_PATH, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
    for (const c of idx?.cases || []) {
      if (c?.id && c?.path) entries.push({ id: c.id, path: c.path, title: c.title || c.id, private: false });
    }
  } catch {
    /* ignore */
  }
  if (!entries.length) {
    entries.push({
      id: "example-dool-us-manual-labor",
      path: DEFAULT_CASE_PATH,
      title: "Example d.o.o. — US citizen, manual event crew (LMT)",
      private: false,
    });
  }
  try {
    const local = await fetch(LOCAL_CASE_PATH, { cache: "no-store" });
    if (local.ok) {
      const data = await local.json();
      entries.unshift({
        id: data.id || "private-active",
        path: LOCAL_CASE_PATH,
        title: data.title || "Private active case",
        private: true,
      });
    }
  } catch {
    /* no private case */
  }
  return entries;
}

async function loadCaseData(path) {
  const entry = (state.caseCatalog || []).find((c) => c.path === path);
  if (entry?.snapshot) return entry.snapshot;
  const target = path || DEFAULT_CASE_PATH;
  const res = await fetch(target, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load case: ${target}`);
  return res.json();
}

function registerImportedCase(caseData) {
  const id = caseData?.id || "imported-case";
  const path = `${IMPORTED_PATH_PREFIX}${id}`;
  const entry = {
    id,
    path,
    title: caseData.title || id,
    private: true,
    imported: true,
    snapshot: caseData,
  };
  state.caseCatalog = (state.caseCatalog || []).filter((c) => !c.imported);
  state.caseCatalog.unshift(entry);
  state.casePath = path;
  return entry;
}

const state = {
  caseData: null,
  caseCatalog: [],
  casePath: DEFAULT_CASE_PATH,
  stepsData: null,
  occupations: null,
  dutyTemplates: null,
  stepIndex: 0,
  progress: null,
  /** @type {'overview' | 'wizard'} */
  view: "overview",
  appReady: false,
  exportNudgeShown: false,
  dirtySinceExport: false,
};

function storageKey() {
  return `residency-runbook:${state.caseData?.id || "default"}`;
}

function normalizeProgress(raw) {
  const base = {
    completedStepIds: [],
    checkedItemIds: [],
    locale: localStorage.getItem("residency-runbook:locale") || DEFAULT_LOCALE,
    theme: Theme.get(),
    selectedOccupationId: null,
    occupationPath: "labor_market_test",
    uvCandidate: null,
    stepIndex: 0,
    view: "overview",
    updatedAt: null,
  };
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    ...raw,
    completedStepIds: Array.isArray(raw.completedStepIds) ? raw.completedStepIds : [],
    checkedItemIds: Array.isArray(raw.checkedItemIds) ? raw.checkedItemIds : [],
    occupationPath: raw.occupationPath === "uv_skip_candidate" ? "uv_skip_candidate" : "labor_market_test",
    uvCandidate: raw.uvCandidate && typeof raw.uvCandidate === "object" ? raw.uvCandidate : null,
    stepIndex: typeof raw.stepIndex === "number" ? raw.stepIndex : 0,
    view: raw.view === "wizard" ? "wizard" : "overview",
  };
}

/** Last-session cache only — export/import is the durable source of truth. */
function loadProgress() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return normalizeProgress(null);
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return normalizeProgress(null);
  }
}

function gateContext() {
  return {
    progress: state.progress,
    isChecked,
    panelsByKey: GUIDED_PANELS,
  };
}

function clampStepIndex(index) {
  const steps = state.stepsData?.steps || [];
  let i = Math.max(0, Math.min(index, Math.max(0, steps.length - 1)));
  while (i > 0 && !canEnterStep(steps, i, state.progress)) i -= 1;
  return i;
}

function ensureOccupationDefaults() {
  if (!state.progress.selectedOccupationId) {
    state.progress.selectedOccupationId =
      state.caseData?.intendedOccupation?.id ||
      state.caseData?.suggestedOccupationIds?.[0] ||
      null;
  }
}

function saveProgress({ nudgeExport = true } = {}) {
  state.progress.updatedAt = new Date().toISOString();
  state.progress.theme = Theme.get();
  state.progress.stepIndex = state.stepIndex;
  state.progress.view = state.view;
  localStorage.setItem(storageKey(), JSON.stringify(state.progress));
  localStorage.setItem("residency-runbook:locale", state.progress.locale);
  if (nudgeExport && state.appReady) {
    state.dirtySinceExport = true;
    if (!state.exportNudgeShown) {
      state.exportNudgeShown = true;
      scheduleExportNudge();
    }
  }
}

let exportNudgeTimer = null;

function scheduleExportNudge() {
  if (exportNudgeTimer) clearTimeout(exportNudgeTimer);
  exportNudgeTimer = setTimeout(() => {
    exportNudgeTimer = null;
    openExportNudge();
  }, 450);
}

function closeExportNudge() {
  document.getElementById("export-nudge")?.remove();
}

function exportCurrentCase(filename) {
  const bundle = toBundle(state.caseData, {
    ...state.progress,
    stepIndex: state.stepIndex,
    view: state.view,
  });
  downloadBundle(bundle, filename || `${bundle.id || "case"}-runbook.json`);
  state.dirtySinceExport = false;
  return bundle;
}

function openExportNudge() {
  if (document.getElementById("export-nudge")) return;
  const host = document.createElement("div");
  host.id = "export-nudge";
  host.className = "export-nudge";
  host.innerHTML = `
    <div class="export-nudge-backdrop" data-export-dismiss></div>
    <div class="export-nudge-panel" role="dialog" aria-modal="true" aria-labelledby="export-nudge-title">
      <h2 id="export-nudge-title">${esc(I18n.t("ui.exportNudgeTitle"))}</h2>
      <p>${esc(I18n.t("ui.exportNudgeBody"))}</p>
      <div class="export-nudge-actions">
        <button type="button" class="btn primary" id="btn-export-nudge-export">${esc(
          I18n.t("ui.exportNudgeExport")
        )}</button>
        <button type="button" class="btn ghost" data-export-dismiss>${esc(
          I18n.t("ui.exportNudgeDismiss")
        )}</button>
      </div>
    </div>`;
  document.body.appendChild(host);
  host.querySelectorAll("[data-export-dismiss]").forEach((el) => {
    el.addEventListener("click", () => closeExportNudge());
  });
  host.querySelector("#btn-export-nudge-export")?.addEventListener("click", () => {
    exportCurrentCase();
    closeExportNudge();
  });
  const onKey = (e) => {
    if (e.key === "Escape") {
      closeExportNudge();
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);
}

function setView(view) {
  state.view = view === "wizard" ? "wizard" : "overview";
  saveProgress();
  render();
}

function enterWizardAt(index) {
  const steps = state.stepsData?.steps || [];
  const idx = clampStepIndex(typeof index === "number" ? index : state.stepIndex);
  if (!canEnterStep(steps, idx, state.progress) && idx !== 0) return;
  state.stepIndex = idx;
  setView("wizard");
}

const THEME_ICON_SUN = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
const THEME_ICON_MOON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"/></svg>`;

function updateThemeToggle() {
  const btn = document.getElementById("btn-theme");
  if (!btn) return;
  const dark = Theme.get() === "dark";
  // Show the target mode icon (sun → light, moon → dark).
  const icon = btn.querySelector(".theme-icon");
  if (icon) icon.innerHTML = dark ? THEME_ICON_SUN : THEME_ICON_MOON;
  btn.setAttribute("aria-label", dark ? I18n.t("ui.themeToLight") : I18n.t("ui.themeToDark"));
  btn.title = dark ? I18n.t("ui.themeToLight") : I18n.t("ui.themeToDark");
}

function caseExportBasename() {
  return `${state.caseData?.id || "case"}-runbook`;
}

function backupFilename(basename = caseExportBasename()) {
  const date = new Date().toISOString().slice(0, 10);
  return `${basename}_${date}_BAK.json`;
}

function downloadCurrentCaseBackup() {
  exportCurrentCase(backupFilename(`${state.caseData?.id || "case"}-runbook`));
}

function doResetProgress() {
  state.progress.completedStepIds = [];
  state.progress.checkedItemIds = [];
  state.progress.selectedOccupationId =
    state.caseData?.intendedOccupation?.id || state.caseData?.suggestedOccupationIds?.[0] || null;
  state.progress.occupationPath = "labor_market_test";
  state.progress.uvCandidate = null;
  state.progress.stepIndex = 0;
  state.progress.view = "overview";
  state.stepIndex = 0;
  state.view = "overview";
  saveProgress();
  render();
}

function closeResetDialog() {
  document.getElementById("reset-dialog")?.remove();
}

function openResetDialog() {
  closeResetDialog();
  const host = document.createElement("div");
  host.id = "reset-dialog";
  host.className = "reset-dialog";
  host.innerHTML = `
    <div class="reset-backdrop" data-reset-cancel></div>
    <div class="reset-panel" role="dialog" aria-modal="true" aria-labelledby="reset-dialog-title">
      <h2 id="reset-dialog-title">${esc(I18n.t("ui.resetDialogTitle"))}</h2>
      <p>${esc(I18n.t("ui.resetWarn"))}</p>
      <p class="muted">${esc(I18n.t("ui.resetBackupPrompt"))}</p>
      <div class="reset-actions">
        <button type="button" class="btn primary" id="btn-reset-backup">${esc(
          I18n.t("ui.resetDownloadBackup")
        )}</button>
        <button type="button" class="btn danger-outline" id="btn-reset-confirm">${esc(
          I18n.t("ui.resetConfirmAction")
        )}</button>
        <button type="button" class="btn ghost" data-reset-cancel>${esc(I18n.t("ui.resetCancel"))}</button>
      </div>
    </div>`;
  document.body.appendChild(host);
  host.querySelectorAll("[data-reset-cancel]").forEach((el) => {
    el.addEventListener("click", () => closeResetDialog());
  });
  host.querySelector("#btn-reset-backup")?.addEventListener("click", () => {
    downloadCurrentCaseBackup();
  });
  host.querySelector("#btn-reset-confirm")?.addEventListener("click", () => {
    closeResetDialog();
    doResetProgress();
  });
  const onKey = (e) => {
    if (e.key === "Escape") {
      closeResetDialog();
      document.removeEventListener("keydown", onKey);
    }
  };
  document.addEventListener("keydown", onKey);
}

function isChecked(id) {
  return state.progress.checkedItemIds.includes(id);
}

function setChecked(id, checked) {
  const set = new Set(state.progress.checkedItemIds);
  if (checked) set.add(id);
  else set.delete(id);
  state.progress.checkedItemIds = [...set];
  const panel = panelForCheckId(id);
  if (panel) {
    panel.syncParentChecklist(isChecked, applyParentChecked);
  }
  reconcileStepCompletion();
  saveProgress();
}

/**
 * Keep completedStepIds a contiguous prefix of steps whose gates still pass.
 * Unchecking a guided item or un-completing an earlier step revokes later unlocks.
 */
function reconcileStepCompletion() {
  const steps = state.stepsData?.steps || [];
  if (!steps.length || !state.progress) return;
  const prev = new Set(state.progress.completedStepIds || []);
  const next = [];
  for (const step of steps) {
    if (!prev.has(step.id)) break;
    const ctx = {
      progress: { ...state.progress, completedStepIds: next },
      isChecked,
      panelsByKey: GUIDED_PANELS,
    };
    if (!canMarkStepComplete(step, ctx).ok) break;
    next.push(step.id);
  }
  state.progress.completedStepIds = next;
  state.stepIndex = clampStepIndex(state.stepIndex);
}

function currentStep() {
  return state.stepsData.steps[state.stepIndex];
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escAttr(s) {
  return esc(s).replaceAll("'", "&#39;");
}

function formatEur(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(I18n.locale === "hr" ? "hr-HR" : "en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function renderEmployerCard() {
  const e = state.caseData.employer;
  return `
    <section class="card employer-card">
      <h3>${esc(I18n.t("ui.employer"))}</h3>
      <p class="employer-name">${esc(e.name)}</p>
      <dl class="meta-grid">
        <div><dt>${esc(I18n.t("ui.address"))}</dt><dd>${esc(e.address)}</dd></div>
        <div><dt>${esc(I18n.t("ui.oib"))}</dt><dd>${esc(e.oib)}</dd></div>
        <div><dt>${esc(I18n.t("ui.mb"))}</dt><dd>${esc(e.mb)}</dd></div>
        <div><dt>${esc(I18n.t("ui.nkd"))}</dt><dd>${esc(e.nkd2025)} · ${esc(e.nkd2025Label)}</dd></div>
        <div><dt>${esc(I18n.t("ui.representative"))}</dt><dd>${esc(e.representative)}</dd></div>
        <div><dt>${esc(I18n.t("ui.employeesApprox"))}</dt><dd>${esc(String(e.employeesApprox))}</dd></div>
        <div><dt>${esc(I18n.t("ui.revenueReported"))}</dt><dd>${esc(formatEur(e.revenue2025Eur))}</dd></div>
      </dl>
      <a class="inline-link" href="${escAttr(e.finaUrl)}" target="_blank" rel="noopener noreferrer">${esc(
        I18n.t("ui.fina")
      )}</a>
    </section>
  `;
}

function renderCaseRisks(stepId) {
  const flags = (state.caseData.riskFlags || []).filter((f) => (f.stepIds || []).includes(stepId));
  if (!flags.length) return "";
  return `
    <section class="card risk-card">
      <h3>${esc(I18n.t("ui.caseRisks"))}</h3>
      <ul class="risk-list">
        ${flags
          .map(
            (f) => `
          <li>
            <p>${esc(I18n.t(f.severityKey))}</p>
            ${renderFactList(f.facts || [])}
          </li>`
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderOccupations() {
  const nkd = state.caseData.employer.nkd2025;
  const block = state.occupations.byNkd?.[nkd];
  if (!block) return "";
  const suggested = new Set(state.caseData.suggestedOccupationIds || []);
  const selectedId = state.progress.selectedOccupationId;
  return `
    <section class="card occupations-card" id="occupations-panel">
      <h3>${esc(I18n.t("ui.occupations"))}</h3>
      <p class="muted">${esc(I18n.t(block.noteKey))}</p>
      <ul class="occupation-list">
        ${block.occupations
          .map((occ) => {
            const catalogPrimary = occ.primary || suggested.has(occ.id);
            const selected = occ.id === selectedId;
            const fit = I18n.t(`ui.defensibility.${occ.defensibility}`);
            return `
              <li class="${selected ? "is-selected" : ""} ${catalogPrimary ? "is-primary" : ""}">
                <div class="occ-title">
                  ${esc(I18n.t(occ.titleKey))}
                  ${selected ? `<span class="pill">${esc(I18n.t("ui.selected"))}</span>` : ""}
                  ${!selected && catalogPrimary ? `<span class="pill muted-pill">${esc(I18n.t("ui.primary"))}</span>` : ""}
                </div>
                <p>${esc(I18n.t(occ.blurbKey))}</p>
                <span class="occ-fit">${esc(I18n.t("ui.defensibility"))}: ${esc(fit)}</span>
                <button type="button" class="btn ${selected ? "done" : "accent"} occ-select-btn"
                  data-select-occupation="${escAttr(occ.id)}">
                  ${esc(I18n.t("ui.selectOccupation"))}
                </button>
              </li>`;
          })
          .join("")}
      </ul>
      <p class="muted">${esc(I18n.t(block.uvListReminderKey))}</p>
    </section>
  `;
}

function renderDutyTemplate() {
  const occId = state.progress.selectedOccupationId;
  const tpl = occId ? state.dutyTemplates?.byOccupationId?.[occId] : null;
  const path = state.progress.occupationPath || "labor_market_test";
  const uv = state.progress.uvCandidate;
  let body = `<p class="muted">${esc(I18n.t("ui.dutyTemplateEmpty"))}</p>`;
  if (tpl) {
    body = `
      <p>${esc(I18n.t(tpl.introKey))}</p>
      <ul class="duty-bullets">
        ${(tpl.bulletKeys || []).map((k) => `<li>${esc(I18n.t(k))}</li>`).join("")}
      </ul>`;
  }
  return `
    <section class="card duty-template-card" id="duty-template-panel">
      <h3>${esc(I18n.t("ui.dutyTemplate"))}</h3>
      ${body}
      <fieldset class="path-decision">
        <legend>${esc(I18n.t("ui.pathDecision"))}</legend>
        <label class="check-row">
          <input type="radio" name="occupation-path" value="labor_market_test" ${
            path === "labor_market_test" ? "checked" : ""
          } />
          <span>${I18n.th("ui.pathLmt")}</span>
        </label>
        <label class="check-row">
          <input type="radio" name="occupation-path" value="uv_skip_candidate" ${
            path === "uv_skip_candidate" ? "checked" : ""
          } />
          <span>${I18n.th("ui.pathUvCandidate")}</span>
        </label>
      </fieldset>
      ${
        uv
          ? `<p class="case-hint">${I18n.th("ui.uvCandidateChipHtml", { title: uv.title })}
              <button type="button" class="btn ghost" id="btn-clear-uv-candidate">${I18n.th(
                "ui.uvClearCandidate"
              )}</button>
            </p>`
          : ""
      }
    </section>
  `;
}

function renderSections(step) {
  return (step.sections || [])
    .map((sec) => {
      return `
        <section class="content-section">
          <h3>${esc(I18n.t(sec.titleKey))}</h3>
          <p>${esc(I18n.t(sec.bodyKey))}</p>
          ${renderFactList(sec.facts || [])}
        </section>`;
    })
    .join("");
}

function renderChecklist(step) {
  const items = step.checklist || [];
  if (!items.length) return "";
  return `
    <section class="card checklist-card">
      <h3>${esc(I18n.t("ui.checklist"))}</h3>
      <ul class="checklist">
        ${items
          .map((item) => {
            const id = `core:${item.id}`;
            return `
              <li>
                <label class="check-row">
                  <input type="checkbox" data-check-id="${escAttr(id)}" ${isChecked(id) ? "checked" : ""} />
                  <span>${esc(I18n.t(item.labelKey))}</span>
                </label>
              </li>`;
          })
          .join("")}
      </ul>
    </section>
  `;
}

function renderSources(step) {
  const sources = step.sources || [];
  if (!sources.length) return "";
  return `
    <section class="card sources-card">
      <h3>${esc(I18n.t("ui.sources"))}</h3>
      <ul class="source-list">
        ${sources
          .map(
            (s) => `
          <li>
            <a href="${escAttr(s.url)}" target="_blank" rel="noopener noreferrer">${esc(I18n.t(s.labelKey))}</a>
            <span class="fact-tier">${esc(I18n.t("ui.tier", { n: s.tier }))}</span>
          </li>`
          )
          .join("")}
      </ul>
    </section>
  `;
}

function renderStepNav() {
  const steps = state.stepsData.steps;
  return steps
    .map((s, i) => {
      const done = state.progress.completedStepIds.includes(s.id);
      const active = i === state.stepIndex;
      const locked = !canEnterStep(steps, i, state.progress);
      return `
        <button type="button" class="step-nav-item ${active ? "is-active" : ""} ${done ? "is-done" : ""} ${
          locked ? "is-locked" : ""
        }"
          data-step-index="${i}" ${locked ? "disabled" : ""}
          title="${locked ? escAttr(I18n.t("ui.stepLockedShort")) : ""}"
          aria-current="${active ? "step" : "false"}">
          <span class="step-num">${s.order}</span>
          <span class="step-label">${esc(I18n.t(s.titleKey))}</span>
        </button>`;
    })
    .join("");
}

function renderGateBanner(step) {
  const { ok, unmet } = canMarkStepComplete(step, gateContext());
  if (ok) return "";
  return `
    <aside class="gate-banner" role="status">
      <p>${esc(I18n.t("ui.stepLocked"))}</p>
      <ul>
        ${unmet.map((u) => `<li>${I18n.th(u.labelKey)}</li>`).join("")}
      </ul>
    </aside>`;
}

function renderOverviewMain() {
  document.getElementById("step-nav").innerHTML = renderStepNav();
  document.getElementById("mobile-progress").textContent = I18n.t("ui.overview");
  document.getElementById("main-panel").innerHTML = renderWorkflowOverview({
    steps: state.stepsData.steps,
    progress: state.progress,
    caseData: state.caseData,
    stepIndex: state.stepIndex,
    panels: GUIDED_PANELS,
  });

  document.getElementById("btn-enter-wizard")?.addEventListener("click", () => {
    enterWizardAt(state.stepIndex);
  });
  bindWorkflowOverview(document.getElementById("overview-home"), {
    steps: state.stepsData.steps,
    progress: state.progress,
    stepIndex: state.stepIndex,
    panels: GUIDED_PANELS,
    onOpenStep: (index) => {
      if (!canEnterStep(state.stepsData.steps, index, state.progress)) return;
      enterWizardAt(index);
    },
  });
}

function renderWizardMain() {
  const step = currentStep();
  const completed = state.progress.completedStepIds.includes(step.id);
  const gate = canMarkStepComplete(step, gateContext());
  const slots = step.nationalitySlots || [];
  const nationalityHtml = slots.map((id) => Nationality.renderSlot(id, isChecked, setChecked)).join("");
  const steps = state.stepsData.steps;
  const canGoNext =
    state.stepIndex < steps.length - 1 &&
    completed &&
    canEnterStep(steps, state.stepIndex + 1, state.progress);

  document.getElementById("step-nav").innerHTML = renderStepNav();
  document.getElementById("mobile-progress").textContent = `${I18n.t("ui.progress")}: ${step.order}/${
    state.stepsData.steps.length
  }`;

  document.getElementById("main-panel").innerHTML = `
    <header class="step-header">
      <p class="eyebrow">${I18n.th("ui.pathLmt")}
        <button type="button" class="term-chip" data-open-term="lmt">${I18n.th("ui.whatIsLmt")}</button>
        <button type="button" class="term-chip" data-open-term="single-permit">${esc(I18n.t("ui.whatIsPermit"))}</button>
      </p>
      <h2>${esc(I18n.t(step.titleKey))}</h2>
      <p class="step-summary">${esc(I18n.t(step.summaryKey))}</p>
    </header>
    ${renderGateBanner(step)}
    ${Uncertainty.renderForStep(step.id)}
    ${step.showEmployerCard ? renderEmployerCard() : ""}
    ${step.showCaseRisks ? renderCaseRisks(step.id) : ""}
    ${renderSections(step)}
    ${step.showOccupations ? renderOccupations() : ""}
    ${step.showDutyTemplate ? renderDutyTemplate() : ""}
    ${step.showUvList ? UvList.render(state.caseData, state.progress.uvCandidate) : ""}
    ${resolveGuidedPanel(step)?.render(isChecked, state.caseData) || ""}
    ${nationalityHtml}
    ${renderChecklist(step)}
    ${Reference.renderStepOffices(step.id)}
    ${renderSources(step)}
    <footer class="step-actions">
      <button type="button" class="btn ghost" id="btn-prev" ${state.stepIndex === 0 ? "disabled" : ""}>${esc(
        I18n.t("ui.prev")
      )}</button>
      <button type="button" class="btn ${completed ? "done" : "accent"}" id="btn-complete"
        ${!completed && !gate.ok ? "disabled" : ""}
        title="${!completed && !gate.ok ? escAttr(I18n.t("ui.cannotComplete")) : ""}">
        ${esc(completed ? I18n.t("ui.stepComplete") : I18n.t("ui.markComplete"))}
      </button>
      <button type="button" class="btn primary" id="btn-next" ${canGoNext ? "" : "disabled"}>${esc(
        I18n.t("ui.next")
      )}</button>
    </footer>
  `;

  if (step.showUvList) {
    UvList.afterMount(document.getElementById("uv-panel"), state.caseData, {
      uvCandidate: state.progress.uvCandidate,
      onMarkCandidate: (candidate) => {
        state.progress.uvCandidate = candidate;
        state.progress.occupationPath = "uv_skip_candidate";
        saveProgress();
        render();
      },
    });
  }

  document.querySelectorAll("[data-select-occupation]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.progress.selectedOccupationId = btn.getAttribute("data-select-occupation");
      saveProgress();
      render();
    });
  });

  document.querySelectorAll('input[name="occupation-path"]').forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      state.progress.occupationPath = input.value;
      saveProgress();
      render();
    });
  });

  document.getElementById("btn-clear-uv-candidate")?.addEventListener("click", () => {
    state.progress.uvCandidate = null;
    state.progress.occupationPath = "labor_market_test";
    saveProgress();
    render();
  });

  document.querySelectorAll("[data-open-reference]").forEach((btn) => {
    btn.addEventListener("click", () => Reference.open(btn.getAttribute("data-open-reference")));
  });
  document.querySelectorAll("[data-open-office]").forEach((btn) => {
    btn.addEventListener("click", () => Reference.open("offices", btn.getAttribute("data-open-office")));
  });
  document.querySelectorAll("[data-open-term]").forEach((btn) => {
    btn.addEventListener("click", () => Reference.open("glossary", btn.getAttribute("data-open-term")));
  });

  document.getElementById("btn-prev")?.addEventListener("click", () => {
    state.stepIndex = Math.max(0, state.stepIndex - 1);
    saveProgress();
    render();
  });
  document.getElementById("btn-next")?.addEventListener("click", () => {
    const next = state.stepIndex + 1;
    if (!canEnterStep(state.stepsData.steps, next, state.progress)) return;
    state.stepIndex = Math.min(state.stepsData.steps.length - 1, next);
    saveProgress();
    render();
  });
  document.getElementById("btn-complete")?.addEventListener("click", () => {
    const set = new Set(state.progress.completedStepIds);
    if (set.has(step.id)) {
      set.delete(step.id);
      state.progress.completedStepIds = [...set];
      reconcileStepCompletion();
    } else {
      const gateNow = canMarkStepComplete(step, gateContext());
      if (!gateNow.ok) return;
      set.add(step.id);
      state.progress.completedStepIds = [...set];
      reconcileStepCompletion();
    }
    saveProgress();
    render();
  });
}

function renderMain() {
  if (state.view === "overview") renderOverviewMain();
  else renderWizardMain();
}

function renderChrome() {
  document.getElementById("app-title").textContent = I18n.t("ui.title");
  document.getElementById("app-subtitle").textContent = I18n.t("ui.subtitle");
  document.getElementById("btn-lang-en").textContent = I18n.t("ui.langEn");
  document.getElementById("btn-lang-hr").textContent = I18n.t("ui.langHr");
  updateThemeToggle();
  document.getElementById("btn-reset") && (document.getElementById("btn-reset").textContent = I18n.t("ui.reset"));
  document.getElementById("btn-export") && (document.getElementById("btn-export").textContent = I18n.t("ui.exportCase"));
  const importText = document.getElementById("btn-import-text");
  if (importText) importText.textContent = I18n.t("ui.importCase");
  document.getElementById("btn-glossary").textContent = I18n.t("ui.glossary");
  document.getElementById("btn-offices").textContent = I18n.t("ui.addressBook");
  document.getElementById("nationality-chip").textContent = `${I18n.t("ui.nationality")}: ${Nationality.chipLabel()}`;
  document.getElementById("footer-disclaimer").textContent = I18n.t("ui.disclaimer");
  document.getElementById("footer-glossary").textContent = I18n.t("ui.glossary");
  document.getElementById("footer-offices").textContent = I18n.t("ui.addressBook");
  document.getElementById("footer-sources-link").textContent = I18n.t("ui.sourceRegistry");
  const footerOverview = document.getElementById("footer-overview");
  if (footerOverview) {
    footerOverview.textContent =
      state.view === "overview" ? I18n.t("ui.openChecklist") : I18n.t("ui.backToOverview");
  }
  document.getElementById("nav-heading").textContent = I18n.t("ui.steps");
  const caseHeading = document.getElementById("case-picker-heading");
  if (caseHeading) caseHeading.textContent = I18n.t("ui.casePicker");
  const picker = document.getElementById("case-picker");
  if (picker) {
    picker.innerHTML = (state.caseCatalog || [])
      .map((c) => {
        let label = c.title;
        if (c.imported) label = `${c.title} (${I18n.t("ui.importedCase")})`;
        else if (c.private) label = `${c.title} (${I18n.t("ui.privateCase")})`;
        const selected = c.path === state.casePath ? "selected" : "";
        return `<option value="${escAttr(c.path)}" ${selected}>${esc(label)}</option>`;
      })
      .join("");
  }
  const mobileNav = document.getElementById("btn-mobile-nav");
  if (mobileNav) mobileNav.textContent = I18n.t("ui.mobileMenu");
  document.getElementById("btn-lang-en").classList.toggle("is-active", state.progress.locale === "en");
  document.getElementById("btn-lang-hr").classList.toggle("is-active", state.progress.locale === "hr");

  const btnOverview = document.getElementById("btn-overview");
  if (btnOverview) {
    btnOverview.textContent =
      state.view === "overview" ? I18n.t("ui.openChecklist") : I18n.t("ui.overview");
    btnOverview.classList.toggle("is-active-view", state.view === "overview");
  }
  document.getElementById("app-shell")?.classList.toggle("is-overview", state.view === "overview");
  document.getElementById("app-shell")?.classList.toggle("is-wizard", state.view === "wizard");
}

async function applyImportedBundle(caseData, progress) {
  registerImportedCase(caseData);
  state.caseData = caseData;
  state.progress = normalizeProgress({
    ...progress,
    locale: progress.locale || state.progress?.locale || DEFAULT_LOCALE,
    theme: Theme.get(),
  });
  ensureOccupationDefaults();
  await Nationality.load(caseData.worker.nationalityId);
  await I18n.load(state.progress.locale || DEFAULT_LOCALE, caseData.worker.nationalityId);
  syncAllGuidedParents();
  reconcileStepCompletion();
  state.stepIndex = clampStepIndex(state.progress.stepIndex || 0);
  state.view = state.progress.view === "wizard" ? "wizard" : "overview";
  // Imported file is already durable — don't treat import as unsaved dirty work.
  state.dirtySinceExport = false;
  saveProgress({ nudgeExport: false });
  render();
}

async function switchCase(path) {
  if (!path || path === state.casePath) return;
  const caseData = await loadCaseData(path);
  state.casePath = path;
  state.caseData = caseData;
  // Keep imported snapshot entry selected path if switching to it
  const entry = (state.caseCatalog || []).find((c) => c.path === path);
  if (entry?.imported) entry.snapshot = caseData;
  state.progress = loadProgress();
  ensureOccupationDefaults();
  await Nationality.load(caseData.worker.nationalityId);
  await I18n.load(state.progress.locale || DEFAULT_LOCALE, caseData.worker.nationalityId);
  syncAllGuidedParents();
  reconcileStepCompletion();
  state.stepIndex = clampStepIndex(state.progress.stepIndex || 0);
  state.view = state.progress.view === "wizard" ? "wizard" : "overview";
  state.dirtySinceExport = false;
  saveProgress({ nudgeExport: false });
  render();
}

function render() {
  renderChrome();
  renderMain();
}

async function setLocale(locale) {
  state.progress.locale = locale;
  await I18n.load(locale, state.caseData.worker.nationalityId);
  saveProgress({ nudgeExport: false });
  render();
}

function bindGlobal() {
  document.getElementById("btn-lang-en").addEventListener("click", () => setLocale("en"));
  document.getElementById("btn-lang-hr").addEventListener("click", () => setLocale("hr"));
  document.getElementById("btn-theme").addEventListener("click", () => {
    Theme.toggle();
    saveProgress({ nudgeExport: false });
    renderChrome();
  });
  document.getElementById("btn-glossary")?.addEventListener("click", () => Reference.open("glossary"));
  document.getElementById("btn-offices")?.addEventListener("click", () => Reference.open("offices"));
  document.getElementById("footer-glossary")?.addEventListener("click", (e) => {
    e.preventDefault();
    Reference.open("glossary");
  });
  document.getElementById("footer-offices")?.addEventListener("click", (e) => {
    e.preventDefault();
    Reference.open("offices");
  });
  document.getElementById("btn-overview")?.addEventListener("click", () => {
    if (state.view === "overview") enterWizardAt(state.stepIndex);
    else setView("overview");
  });
  document.getElementById("footer-overview")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (state.view === "overview") enterWizardAt(state.stepIndex);
    else setView("overview");
  });
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    openResetDialog();
  });
  document.getElementById("btn-export")?.addEventListener("click", () => {
    exportCurrentCase();
  });
  document.getElementById("btn-import")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { caseData, progress } = await parseFile(file);
      await applyImportedBundle(caseData, progress);
    } catch (err) {
      console.error(err);
      alert(I18n.t("ui.importError"));
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (!state.dirtySinceExport) return;
    e.preventDefault();
    e.returnValue = "";
  });
  document.getElementById("step-nav").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-step-index]");
    if (!btn || btn.disabled) return;
    const idx = Number(btn.dataset.stepIndex);
    if (!canEnterStep(state.stepsData.steps, idx, state.progress)) return;
    state.stepIndex = idx;
    state.view = "wizard";
    saveProgress();
    render();
  });
  document.getElementById("main-panel").addEventListener("change", (e) => {
    const input = e.target;
    if (input?.matches?.('input[type="checkbox"][data-check-id]')) {
      setChecked(input.dataset.checkId, input.checked);
      render();
    }
  });
  document.getElementById("btn-mobile-nav")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("is-open");
  });
  document.getElementById("case-picker")?.addEventListener("change", async (e) => {
    try {
      await switchCase(e.target.value);
    } catch (err) {
      console.error(err);
      alert(I18n.t("ui.errorLoad"));
    }
  });
}

async function init() {
  Theme.init();
  const loading = document.getElementById("loading-state");
  try {
    const catalog = await loadCaseCatalog();
    state.caseCatalog = catalog;
    state.casePath = catalog[0]?.path || DEFAULT_CASE_PATH;
    const [caseData, stepsData, occupations, dutyTemplates] = await Promise.all([
      loadCaseData(state.casePath),
      fetch("data/steps.json").then((r) => r.json()),
      fetch("data/occupations.json").then((r) => r.json()),
      fetch("data/duty-templates.json").then((r) => r.json()),
      ...Object.values(GUIDED_PANELS).map((p) => p.load()),
      UvList.load(),
      Reference.load(),
      Uncertainty.load(),
      FactsCatalog.load(),
      WorkflowGraph.load(),
    ]);
    state.caseData = caseData;
    state.stepsData = stepsData;
    state.occupations = occupations;
    state.dutyTemplates = dutyTemplates;
    state.progress = loadProgress();
    ensureOccupationDefaults();
    Theme.apply(state.progress.theme || Theme.get());
    await Nationality.load(caseData.worker.nationalityId);
    await I18n.load(state.progress.locale || DEFAULT_LOCALE, caseData.worker.nationalityId);
    syncAllGuidedParents();
    reconcileStepCompletion();
    state.stepIndex = clampStepIndex(state.progress.stepIndex || 0);
    state.view = state.progress.view === "wizard" ? "wizard" : "overview";
    saveProgress({ nudgeExport: false });
    bindGlobal();
    loading.hidden = true;
    document.getElementById("app-shell").hidden = false;
    state.appReady = true;
    render();
  } catch (err) {
    console.error(err);
    loading.textContent = I18n.core?.ui?.errorLoad || "Could not load wizard data. Serve over HTTP (see README).";
  }
}

init();
