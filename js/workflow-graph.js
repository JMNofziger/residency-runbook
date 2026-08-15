/** Read-only node-and-connection workflow map (HTML nodes + SVG edges). */

import { I18n } from "./i18n.js";
import { canEnterStep } from "./step-gates.js";

/** @type {object|null} */
let graphData = null;
let selectedId = null;
let camera = { x: 0, y: 0, scale: 1, userMoved: false };

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

export const WorkflowGraph = {
  async load() {
    const res = await fetch("data/workflow-graph.json");
    if (!res.ok) throw new Error("Failed to load workflow-graph.json");
    graphData = await res.json();
    return graphData;
  },

  data() {
    return graphData;
  },
};

function nodeById(id) {
  return (graphData?.nodes || []).find((n) => n.id === id) || null;
}

function stepIndexOf(steps, stepId) {
  return (steps || []).findIndex((s) => s.id === stepId);
}

function stepStatus(stepId, steps, progress, stepIndex) {
  const i = stepIndexOf(steps, stepId);
  if (i < 0) return "upcoming";
  const done = (progress.completedStepIds || []).includes(stepId);
  const locked = !canEnterStep(steps, i, progress);
  if (done) return "done";
  if (i === stepIndex) return "current";
  if (locked) return "locked";
  return "upcoming";
}

/**
 * Live display status. Never written back to JSON or case files.
 * @returns {{ status: string, inactive: boolean, unresolved: boolean }}
 */
export function resolveNodeState(node, { steps, progress, stepIndex }) {
  const path = progress.occupationPath || "labor_market_test";
  const pathDecided = path === "labor_market_test" || path === "uv_skip_candidate";
  const isUv = path === "uv_skip_candidate";

  if (node.kind === "decision") {
    const occ = stepStatus("occupation", steps, progress, stepIndex);
    if (!pathDecided) {
      return { status: occ === "locked" ? "locked" : occ === "done" ? "current" : occ, inactive: false, unresolved: occ !== "locked" };
    }
    return { status: occ === "locked" ? "locked" : "done", inactive: false, unresolved: false };
  }

  if (node.branch === "lmt") {
    if (isUv) return { status: "done", inactive: true, unresolved: false };
    return { status: stepStatus("lmt", steps, progress, stepIndex), inactive: false, unresolved: false };
  }

  if (node.branch === "uv") {
    if (!pathDecided) {
      const occ = stepStatus("occupation", steps, progress, stepIndex);
      return { status: occ === "locked" ? "locked" : "upcoming", inactive: false, unresolved: true };
    }
    if (isUv) return { status: "done", inactive: false, unresolved: false };
    return { status: "done", inactive: true, unresolved: false };
  }

  if (node.kind === "join") {
    return { status: stepStatus("worker-docs", steps, progress, stepIndex), inactive: false, unresolved: false };
  }

  if (node.stepId) {
    return { status: stepStatus(node.stepId, steps, progress, stepIndex), inactive: false, unresolved: false };
  }
  return { status: "upcoming", inactive: false, unresolved: false };
}

function edgePath(from, to) {
  const x1 = from.x + from.w;
  const y1 = from.y + from.h / 2;
  const x2 = to.x;
  const y2 = to.y + to.h / 2;
  const dx = Math.max(48, Math.abs(x2 - x1) * 0.45);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function applyCamera(world) {
  if (!world) return;
  world.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
}

function fitCamera(viewport) {
  if (!viewport || !graphData) return;
  const pad = 48;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const ww = graphData.canvas.width;
  const wh = graphData.canvas.height;
  if (vw < 40 || vh < 40) return;
  const scale = Math.min((vw - pad) / ww, (vh - pad) / wh, 1.05);
  camera.scale = Math.max(0.32, scale);
  camera.x = (vw - ww * camera.scale) / 2;
  camera.y = (vh - wh * camera.scale) / 2;
  camera.userMoved = false;
  applyCamera(viewport.querySelector(".graph-world"));
}

function zoomAt(viewport, factor, cx, cy) {
  const world = viewport.querySelector(".graph-world");
  if (!world) return;
  const rect = viewport.getBoundingClientRect();
  const px = cx - rect.left;
  const py = cy - rect.top;
  const next = Math.min(1.85, Math.max(0.32, camera.scale * factor));
  const wx = (px - camera.x) / camera.scale;
  const wy = (py - camera.y) / camera.scale;
  camera.scale = next;
  camera.x = px - wx * camera.scale;
  camera.y = py - wy * camera.scale;
  camera.userMoved = true;
  applyCamera(world);
}

function renderEdges(nodes, progress) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const path = progress.occupationPath || "labor_market_test";
  const isUv = path === "uv_skip_candidate";
  return (graphData.edges || [])
    .map((e) => {
      const from = byId[e.from];
      const to = byId[e.to];
      if (!from || !to) return "";
      let cls = "graph-edge";
      if (e.branch === "lmt" && isUv) cls += " is-inactive";
      if (e.branch === "uv" && path === "labor_market_test") cls += " is-inactive";
      if (e.branch) cls += ` is-branch-${e.branch}`;
      return `<path class="${cls}" d="${edgePath(from, to)}" marker-end="url(#graph-arrow)" />`;
    })
    .join("");
}

