#!/usr/bin/env node
/**
 * Smoke: step gates + contiguous completion rules (no browser).
 */
import { readFileSync } from "node:fs";
import { canEnterStep, canMarkStepComplete } from "../js/step-gates.js";

const steps = JSON.parse(readFileSync(new URL("../data/steps.json", import.meta.url), "utf8")).steps;

const incomplete = { data: { checks: [{ id: "a" }] }, allComplete: () => false };
const complete = { data: { checks: [{ id: "a" }] }, allComplete: () => true };

function ctx(progress, panels) {
  return {
    progress,
    isChecked: (id) => (progress.checkedItemIds || []).includes(id),
    panelsByKey: panels,
  };
}

let progress = {
  completedStepIds: [],
  checkedItemIds: [],
  selectedOccupationId: null,
  occupationPath: "labor_market_test",
  uvCandidate: null,
};

if (canEnterStep(steps, 1, progress)) throw new Error("step 2 should be locked");
if (!canEnterStep(steps, 0, progress)) throw new Error("step 1 should be open");

let g = canMarkStepComplete(steps[0], ctx(progress, { art99: incomplete }));
if (g.ok) throw new Error("orient should fail without art99");

progress.checkedItemIds = ["art99:a", "core:orient-art99-selfcheck"];
g = canMarkStepComplete(steps[0], ctx(progress, { art99: complete }));
if (!g.ok) throw new Error("orient should pass with art99");

progress.completedStepIds = ["orient"];
if (!canEnterStep(steps, 1, progress)) throw new Error("step 2 should unlock");

const sw = steps.find((s) => s.id === "start-work");
const cy = steps.find((s) => s.id === "comply");
if (sw?.guidedPanel !== "start-work" || cy?.guidedPanel !== "comply") {
  throw new Error("steps 7–8 must use guided panels");
}

progress.completedStepIds = ["orient", "occupation", "employer-package"];
progress.occupationPath = "uv_skip_candidate";
progress.uvCandidate = { title: "x" };
progress.selectedOccupationId = "manual-event-crew";
g = canMarkStepComplete(steps[3], ctx(progress, { lmt: incomplete }));
if (!g.ok) throw new Error("LMT step should pass on UV path without lmt guided");

const graph = JSON.parse(readFileSync(new URL("../data/workflow-graph.json", import.meta.url), "utf8"));
const stepIds = new Set(steps.map((s) => s.id));
if (!graph.flow?.length) throw new Error("workflow graph missing flow");
const graphIds = new Set();
for (const item of graph.flow) {
  const specs = item.kind === "split" ? item.paths || [] : [item];
  for (const spec of specs) {
    graphIds.add(spec.id);
    if (spec.stepId && !stepIds.has(spec.stepId)) {
      throw new Error(`workflow graph ${spec.id} has unknown stepId ${spec.stepId}`);
    }
  }
}
for (const loop of graph.loops || []) {
  if (!graphIds.has(loop.from) || !graphIds.has(loop.to)) {
    throw new Error(`workflow loop ${loop.id} is dangling`);
  }
}

console.log("smoke-gates: OK");
