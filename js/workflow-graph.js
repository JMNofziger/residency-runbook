/** Read-only expandable workflow map (HTML nodes + SVG edges). */

import { I18n } from "./i18n.js";
import { canEnterStep } from "./step-gates.js";

/** @type {object|null} */
let graphData = null;
let selectedId = null;
let expandedIds = null;
let camera = { x: 0, y: 0, scale: 1, userMoved: false };

const LAYOUT = {
  startX: 36,
  startY: 28,
  gapX: 52,
  splitGapY: 44,
  headerH: 122,
  pad: 12,
  childH: 64,
  childGap: 10,
  cols: 2,
  minW: 348,
  loopLane: 100,
};

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

function specsInFlow() {
  const out = [];
  for (const item of graphData?.flow || []) {
    if (item.kind === "split") out.push(...(item.paths || []));
    else out.push(item);
  }
  return out;
}

function specById(id) {
  return specsInFlow().find((s) => s.id === id) || null;
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

function isBranchInactive(spec, progress) {
  const path = progress.occupationPath || "labor_market_test";
  if (spec.branch === "lmt") return path === "uv_skip_candidate";
  if (spec.branch === "uv") return path === "labor_market_test";
  return false;
}

function childrenFor(spec, ctx) {
  if (!spec || spec.kind === "virtual") return [];
  const step = ctx.steps.find((s) => s.id === spec.stepId);
  const panel = step?.guidedPanel ? ctx.panels?.[step.guidedPanel] : null;
  const prefix = panel?.idPrefix;
  const checks = panel?.data?.checks || [];
  if (!prefix) return [];
  return checks.map((c) => ({
    id: `${spec.id}::${c.id}`,
    checkId: `${prefix}:${c.id}`,
    checkLocalId: c.id,
    titleKey: c.titleKey,
    whyKey: c.whyKey,
    parentId: spec.id,
    stepId: spec.stepId,
    kind: "task",
  }));
}

function childIsDone(child, progress) {
  return (progress.checkedItemIds || []).includes(child.checkId);
}

function stageProgress(spec, ctx) {
  const kids = childrenFor(spec, ctx);
  const done = kids.filter((k) => childIsDone(k, ctx.progress)).length;
  const stepDone = (ctx.progress.completedStepIds || []).includes(spec.stepId);
  const blocking = !stepDone && kids.length ? kids.length - done : 0;
  return { done, total: kids.length, blocking, stepDone };
}

export function countOpenSubtasks(ctx) {
  let open = 0;
  let total = 0;
  for (const spec of specsInFlow()) {
    if (isBranchInactive(spec, ctx.progress)) continue;
    const kids = childrenFor(spec, ctx);
    total += kids.length;
    open += kids.filter((k) => !childIsDone(k, ctx.progress)).length;
  }
  return { open, total };
}

function ensureExpanded(ctx) {
  if (expandedIds) return;
  expandedIds = new Set();
  const current = ctx.steps[ctx.stepIndex];
  for (const spec of specsInFlow()) {
    if (spec.kind === "virtual") continue;
    if (spec.stepId === current?.id) expandedIds.add(spec.id);
    const st = resolveStageState(spec, ctx);
    if (st.prog.blocking > 0 && !st.inactive && st.status !== "locked") expandedIds.add(spec.id);
  }
}

function stageBoxSize(spec, ctx, expanded) {
  const kids = childrenFor(spec, ctx);
  const showKids = expanded && kids.length > 0;
  const cols = LAYOUT.cols;
  const inner = LAYOUT.minW - LAYOUT.pad * 2;
  const childW = showKids ? (inner - LAYOUT.childGap * (cols - 1)) / cols : 0;
  const rows = showKids ? Math.ceil(kids.length / cols) : 0;
  const h = showKids
    ? LAYOUT.headerH + rows * LAYOUT.childH + Math.max(0, rows - 1) * LAYOUT.childGap + LAYOUT.pad
    : LAYOUT.headerH;
  return { w: LAYOUT.minW, h, childW, cols, kids };
}

function layoutGraph(ctx) {
  ensureExpanded(ctx);
  const placed = new Map();
  let x = LAYOUT.startX;
  const y0 = LAYOUT.startY;
  let maxBottom = y0;

  const placeSpec = (spec, y) => {
    const expanded = expandedIds.has(spec.id);
    const size = stageBoxSize(spec, ctx, expanded);
    const kids = [];
    if (expanded) {
      size.kids.forEach((child, i) => {
        const col = i % size.cols;
        const row = Math.floor(i / size.cols);
        kids.push({
          ...child,
          x: x + LAYOUT.pad + col * (size.childW + LAYOUT.childGap),
          y: y + LAYOUT.headerH + row * (LAYOUT.childH + LAYOUT.childGap),
          w: size.childW,
          h: LAYOUT.childH,
        });
      });
    }
    const node = { ...spec, x, y, w: size.w, h: size.h, expanded, kids };
    placed.set(spec.id, node);
    maxBottom = Math.max(maxBottom, y + size.h);
    return node;
  };

  const forward = [];
  let prev = null;
  for (const item of graphData.flow) {
    if (item.kind === "split") {
      const paths = item.paths || [];
      let y = y0;
      const pathNodes = [];
      let pathWidth = 0;
      for (const p of paths) {
        const n = placeSpec(p, y);
        pathNodes.push(n);
        pathWidth = Math.max(pathWidth, n.w);
        y += n.h + LAYOUT.splitGapY;
      }
      if (prev) {
        for (const n of pathNodes) {
          forward.push({ from: prev.id, to: n.id, branch: n.branch || null });
        }
      }
      prev = { id: "__split__", nodes: pathNodes, x, w: pathWidth };
      x += pathWidth + LAYOUT.gapX;
      continue;
    }
    const node = placeSpec(item, y0);
    if (prev) {
      if (prev.nodes) {
        for (const n of prev.nodes) forward.push({ from: n.id, to: node.id, branch: n.branch || null });
      } else {
        forward.push({ from: prev.id, to: node.id, branch: null });
      }
    }
    prev = node;
    x += node.w + LAYOUT.gapX;
  }

  const loopLaneY = maxBottom + LAYOUT.loopLane;
  const loops = (graphData.loops || []).map((loop, i) => {
    const fromStage = placed.get(loop.from);
    const toStage = placed.get(loop.to);
    const fromChild = fromStage?.kids?.find((k) => k.checkLocalId === loop.fromCheck);
    const fromBox = fromChild || fromStage;
    const toBox = toStage;
    const lane = loopLaneY + i * 28;
    return { ...loop, fromBox, toBox, laneY: lane, kind: "loop" };
  });

  const width = x + 12;
  const height = (loops.at(-1)?.laneY || maxBottom) + 48;
  return { placed, forward, loops, width, height };
}

function resolveStageState(spec, ctx) {
  const inactive = isBranchInactive(spec, ctx.progress);
  const prog = stageProgress(spec, ctx);
  if (spec.kind === "virtual") {
    const path = ctx.progress.occupationPath || "labor_market_test";
    const decided = path === "labor_market_test" || path === "uv_skip_candidate";
    if (!decided) return { status: "upcoming", inactive: false, unresolved: true, prog };
    if (path === "uv_skip_candidate") return { status: "done", inactive: false, unresolved: false, prog };
    return { status: "done", inactive: true, unresolved: false, prog };
  }
  const status = stepStatus(spec.stepId, ctx.steps, ctx.progress, ctx.stepIndex);
  const unresolved = Boolean(prog.blocking) && status !== "locked" && !inactive;
  return { status, inactive, unresolved, prog };
}

function resolveTaskState(child, parentState, ctx) {
  if (parentState.inactive) return { status: "done", inactive: true, unresolved: false };
  if (parentState.status === "locked") return { status: "locked", inactive: false, unresolved: false };
  if (childIsDone(child, ctx.progress)) return { status: "done", inactive: false, unresolved: false };
  if (parentState.status === "current") return { status: "current", inactive: false, unresolved: true };
  return { status: "upcoming", inactive: false, unresolved: true };
}

function edgePath(from, to) {
  const x1 = from.x + from.w;
  const y1 = from.y + Math.min(LAYOUT.headerH, from.h) / 2;
  const x2 = to.x;
  const y2 = to.y + Math.min(LAYOUT.headerH, to.h) / 2;
  const dx = Math.max(36, Math.abs(x2 - x1) * 0.42);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function loopPath(fromBox, toBox, laneY) {
  if (!fromBox || !toBox) return "";
  const nested =
    fromBox.x >= toBox.x - 2 &&
    fromBox.x + fromBox.w <= toBox.x + toBox.w + 2 &&
    fromBox.y >= toBox.y - 2;
  const self = nested || (fromBox.x === toBox.x && fromBox.y === toBox.y);
  const box = nested || fromBox.w >= toBox.w ? toBox : fromBox;
  if (self) {
    const left = box.x + 28;
    const right = box.x + box.w - 28;
    const y = box.y + box.h;
    return `M ${left} ${y} C ${left} ${laneY}, ${right} ${laneY}, ${right} ${y}`;
  }
  const x1 = fromBox.x + fromBox.w / 2;
  const y1 = fromBox.y + fromBox.h;
  const x2 = toBox.x + toBox.w / 2;
  const y2 = toBox.y + toBox.h;
  return `M ${x1} ${y1} C ${x1} ${laneY}, ${x2} ${laneY}, ${x2} ${y2}`;
}

function applyCamera(world) {
  if (!world) return;
  world.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
}

function fitCamera(viewport, width, height) {
  if (!viewport) return;
  const pad = 40;
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  if (vw < 40 || vh < 40) return;
  const scale = Math.min((vw - pad) / width, (vh - pad) / height, 1);
  camera.scale = Math.max(0.22, scale);
  camera.x = (vw - width * camera.scale) / 2;
  camera.y = Math.max(12, (vh - height * camera.scale) / 2);
  camera.userMoved = false;
  applyCamera(viewport.querySelector(".graph-world"));
}

function zoomAt(viewport, factor, cx, cy) {
  const world = viewport.querySelector(".graph-world");
  if (!world) return;
  const rect = viewport.getBoundingClientRect();
  const px = cx - rect.left;
  const py = cy - rect.top;
  const next = Math.min(1.9, Math.max(0.22, camera.scale * factor));
  const wx = (px - camera.x) / camera.scale;
  const wy = (py - camera.y) / camera.scale;
  camera.scale = next;
  camera.x = px - wx * camera.scale;
  camera.y = py - wy * camera.scale;
  camera.userMoved = true;
  applyCamera(world);
}

function statusLabel(state) {
  if (state.unresolved) return I18n.t("overview.graph.status.unresolved");
  if (state.inactive) return I18n.t("overview.graph.status.inactive");
  return I18n.t(`overview.status.${state.status}`);
}

function renderTask(child, state) {
  const selected = selectedId === child.id ? "is-selected" : "";
  return `
    <button type="button" class="graph-task is-${state.status} ${state.inactive ? "is-inactive" : ""} ${state.unresolved ? "is-unresolved" : ""} ${selected}"
      data-graph-select="${escAttr(child.id)}"
      aria-pressed="${selectedId === child.id}">
      <span class="graph-task-title">${esc(I18n.t(child.titleKey))}</span>
      <span class="graph-task-status">${esc(statusLabel(state))}</span>
    </button>`;
}

function renderStage(node, ctx) {
  const state = resolveStageState(node, ctx);
  const selected = selectedId === node.id ? "is-selected" : "";
  const step = ctx.steps.find((s) => s.id === node.stepId);
  const title = I18n.t(node.titleKey || step?.titleKey);
  const kind = I18n.t(`overview.graph.kind.${node.kind === "virtual" ? "branch" : "stage"}`);
  const prog = state.prog;
  const count =
    prog.total > 0
      ? I18n.t("overview.graph.cleared", { done: prog.done, total: prog.total })
      : statusLabel(state);
  const block =
    prog.blocking > 0 && !state.inactive
      ? `<span class="graph-block-pill">${esc(I18n.t("overview.graph.blocking", { n: prog.blocking }))}</span>`
      : "";
  const canExpand = childrenFor(node, ctx).length > 0;
  const chev = node.expanded ? "▾" : "▸";
  const tasks = (node.kids || [])
    .map((child) => renderTask(child, resolveTaskState(child, state, ctx)))
    .join("");
  return `
    <article class="graph-node is-stage ${node.expanded ? "is-expanded" : ""} is-${state.status} ${state.inactive ? "is-inactive" : ""} ${state.unresolved ? "is-unresolved" : ""} ${selected}"
      style="left:${node.x}px;top:${node.y}px;width:${node.w}px;height:${node.h}px"
      data-graph-node="${escAttr(node.id)}">
      <div class="graph-stage-head">
        <div class="graph-stage-top">
          <span class="graph-node-kind">${esc(kind)}</span>
          ${
            canExpand
              ? `<button type="button" class="graph-expand" data-graph-expand="${escAttr(node.id)}" aria-expanded="${node.expanded}" title="${escAttr(I18n.t(node.expanded ? "overview.graph.collapse" : "overview.graph.expand"))}">${chev}</button>`
              : ""
          }
        </div>
        <button type="button" class="graph-node-hit" data-graph-select="${escAttr(node.id)}" aria-pressed="${selectedId === node.id}">
          <span class="graph-node-title">${esc(title)}</span>
          <span class="graph-node-meta">
            <span class="graph-node-status">${esc(count)}</span>
            ${block}
          </span>
        </button>
      </div>
      ${node.expanded ? `<div class="graph-child-grid">${tasks}</div>` : ""}
    </article>`;
}

function renderEdgesSvg(layout, ctx) {
  const { placed, forward, loops } = layout;
  const path = ctx.progress.occupationPath || "labor_market_test";
  const isUv = path === "uv_skip_candidate";
  const fwd = forward
    .map((e) => {
      const from = placed.get(e.from);
      const to = placed.get(e.to);
      if (!from || !to) return "";
      let cls = "graph-edge";
      if (e.branch === "lmt" && isUv) cls += " is-inactive";
      if (e.branch === "uv" && path === "labor_market_test") cls += " is-inactive";
      const fromState = resolveStageState(from, ctx);
      if (fromState.prog.blocking > 0 && !fromState.inactive && fromState.status !== "done") cls += " is-blocked";
      return `<path class="${cls}" d="${edgePath(from, to)}" marker-end="url(#graph-arrow)" />`;
    })
    .join("");
  const loopEls = loops
    .map((loop) => {
      if (!loop.fromBox || !loop.toBox) return "";
      const d = loopPath(loop.fromBox, loop.toBox, loop.laneY);
      const selected = selectedId === loop.id ? "is-selected" : "";
      return `<path class="graph-edge is-loop ${selected}" d="${d}" marker-end="url(#graph-arrow-loop)" />`;
    })
    .join("");
  return fwd + loopEls;
}

function renderLoopHits(layout) {
  return layout.loops
    .map((loop) => {
      if (!loop.fromBox || !loop.toBox) return "";
      const x = (loop.fromBox.x + loop.fromBox.w / 2 + loop.toBox.x + loop.toBox.w / 2) / 2 - 90;
      return `<button type="button" class="graph-loop-hit ${selectedId === loop.id ? "is-selected" : ""}" style="left:${x}px;top:${loop.laneY - 22}px" data-graph-select="${escAttr(loop.id)}">${esc(I18n.t(loop.titleKey))}</button>`;
    })
    .join("");
}

function findSelectable(id, layout, ctx) {
  if (!id) return null;
  const loop = (graphData.loops || []).find((l) => l.id === id);
  if (loop) return { kind: "loop", ...loop };
  const spec = specById(id);
  if (spec) return { kind: spec.kind || "stage", ...spec };
  for (const spec2 of specsInFlow()) {
    const child = childrenFor(spec2, ctx).find((c) => c.id === id);
    if (child) return child;
  }
  if (layout) {
    for (const node of layout.placed.values()) {
      const child = (node.kids || []).find((c) => c.id === id);
      if (child) return child;
    }
  }
  return null;
}

function inspectorHtml(sel, ctx) {
  if (!sel) {
    return `<div class="graph-inspector-empty"><p>${esc(I18n.t("overview.graph.inspectorEmpty"))}</p></div>`;
  }
  if (sel.kind === "loop") {
    const to = specById(sel.to);
    const stepIdx = stepIndexOf(ctx.steps, to?.stepId);
    const canOpen = stepIdx >= 0 && canEnterStep(ctx.steps, stepIdx, ctx.progress);
    return `
      <div class="graph-inspector-body">
        <p class="graph-inspector-kind">${esc(I18n.t("overview.graph.kind.loop"))}</p>
        <h3>${esc(I18n.t(sel.titleKey))}</h3>
        <p>${esc(I18n.t(sel.noteKey))}</p>
        <p class="muted">${esc(I18n.t("overview.graph.loopHint"))}</p>
        <div class="graph-inspector-actions">
          <button type="button" class="btn primary" data-graph-open-step="${stepIdx}" ${canOpen ? "" : "disabled"}>
            ${esc(I18n.t("overview.graph.openStep"))}
          </button>
        </div>
      </div>`;
  }

  const spec = sel.kind === "task" ? specById(sel.parentId) : sel;
  const state = spec ? resolveStageState(spec, ctx) : { status: "upcoming", inactive: false, unresolved: false, prog: { done: 0, total: 0, blocking: 0 } };
  const step = ctx.steps.find((s) => s.id === sel.stepId);
  const stepIdx = stepIndexOf(ctx.steps, sel.stepId);
  const canOpen = stepIdx >= 0 && canEnterStep(ctx.steps, stepIdx, ctx.progress);
  const title = sel.titleKey ? I18n.t(sel.titleKey) : I18n.t(step?.titleKey);
  const summary = sel.whyKey ? I18n.t(sel.whyKey) : sel.summaryKey ? I18n.t(sel.summaryKey) : step ? I18n.t(step.summaryKey) : "";
  const note = spec?.noteKey ? I18n.t(spec.noteKey) : "";
  const links = (spec?.links || [])
    .map((l) => `<li><a href="${escAttr(l.url)}" target="_blank" rel="noopener noreferrer">${esc(I18n.t(l.labelKey))}</a></li>`)
    .join("");
  const kids = spec ? childrenFor(spec, ctx) : [];
  const kidList =
    sel.kind === "task" || !kids.length
      ? ""
      : `<div class="graph-inspector-block"><h4>${esc(I18n.t("overview.graph.subtasks"))}</h4><ul class="graph-read-checks">${kids
          .map((k) => {
            const on = childIsDone(k, ctx.progress);
            return `<li class="${on ? "is-on" : ""}"><span class="graph-check-mark">${on ? "✓" : "○"}</span>${esc(I18n.t(k.titleKey))}</li>`;
          })
          .join("")}</ul><p class="muted graph-read-hint">${esc(I18n.t("overview.graph.readOnlyChecks"))}</p></div>`;

  return `
    <div class="graph-inspector-body">
      <p class="graph-inspector-kind">${esc(I18n.t(`overview.graph.kind.${sel.kind === "task" ? "task" : spec?.kind === "virtual" ? "branch" : "stage"}`))}</p>
      <h3>${esc(title)}</h3>
      <p class="graph-inspector-status is-${state.status} ${state.unresolved ? "is-unresolved" : ""}">${esc(statusLabel(sel.kind === "task" ? resolveTaskState(sel, state, ctx) : state))}</p>
      <p>${esc(summary)}</p>
      ${note && sel.kind !== "task" ? `<p class="muted">${esc(note)}</p>` : ""}
      ${
        sel.kind !== "task" && state.prog.blocking > 0
          ? `<p class="graph-gate">${esc(I18n.t("overview.graph.gateBlocked"))}</p>`
          : ""
      }
      ${links ? `<div class="graph-inspector-block"><h4>${esc(I18n.t("overview.graph.links"))}</h4><ul class="graph-inspector-links">${links}</ul></div>` : ""}
      ${kidList}
      <div class="graph-inspector-actions">
        <button type="button" class="btn primary" data-graph-open-step="${stepIdx}" ${canOpen ? "" : "disabled"}>
          ${esc(I18n.t("overview.graph.openStep"))}
        </button>
        ${canOpen ? "" : `<p class="muted">${esc(I18n.t("overview.graph.stepLockedHint"))}</p>`}
      </div>
    </div>`;
}

function worldHtml(layout, ctx) {
  const stages = [...layout.placed.values()].map((n) => renderStage(n, ctx)).join("");
  return `
    <svg class="graph-edges" width="${layout.width}" height="${layout.height}" aria-hidden="true">
      <defs>
        <marker id="graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" />
        </marker>
        <marker id="graph-arrow-loop" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" />
        </marker>
      </defs>
      ${renderEdgesSvg(layout, ctx)}
    </svg>
    ${stages}
    ${renderLoopHits(layout)}`;
}

export function renderWorkflowGraph(ctx) {
  if (!graphData) return "";
  const layout = layoutGraph(ctx);
  return `
    <div class="graph-shell">
      <div class="graph-toolbar">
        <p class="graph-hint">${esc(I18n.t("overview.graph.hint"))}</p>
        <div class="graph-toolbar-actions">
          <button type="button" class="btn ghost graph-zoom-btn" data-graph-expand-mode="current">${esc(I18n.t("overview.graph.expandCurrent"))}</button>
          <button type="button" class="btn ghost graph-zoom-btn" data-graph-expand-mode="blocking">${esc(I18n.t("overview.graph.expandBlocking"))}</button>
          <button type="button" class="btn ghost graph-zoom-btn" data-graph-expand-mode="none">${esc(I18n.t("overview.graph.collapseAll"))}</button>
          <div class="graph-zoom" role="group" aria-label="${escAttr(I18n.t("overview.graph.zoomLabel"))}">
            <button type="button" class="btn ghost graph-zoom-btn" data-graph-zoom="out" aria-label="${escAttr(I18n.t("overview.graph.zoomOut"))}">−</button>
            <button type="button" class="btn ghost graph-zoom-btn" data-graph-zoom="fit">${esc(I18n.t("overview.graph.zoomFit"))}</button>
            <button type="button" class="btn ghost graph-zoom-btn" data-graph-zoom="in" aria-label="${escAttr(I18n.t("overview.graph.zoomIn"))}">+</button>
          </div>
        </div>
      </div>
      <div class="graph-stage">
        <div class="graph-viewport" id="graph-viewport" tabindex="0" aria-label="${escAttr(I18n.t("overview.flowLabel"))}">
          <div class="graph-world" style="width:${layout.width}px;height:${layout.height}px">
            ${worldHtml(layout, ctx)}
          </div>
        </div>
        <aside class="graph-inspector" id="graph-inspector" aria-live="polite">
          ${inspectorHtml(findSelectable(selectedId, layout, ctx), ctx)}
        </aside>
      </div>
    </div>`;
}

function refreshWorld(root, ctx) {
  const viewport = root.querySelector("#graph-viewport");
  const world = root.querySelector(".graph-world");
  const inspector = root.querySelector("#graph-inspector");
  if (!world || !viewport) return;
  const layout = layoutGraph(ctx);
  world.style.width = `${layout.width}px`;
  world.style.height = `${layout.height}px`;
  world.innerHTML = worldHtml(layout, ctx);
  if (inspector) inspector.innerHTML = inspectorHtml(findSelectable(selectedId, layout, ctx), ctx);
  applyCamera(world);
  return layout;
}

/**
 * Pan/zoom + expand + inspector. Does not mutate case/progress.
 */
export function bindWorkflowGraph(root, ctx) {
  const viewport = root.querySelector("#graph-viewport");
  const world = root.querySelector(".graph-world");
  if (!viewport || !world) return;

  const layout0 = layoutGraph(ctx);
  if (!camera.userMoved) {
    fitCamera(viewport, layout0.width, layout0.height);
    requestAnimationFrame(() => {
      if (!camera.userMoved) fitCamera(viewport, layoutGraph(ctx).width, layoutGraph(ctx).height);
    });
  } else applyCamera(world);

  const expandMode = (mode) => {
    expandedIds = new Set();
    if (mode === "current") {
      const current = ctx.steps[ctx.stepIndex];
      for (const spec of specsInFlow()) {
        if (spec.stepId === current?.id && spec.kind !== "virtual") expandedIds.add(spec.id);
      }
    } else if (mode === "blocking") {
      for (const spec of specsInFlow()) {
        const st = resolveStageState(spec, ctx);
        if (st.prog.blocking > 0 && !st.inactive) expandedIds.add(spec.id);
      }
    }
    camera.userMoved = false;
    const layout = refreshWorld(root, ctx);
    if (layout) fitCamera(viewport, layout.width, layout.height);
  };

  root.querySelector("[data-graph-zoom='in']")?.addEventListener("click", () => {
    const r = viewport.getBoundingClientRect();
    zoomAt(viewport, 1.18, r.left + r.width / 2, r.top + r.height / 2);
  });
  root.querySelector("[data-graph-zoom='out']")?.addEventListener("click", () => {
    const r = viewport.getBoundingClientRect();
    zoomAt(viewport, 1 / 1.18, r.left + r.width / 2, r.top + r.height / 2);
  });
  root.querySelector("[data-graph-zoom='fit']")?.addEventListener("click", () => {
    const layout = layoutGraph(ctx);
    fitCamera(viewport, layout.width, layout.height);
  });
  root.querySelector("[data-graph-expand-mode='current']")?.addEventListener("click", () => expandMode("current"));
  root.querySelector("[data-graph-expand-mode='blocking']")?.addEventListener("click", () => expandMode("blocking"));
  root.querySelector("[data-graph-expand-mode='none']")?.addEventListener("click", () => expandMode("none"));

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
    if (e.target.closest("[data-graph-select], [data-graph-expand], a, button")) return;
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
    const exp = e.target.closest("[data-graph-expand]");
    if (exp) {
      const id = exp.getAttribute("data-graph-expand");
      if (!expandedIds) expandedIds = new Set();
      if (expandedIds.has(id)) expandedIds.delete(id);
      else expandedIds.add(id);
      selectedId = id;
      refreshWorld(root, ctx);
      return;
    }
    const open = e.target.closest("[data-graph-open-step]");
    if (open) {
      if (open.disabled) return;
      const idx = Number(open.getAttribute("data-graph-open-step"));
      if (Number.isFinite(idx) && idx >= 0) ctx.onOpenStep(idx);
      return;
    }
    const sel = e.target.closest("[data-graph-select]");
    if (sel) {
      selectedId = sel.getAttribute("data-graph-select");
      const inspector = root.querySelector("#graph-inspector");
      const layout = layoutGraph(ctx);
      if (inspector) inspector.innerHTML = inspectorHtml(findSelectable(selectedId, layout, ctx), ctx);
      root.querySelectorAll("[data-graph-node], .graph-task, .graph-loop-hit").forEach((el) => {
        const key = el.getAttribute("data-graph-node") || el.getAttribute("data-graph-select");
        el.classList.toggle("is-selected", key === selectedId);
      });
    }
  });
}