function renderNode(node, state) {
  const title = I18n.t(node.titleKey);
  const kind = I18n.t(`overview.graph.kind.${node.kind}`);
  const statusLabel = state.unresolved
    ? I18n.t("overview.graph.status.unresolved")
    : state.inactive
      ? I18n.t("overview.graph.status.inactive")
      : I18n.t(`overview.status.${state.status}`);
  const selected = selectedId === node.id ? "is-selected" : "";
  return `
    <article
      class="graph-node is-${node.kind} is-${state.status} ${state.inactive ? "is-inactive" : ""} ${state.unresolved ? "is-unresolved" : ""} ${selected}"
      style="left:${node.x}px;top:${node.y}px;width:${node.w}px;height:${node.h}px"
      data-graph-node="${escAttr(node.id)}"
    >
      <button type="button" class="graph-node-hit" data-graph-select="${escAttr(node.id)}" aria-pressed="${selectedId === node.id}">
        <span class="graph-node-kind">${esc(kind)}</span>
        <span class="graph-node-title">${esc(title)}</span>
        <span class="graph-node-status">${esc(statusLabel)}</span>
      </button>
      <button type="button" class="graph-node-info" data-graph-select="${escAttr(node.id)}" title="${escAttr(I18n.t("overview.graph.details"))}" aria-label="${escAttr(I18n.t("overview.graph.details"))}">i</button>
    </article>`;
}

function checklistSnapshot(step, progress) {
  const items = step?.checklist || [];
  if (!items.length) return "";
  const rows = items
    .map((item) => {
      const id = `core:${item.id}`;
      const on = (progress.checkedItemIds || []).includes(id);
      return `<li class="${on ? "is-on" : ""}"><span class="graph-check-mark" aria-hidden="true">${on ? "✓" : "○"}</span>${esc(I18n.t(item.labelKey))}</li>`;
    })
    .join("");
  return `
    <div class="graph-inspector-block">
      <h4>${esc(I18n.t("overview.graph.checklist"))}</h4>
      <ul class="graph-read-checks">${rows}</ul>
      <p class="muted graph-read-hint">${esc(I18n.t("overview.graph.readOnlyChecks"))}</p>
    </div>`;
}

function inspectorHtml(node, ctx) {
  if (!node) {
    return `
      <div class="graph-inspector-empty">
        <p>${esc(I18n.t("overview.graph.inspectorEmpty"))}</p>
      </div>`;
  }
  const state = resolveNodeState(node, ctx);
  const step = ctx.steps.find((s) => s.id === node.stepId);
  const stepIdx = stepIndexOf(ctx.steps, node.stepId);
  const canOpen = stepIdx >= 0 && canEnterStep(ctx.steps, stepIdx, ctx.progress);
  const statusLabel = state.unresolved
    ? I18n.t("overview.graph.status.unresolved")
    : state.inactive
      ? I18n.t("overview.graph.status.inactive")
      : I18n.t(`overview.status.${state.status}`);
  const links = (node.links || [])
    .map(
      (l) =>
        `<li><a href="${escAttr(l.url)}" target="_blank" rel="noopener noreferrer">${esc(I18n.t(l.labelKey))}</a></li>`
    )
    .join("");
  return `
    <div class="graph-inspector-body">
      <p class="graph-inspector-kind">${esc(I18n.t(`overview.graph.kind.${node.kind}`))}</p>
      <h3>${esc(I18n.t(node.titleKey))}</h3>
      <p class="graph-inspector-status is-${state.status} ${state.unresolved ? "is-unresolved" : ""}">${esc(statusLabel)}</p>
      <p>${esc(I18n.t(node.summaryKey))}</p>
      ${node.noteKey ? `<p class="muted">${esc(I18n.t(node.noteKey))}</p>` : ""}
      ${
        links
          ? `<div class="graph-inspector-block"><h4>${esc(I18n.t("overview.graph.links"))}</h4><ul class="graph-inspector-links">${links}</ul></div>`
          : ""
      }
      ${checklistSnapshot(step, ctx.progress)}
      <div class="graph-inspector-actions">
        <button type="button" class="btn primary" data-graph-open-step="${stepIdx}" ${canOpen ? "" : "disabled"}>
          ${esc(I18n.t("overview.graph.openStep"))}
        </button>
        ${canOpen ? "" : `<p class="muted">${esc(I18n.t("overview.graph.stepLockedHint"))}</p>`}
      </div>
    </div>`;
}

