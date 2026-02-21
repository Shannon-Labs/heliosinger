import { classifyFlareClass } from "../../../packages/core/src/index.ts";

export interface ParsedXrayFlux {
  timestamp: string;
  short_wave: number;
  long_wave: number;
  flare_class: string;
  begin?: string;
  current?: string;
  end?: string;
  max_flux?: string;
  note?: string;
}

function getNumberCandidate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseNumber(value: unknown): number {
  return getNumberCandidate(value) ?? 0;
}

export function parseXrayFlux(input: unknown, now = new Date().toISOString()): ParsedXrayFlux | null {
  if (input === null || input === undefined) return null;

  let shortWave = 0;
  let longWave = 0;
  let timestamp = now;
  let providedFlareClass: string | undefined;
  let begin: string | undefined;
  let current: string | undefined;
  let end: string | undefined;
  let maxFlux: string | undefined;
  let note: string | undefined;

  if (Array.isArray(input) && input.length > 0) {
    const latest = input[input.length - 1];
    if (Array.isArray(latest)) {
      timestamp = latest[0] ? new Date(latest[0]).toISOString() : timestamp;
      shortWave = parseNumber(latest[1]) || parseNumber(latest[2]);
      longWave = parseNumber(latest[2]) || parseNumber(latest[3]);
    } else if (typeof latest === "object") {
      return parseXrayFlux(latest as Record<string, unknown>, now);
    } else {
      return null;
    }
  } else if (typeof input === "object") {
    const data = input as Record<string, unknown>;
    timestamp = data.timestamp ? new Date(String(data.timestamp)).toISOString() : timestamp;
    shortWave = parseNumber(data.short_wave) || parseNumber(data["0.05-0.4nm"]) || parseNumber(data.xrsa) || parseNumber(data.xrs_short) || parseNumber(data.current);
    longWave = parseNumber(data.long_wave) || parseNumber(data["0.1-0.8nm"]) || parseNumber(data.xrsb) || parseNumber(data.xrs_long);
    providedFlareClass = typeof data.flare_class === "string" ? data.flare_class : undefined;
    begin = typeof data.begin === "string" ? data.begin : undefined;
    current = typeof data.current === "string" ? data.current : undefined;
    end = typeof data.end === "string" ? data.end : undefined;
    maxFlux = typeof data.max_flux === "string" ? data.max_flux : undefined;
    note = typeof data.note === "string" ? data.note : undefined;
  } else {
    return null;
  }

  const calculatedFlareClass = classifyFlareClass(shortWave);
  const flareClass = providedFlareClass && ["A", "B", "C", "M", "X"].includes(providedFlareClass[0])
    ? providedFlareClass
    : calculatedFlareClass;

  const payload: ParsedXrayFlux = {
    timestamp,
    short_wave: shortWave,
    long_wave: longWave,
    flare_class: flareClass,
  };

  if (begin) payload.begin = begin;
  if (current) payload.current = current;
  if (end) payload.end = end;
  if (maxFlux) payload.max_flux = maxFlux;
  if (note) payload.note = note;

  return payload;
}
