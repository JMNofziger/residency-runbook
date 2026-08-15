import { I18n } from "./i18n.js";
import { FactsCatalog, renderFactList } from "./facts.js";

/** Map catalog facts on a check to {deadline}/{fee} locale placeholders. */
function checkFactVars(check) {
  const vars = {};
  let resolved = [];
  try {
    resolved = FactsCatalog.resolve(check.facts || []);
  } catch {
    return vars;
  }
  for (const f of resolved) {
    if (!f || f.value == null) continue;
    const id = String(f.id || "");
    if (/deadline/i.test(id)) vars.deadline = f.value;
    if (/fee/i.test(id) && vars.fee == null) vars.fee = f.value;
  }
  return vars;
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

function caseHintVars(caseData) {
  const e = caseData?.employer || {};
  const regionId = e.hzzRegion || e.policeAdmin || "";
  const regionLabel = regionId ? I18n.t(`uv.regions.${regionId}`) : "";
  return {
    nkd: e.nkd2025 || "",
    nkdLabel: e.nkd2025Label || "",
    region: regionLabel !== `uv.regions.${regionId}` ? regionLabel : regionId,
    regionId,
  };
}

/**
 * Data-driven guided checklist panel (Art. 99 pattern).
 * idPrefix must stay stable for localStorage (e.g. "art99").
 */
export function createGuidedPanel({ url, idPrefix, panelDomId }) {
  return {
    data: null,
    idPrefix,
    panelDomId,

    async load() {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load ${url}`);
      this.data = await res.json();
      return this.data;
    },

    checkIds() {
      return (this.data?.checks || []).map((c) => `${idPrefix}:${c.id}`);
    },

    ownsCheckId(checkId) {
      return String(checkId).startsWith(`${idPrefix}:`);
    },

    allComplete(isChecked) {
      const ids = this.checkIds();
      return ids.length > 0 && ids.every((id) => isChecked(id));
    },

    syncParentChecklist(isChecked, setChecked) {
      if (!this.data?.parentChecklistId) return;
      const parentId = `core:${this.data.parentChecklistId}`;
      setChecked(parentId, this.allComplete(isChecked));
    },

    render(isChecked, caseData) {
      if (!this.data) return "";
      const checks = [...this.data.checks].sort((a, b) => a.order - b.order);
      const done = checks.filter((c) => isChecked(`${idPrefix}:${c.id}`)).length;
      const vars = caseHintVars(caseData);

      return `
      <section class="card guided-panel" id="${escAttr(panelDomId)}" data-guided-prefix="${escAttr(idPrefix)}">
        <div class="panel-head">
          <h3>${esc(I18n.t(this.data.titleKey))}</h3>
          <span class="pill">${esc(I18n.t("guided.progress", { done, total: checks.length }))}</span>
        </div>
        <p class="muted">${esc(I18n.t(this.data.introKey))}</p>
        <p class="muted">
          <a href="${escAttr(this.data.sourceHub.url)}" target="_blank" rel="noopener noreferrer">${esc(
            I18n.t(this.data.sourceHub.labelKey)
          )}</a>
          <span class="fact-tier">${esc(I18n.t("ui.tier", { n: this.data.sourceHub.tier }))}</span>
        </p>
        <ol class="guided-list art99-list">
          ${checks
            .map((check) => {
              const id = `${idPrefix}:${check.id}`;
              const factVars = { ...vars, ...checkFactVars(check) };
              const how = (check.howSteps || [])
                .map((step) => {
                  const label = esc(I18n.t(step.labelKey, factVars));
                  if (step.url) {
                    return `<li><a href="${escAttr(step.url)}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
                  }
                  return `<li>${label}</li>`;
                })
                .join("");
              const hints = (check.caseHintKeys || [])
                .map((key) => `<p class="case-hint">${esc(I18n.t(key, factVars))}</p>`)
                .join("");
              return `
                <li class="guided-item art99-item ${isChecked(id) ? "is-done" : ""}">
                  <div class="guided-item-head art99-item-head">
                    <span class="guided-order art99-order">${check.order}</span>
                    <h4>${esc(I18n.t(check.titleKey, factVars))}</h4>
                  </div>
                  <p>${esc(I18n.t(check.whyKey, factVars))}</p>
                  <div class="guided-how art99-how">
                    <strong>${esc(I18n.t("guided.howLabel"))}</strong>
                    <ol>${how}</ol>
                  </div>
                  <p><strong>${esc(I18n.t("guided.evidenceLabel"))}</strong> ${esc(I18n.t(check.evidenceKey, factVars))}</p>
                  ${hints}
                  ${renderFactList(check.facts || [])}
                  <label class="check-row guided-pass art99-pass">
                    <input type="checkbox" data-check-id="${escAttr(id)}" ${isChecked(id) ? "checked" : ""} />
                    <span>${esc(I18n.t("guided.passLabel"))}</span>
                  </label>
                </li>`;
            })
            .join("")}
        </ol>
      </section>
    `;
    },
  };
}