export function renderWorkflowGraph(ctx) {
  if (!graphData) return "";
  const nodes = graphData.nodes || [];
  const w = graphData.canvas.width;
  const h = graphData.canvas.height;
  const nodeHtml = nodes.map((n) => renderNode(n, resolveNodeState(n, ctx))).join("");
  return `
    <div class="graph-shell">
      <div class="graph-toolbar">
        <p class="graph-hint">${esc(I18n.t("overview.graph.hint"))}</p>
        <div class="graph-zoom" role="group" aria-label="${escAttr(I18n.t("overview.graph.zoomLabel"))}">
          <button type="button" class="btn ghost graph-zoom-btn" data-graph-zoom="out" aria-label="${escAttr(I18n.t("overview.graph.zoomOut"))}">−</button>
          <button type="button" class="btn ghost graph-zoom-btn" data-graph-zoom="fit">${esc(I18n.t("overview.graph.zoomFit"))}</button>
          <button type="button" class="btn ghost graph-zoom-btn" data-graph-zoom="in" aria-label="${escAttr(I18n.t("overview.graph.zoomIn"))}">+</button>
        </div>
      </div>
      <div class="graph-stage">
        <div class="graph-viewport" id="graph-viewport" tabindex="0" aria-label="${escAttr(I18n.t("overview.flowLabel"))}">
          <div class="graph-world" style="width:${w}px;height:${h}px">
            <svg class="graph-edges" width="${w}" height="${h}" aria-hidden="true">
              <defs>
                <marker id="graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M 0 0 L 8 4 L 0 8 z" />
                </marker>
              </defs>
              ${renderEdges(nodes, ctx.progress)}
            </svg>
            ${nodeHtml}
          </div>
        </div>
        <aside class="graph-inspector" id="graph-inspector" aria-live="polite">
          ${inspectorHtml(nodeById(selectedId), ctx)}
        </aside>
      </div>
    </div>`;
}

/**
 * Pan/zoom + inspector. Does not mutate case/progress.
 * @param {HTMLElement} root
 * @param {{ steps: object[], progress: object, stepIndex: number, onOpenStep: (index: number) => void }} ctx
 */
export function bindWorkflowGraph(root, ctx) {
  const viewport = root.querySelector("#graph-viewport");
  const inspector = root.querySelector("#graph-inspector");
  const world = root.querySelector(".graph-world");
  if (!viewport || !world) return;

  const paintInspector = () => {
    if (inspector) inspector.innerHTML = inspectorHtml(nodeById(selectedId), ctx);
    root.querySelectorAll("[data-graph-node]").forEach((el) => {
      const on = el.getAttribute("data-graph-node") === selectedId;
      el.classList.toggle("is-selected", on);
      const hit = el.querySelector(".graph-node-hit");
      if (hit) hit.setAttribute("aria-pressed", on ? "true" : "false");
    });
  };

  const select = (id) => {
    selectedId = id;
    paintInspector();
  };

  if (!camera.userMoved) {
    fitCamera(viewport);
    requestAnimationFrame(() => {
      if (!camera.userMoved) fitCamera(viewport);
    });
  } else applyCamera(world);

  root.querySelector("[data-graph-zoom='in']")?.addEventListener("click", () => {
    const r = viewport.getBoundingClientRect();
    zoomAt(viewport, 1.18, r.left + r.width / 2, r.top + r.height / 2);
  });
  root.querySelector("[data-graph-zoom='out']")?.addEventListener("click", () => {
    const r = viewport.getBoundingClientRect();
    zoomAt(viewport, 1 / 1.18, r.left + r.width / 2, r.top + r.height / 2);
  });
  root.querySelector("[data-graph-zoom='fit']")?.addEventListener("click", () => fitCamera(viewport));

  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      zoomAt(viewport, factor, e.clientX, e.clientY);
    },
    { passive: false }
  );

  let drag = null;
  viewport.addEventListener("pointerdown", (e) => {
    if (e.target.closest("[data-graph-select], a, button")) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: camera.x, oy: camera.y };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add("is-panning");
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    camera.x = drag.ox + (e.clientX - drag.x);
    camera.y = drag.oy + (e.clientY - drag.y);
    camera.userMoved = true;
    applyCamera(world);
  });
  const endDrag = (e) => {
    if (drag && e.pointerId === drag.id) {
      drag = null;
      viewport.classList.remove("is-panning");
    }
  };
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  root.addEventListener("click", (e) => {
    const open = e.target.closest("[data-graph-open-step]");
    if (open) {
      if (open.disabled) return;
      const idx = Number(open.getAttribute("data-graph-open-step"));
      if (Number.isFinite(idx) && idx >= 0) ctx.onOpenStep(idx);
      return;
    }
    const sel = e.target.closest("[data-graph-select]");
    if (sel) {
      select(sel.getAttribute("data-graph-select"));
    }
  });
}
