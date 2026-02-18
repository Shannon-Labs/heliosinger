import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyFlareClass,
  deriveRScale,
  summarizeFlareImpact,
  toFlareTimelineItem,
} from "../src/index";

test("classifyFlareClass maps NOAA thresholds", () => {
  assert.equal(classifyFlareClass(5e-8), "A");
  assert.equal(classifyFlareClass(5e-7), "B");
  assert.equal(classifyFlareClass(5e-6), "C");
  assert.equal(classifyFlareClass(5e-5), "M");
  assert.equal(classifyFlareClass(5e-4), "X");
});

test("deriveRScale maps long-wave flux to R levels", () => {
  assert.equal(deriveRScale(5e-7), "R0");
  assert.equal(deriveRScale(2e-6), "R1");
  assert.equal(deriveRScale(2e-5), "R2");
  assert.equal(deriveRScale(7e-5), "R3");
  assert.equal(deriveRScale(2e-4), "R4");
  assert.equal(deriveRScale(6e-4), "R5");
});

test("summarizeFlareImpact reflects severity", () => {
  assert.match(summarizeFlareImpact("C", "R1"), /Minor/i);
  assert.match(summarizeFlareImpact("M", "R2"), /Strong/i);
  assert.match(summarizeFlareImpact("X", "R5"), /Extreme/i);
});

test("toFlareTimelineItem fills derived fields", () => {
  const item = toFlareTimelineItem({
    timestamp: "2026-02-18T00:00:00.000Z",
    shortWave: 2e-6,
    longWave: 2e-5,
  });

  assert.equal(item.flareClass, "M");
  assert.equal(item.rScale, "R2");
  assert.equal(item.source, "derived");
  assert.ok(item.id.length > 10);
});
