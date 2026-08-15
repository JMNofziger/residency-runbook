/** Visual workflow overview (home) — read-only map + navigation into the checklist. */

import { I18n } from "./i18n.js";
import { Uncertainty } from "./uncertainty.js";
import { renderWorkflowGraph, bindWorkflowGraph } from "./workflow-graph.js";

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * @param {object} opts
 * @param {object[]} opts.steps
 * @param {object} opts.progress
 * @param {object} opts.caseData
 * @param {number} opts.stepIndex
 */
export function renderWorkflowOverview({ steps, progress, caseData, stepIndex }) {
  const completed = new Set(progress.completedStepIds || []);
  const path = progress.occupationPath || "labor_market_test";
  const uv = progress.uvCandidate;
  const current = steps[stepIndex];
  const caseTitle = caseData?.title || caseData?.id || "";
  const isUv = path === "uv_skip_candidate";
  const doneCount = completed.size;
  const total = steps.length;

  const branchLabel = isUv
    ? I18n.th("overview.branchUv", { title: uv?.title || "—" })
    : I18n.th("overview.branchLmt");

  const positionText = current
    ? I18n.t("overview.positionAt", { step: I18n.t(current.titleKey), n: doneCount, total })
    : I18n.t("overview.notStarted");

  return `
    <section class="overview-home" id="overview-home">
      <div class="overview-hero">
        <p class="overview-brand">${esc(I18n.t("ui.title"))}</p>
        <p class="overview-kicker">${esc(I18n.t("overview.kicker"))}</p>
        <h2 class="overview-title">${esc(I18n.t("overview.title"))}</h2>
        <p class="overview-lead">${esc(I18n.t("overview.lead"))}</p>
        <dl class="overview-meta">
          <div>
            <dt>${esc(I18n.t("overview.caseLabel"))}</dt>
            <dd>${esc(caseTitle || I18n.t("overview.noCase"))}</dd>
          </div>
          <div>
            <dt>${esc(I18n.t("overview.positionLabel"))}</dt>
            <dd>${esc(positionText)}</dd>
          </div>
          <div>
            <dt>${esc(I18n.t("overview.branchLabel"))}</dt>
            <dd>${branchLabel}</dd>
          </div>
        </dl>
        <div class="overview-cta-row">
          <button type="button" class="btn primary" id="btn-enter-wizard">
            ${esc(
              I18n.t("overview.enterChecklist", {
                step: current ? I18n.t(current.titleKey) : "",
              })
            )}
          </button>
        </div>
      </div>

      ${renderWorkflowGraph({ steps, progress, stepIndex })}

      <div class="flow-legend">
        <span class="leg is-done">${esc(I18n.t("overview.status.done"))}</span>
        <span class="leg is-current">${esc(I18n.t("overview.status.current"))}</span>
        <span class="leg is-locked">${esc(I18n.t("overview.status.locked"))}</span>
        <span class="leg is-upcoming">${esc(I18n.t("overview.status.upcoming"))}</span>
        <span class="leg is-unresolved">${esc(I18n.t("overview.graph.status.unresolved"))}</span>
        <span class="leg is-inactive">${esc(I18n.t("overview.graph.status.inactive"))}</span>
      </div>

      ${Uncertainty.renderOverview()}
    </section>`;
}

/**
 * @param {HTMLElement} root
 * @param {{ steps: object[], progress: object, stepIndex: number, onOpenStep: (index: number) => void }} ctx
 */
export function bindWorkflowOverview(root, ctx) {
  if (!root) return;
  bindWorkflowGraph(root, ctx);
}
