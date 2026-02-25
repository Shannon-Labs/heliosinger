var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-1A2atf/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/pages-xPyMeD/functionsWorker-0.24172463752349738.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var urls2 = /* @__PURE__ */ new Set();
function checkURL2(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls2.has(url.toString())) {
      urls2.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL2, "checkURL");
__name2(checkURL2, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL2(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});
var FLARE_RANK = {
  A: 0,
  B: 1,
  C: 2,
  M: 3,
  X: 4
};
function classifyFlareClass(flux) {
  if (!Number.isFinite(flux) || flux <= 0) return "A";
  if (flux >= 1e-4) return "X";
  if (flux >= 1e-5) return "M";
  if (flux >= 1e-6) return "C";
  if (flux >= 1e-7) return "B";
  return "A";
}
__name(classifyFlareClass, "classifyFlareClass");
__name2(classifyFlareClass, "classifyFlareClass");
function deriveRScale(longWaveFlux) {
  if (!Number.isFinite(longWaveFlux) || longWaveFlux <= 0) return "R0";
  if (longWaveFlux >= 5e-4) return "R5";
  if (longWaveFlux >= 1e-4) return "R4";
  if (longWaveFlux >= 5e-5) return "R3";
  if (longWaveFlux >= 1e-5) return "R2";
  if (longWaveFlux >= 1e-6) return "R1";
  return "R0";
}
__name(deriveRScale, "deriveRScale");
__name2(deriveRScale, "deriveRScale");
function summarizeFlareImpact(flareClass, rScale) {
  const rank = FLARE_RANK[(flareClass || "A")[0]] ?? 0;
  if (rank >= 4 || rScale === "R5" || rScale === "R4") {
    return "Extreme flare conditions with high probability of major HF radio disruption on the sunlit side.";
  }
  if (rank >= 3 || rScale === "R3" || rScale === "R2") {
    return "Strong flare activity may cause moderate radio blackouts and satellite communication degradation.";
  }
  if (rank >= 2 || rScale === "R1") {
    return "Minor flare activity with occasional short-lived radio absorption effects.";
  }
  return "Background solar X-ray activity with minimal operational impacts expected.";
}
__name(summarizeFlareImpact, "summarizeFlareImpact");
__name2(summarizeFlareImpact, "summarizeFlareImpact");
function deriveSpaceWeatherCondition(input) {
  const kp = input.kp ?? 0;
  const velocity = input.velocity ?? 0;
  const bz = input.bz ?? 0;
  if (kp >= 8 || velocity >= 750 || bz <= -18) return "super_extreme";
  if (kp >= 7 || velocity >= 650 || bz <= -12) return "extreme";
  if (kp >= 5 || velocity >= 560 || bz <= -8) return "storm";
  if (kp >= 3 || velocity >= 450 || bz <= -4) return "moderate";
  return "quiet";
}
__name(deriveSpaceWeatherCondition, "deriveSpaceWeatherCondition");
__name2(deriveSpaceWeatherCondition, "deriveSpaceWeatherCondition");
function computeStaleness(eventTimestamp, now = /* @__PURE__ */ new Date()) {
  const sourceMs = new Date(eventTimestamp).getTime();
  if (!Number.isFinite(sourceMs)) {
    return { stale: true, staleSeconds: Number.MAX_SAFE_INTEGER };
  }
  const staleSeconds = Math.max(0, Math.floor((now.getTime() - sourceMs) / 1e3));
  return {
    stale: staleSeconds > 5 * 60,
    staleSeconds
  };
}
__name(computeStaleness, "computeStaleness");
__name2(computeStaleness, "computeStaleness");
function buildImpactBullets(now) {
  const bullets = [];
  const kp = now.geomagnetic?.kp ?? 0;
  if (kp >= 7) {
    bullets.push("Severe geomagnetic storm conditions are active (Kp 7+).");
  } else if (kp >= 5) {
    bullets.push("Geomagnetic storm threshold reached (Kp 5+).");
  }
  const bz = now.solarWind?.bz ?? 0;
  if (bz <= -10) {
    bullets.push("Strong southward IMF boosts magnetospheric coupling.");
  }
  const velocity = now.solarWind?.velocity ?? 0;
  if (velocity >= 600) {
    bullets.push("High-speed solar wind stream is currently impacting near-Earth space.");
  }
  if (now.flare) {
    bullets.push(now.flare.impactSummary);
  }
  if (bullets.length === 0) {
    bullets.push("Space weather remains relatively calm with low operational risk.");
  }
  return bullets;
}
__name(buildImpactBullets, "buildImpactBullets");
__name2(buildImpactBullets, "buildImpactBullets");
function toFlareTimelineItem(input) {
  const flareClass = input.flareClass ?? classifyFlareClass(input.longWave || input.shortWave);
  const rScale = deriveRScale(input.longWave || input.shortWave);
  return {
    id: `${input.timestamp}-${flareClass}-${Math.round((input.longWave || input.shortWave) * 1e12)}`,
    timestamp: input.timestamp,
    flareClass,
    shortWave: input.shortWave,
    longWave: input.longWave,
    rScale,
    impactSummary: summarizeFlareImpact(flareClass, rScale),
    source: input.source ?? "derived"
  };
}
__name(toFlareTimelineItem, "toFlareTimelineItem");
__name2(toFlareTimelineItem, "toFlareTimelineItem");
function buildLearningCards(now) {
  const cards = [];
  const velocity = now.solarWind?.velocity ?? 0;
  const density = now.solarWind?.density ?? 0;
  const bz = now.solarWind?.bz ?? 0;
  const kp = now.geomagnetic?.kp ?? 0;
  if (velocity >= 600) {
    cards.push({
      id: "learn-high-speed-stream",
      track: "space-weather",
      priority: "significant",
      title: "High-Speed Stream",
      body: "Solar wind above ~600 km/s often comes from coronal holes where magnetic field lines are open.",
      dataConnection: `Velocity is ${velocity.toFixed(0)} km/s right now.`,
      audioConnection: "Higher flow speed pushes the ambient fundamental upward."
    });
  }
  if (bz <= -5) {
    cards.push({
      id: "learn-southward-bz",
      track: "electromagnetism",
      priority: "significant",
      title: "Southward IMF Coupling",
      body: "Negative Bz favors magnetic reconnection, allowing more solar wind energy into the magnetosphere.",
      dataConnection: `Current Bz is ${bz.toFixed(1)} nT (southward).`,
      audioConnection: "Southward coupling increases binaural width and harmonic tension."
    });
  }
  if (kp >= 5) {
    cards.push({
      id: "learn-kp-storm",
      track: "space-weather",
      priority: "significant",
      title: "Geomagnetic Storm",
      body: "Kp >= 5 marks storm-level geomagnetic activity, often linked to stronger auroral expansion.",
      dataConnection: `Kp is ${kp.toFixed(1)}.`,
      audioConnection: "Storm intensity increases tremolo depth and rhythmic urgency."
    });
  }
  if (density >= 12) {
    cards.push({
      id: "learn-density-compression",
      track: "space-weather",
      priority: "notable",
      title: "Compression Region",
      body: "Elevated density suggests compressed plasma where faster wind catches slower wind.",
      dataConnection: `Density is ${density.toFixed(1)} p/cm3.`,
      audioConnection: "Higher density enriches harmonic partials and thickness."
    });
  }
  if (now.flare && ["M", "X"].includes(now.flare.flareClass[0])) {
    cards.push({
      id: "learn-flare-radio-impact",
      track: "electromagnetism",
      priority: "significant",
      title: "Solar Flare Radio Impact",
      body: "Strong X-ray flares ionize the dayside ionosphere and can suppress HF radio propagation.",
      dataConnection: `${now.flare.flareClass}-class flare, ${now.flare.rScale} blackout scale.`,
      audioConnection: "Flare spikes brighten the sound palette and transient accent layer."
    });
  }
  if (cards.length === 0) {
    cards.push({
      id: "learn-calm-baseline",
      track: "acoustics",
      priority: "ambient",
      title: "Calm Baseline",
      body: "Quiet conditions create a stable sound bed, useful for hearing subtle trend changes over time.",
      dataConnection: "Current parameters are near baseline solar-wind ranges.",
      audioConnection: "Expect smoother timbre and less modulation depth."
    });
  }
  return cards.slice(0, 6);
}
__name(buildLearningCards, "buildLearningCards");
__name2(buildLearningCards, "buildLearningCards");
var DEFAULT_MIN_INTERVAL_MS = 5 * 60 * 1e3;
var MIDI_NOTES = {
  C2: 36,
  // Low C
  C3: 48,
  C4: 60,
  // Middle C (261.63 Hz)
  C5: 72,
  C6: 84,
  // High C
  A4: 69
  // Concert A (440 Hz)
};
var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function midiNoteToFrequency(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}
__name(midiNoteToFrequency, "midiNoteToFrequency");
__name2(midiNoteToFrequency, "midiNoteToFrequency");
function midiNoteToNoteName(midiNote) {
  const octave = Math.floor((midiNote - 12) / 12);
  const noteIndex = (midiNote - 12) % 12;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}
__name(midiNoteToNoteName, "midiNoteToNoteName");
__name2(midiNoteToNoteName, "midiNoteToNoteName");
function velocityToMidiNote(velocity, minVelocity = 200, maxVelocity = 800, minMidiNote = MIDI_NOTES.C2, maxMidiNote = MIDI_NOTES.C6) {
  const clampedVelocity = Math.max(minVelocity, Math.min(maxVelocity, velocity));
  const normalizedVelocity = (clampedVelocity - minVelocity) / (maxVelocity - minVelocity);
  const midiNote = minMidiNote + normalizedVelocity * (maxMidiNote - minMidiNote);
  return Math.round(midiNote);
}
__name(velocityToMidiNote, "velocityToMidiNote");
__name2(velocityToMidiNote, "velocityToMidiNote");
function densityToDecayTime(density, minDensity = 0.5, maxDensity = 50, minDecayTime = 0.2, maxDecayTime = 5) {
  const clampedDensity = Math.max(minDensity, Math.min(maxDensity, density));
  const logMin = Math.log(minDensity);
  const logMax = Math.log(maxDensity);
  const logDensity = Math.log(clampedDensity);
  const normalizedDensity = (logDensity - logMin) / (logMax - logMin);
  const decayTime = maxDecayTime - normalizedDensity * (maxDecayTime - minDecayTime);
  return Math.max(minDecayTime, Math.min(maxDecayTime, decayTime));
}
__name(densityToDecayTime, "densityToDecayTime");
__name2(densityToDecayTime, "densityToDecayTime");
function bzToDetuneCents(bz, threshold = -5, maxDetuneCents = -20) {
  if (bz >= threshold) {
    return 0;
  }
  const detuneStrength = Math.min(1, Math.abs(bz - threshold) / Math.abs(threshold * 2));
  return Math.round(maxDetuneCents * detuneStrength);
}
__name(bzToDetuneCents, "bzToDetuneCents");
__name2(bzToDetuneCents, "bzToDetuneCents");
function mapSolarWindToChord(velocity, density, bz, config) {
  const midiNote = velocityToMidiNote(
    velocity,
    config.velocityMin,
    config.velocityMax,
    config.midiNoteMin,
    config.midiNoteMax
  );
  const frequency = midiNoteToFrequency(midiNote);
  const noteName = midiNoteToNoteName(midiNote);
  const decayTime = densityToDecayTime(
    density,
    config.densityMin,
    config.densityMax,
    config.decayTimeMin,
    config.decayTimeMax
  );
  const detuneCents = bzToDetuneCents(bz, config.bzThreshold, config.bzDetuneCents);
  const condition = deriveSpaceWeatherCondition({ velocity, bz });
  return {
    midiNote,
    frequency,
    noteName,
    decayTime,
    detuneCents,
    condition
  };
}
__name(mapSolarWindToChord, "mapSolarWindToChord");
__name2(mapSolarWindToChord, "mapSolarWindToChord");
var ALLOWED_FLARE_CLASSES = /* @__PURE__ */ new Set(["A", "B", "C", "M", "X"]);
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
__name(isRecord, "isRecord");
__name2(isRecord, "isRecord");
function asNonEmptyString(value, maxLen = 256) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLen) return null;
  return trimmed;
}
__name(asNonEmptyString, "asNonEmptyString");
__name2(asNonEmptyString, "asNonEmptyString");
function isValidTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(/* @__PURE__ */ new Date());
    return true;
  } catch {
    return false;
  }
}
__name(isValidTimezone, "isValidTimezone");
__name2(isValidTimezone, "isValidTimezone");
function normalizePlatform(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "ios" || normalized === "android") return normalized;
  return null;
}
__name(normalizePlatform, "normalizePlatform");
__name2(normalizePlatform, "normalizePlatform");
function coerceBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}
__name(coerceBoolean, "coerceBoolean");
__name2(coerceBoolean, "coerceBoolean");
function coerceNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
__name(coerceNumber, "coerceNumber");
__name2(coerceNumber, "coerceNumber");
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
__name(clamp, "clamp");
__name2(clamp, "clamp");
function normalizeFlareClasses(input) {
  if (!Array.isArray(input)) return ["M", "X"];
  const classes = input.map((value) => String(value).trim().toUpperCase()[0] ?? "").filter((value) => ALLOWED_FLARE_CLASSES.has(value));
  if (classes.length === 0) return ["M", "X"];
  return [...new Set(classes)];
}
__name(normalizeFlareClasses, "normalizeFlareClasses");
__name2(normalizeFlareClasses, "normalizeFlareClasses");
function sanitizeQuietHours(input) {
  const record = isRecord(input) ? input : {};
  const startHour = clamp(Math.floor(coerceNumber(record.startHour, 22)), 0, 23);
  const endHour = clamp(Math.floor(coerceNumber(record.endHour, 7)), 0, 23);
  return {
    enabled: coerceBoolean(record.enabled, false),
    startHour,
    endHour
  };
}
__name(sanitizeQuietHours, "sanitizeQuietHours");
__name2(sanitizeQuietHours, "sanitizeQuietHours");
function sanitizeThresholds(input) {
  const record = isRecord(input) ? input : {};
  return {
    kp: clamp(coerceNumber(record.kp, 5), 1, 9),
    bzSouth: clamp(coerceNumber(record.bzSouth, 8), 1, 30),
    flareClasses: normalizeFlareClasses(record.flareClasses)
  };
}
__name(sanitizeThresholds, "sanitizeThresholds");
__name2(sanitizeThresholds, "sanitizeThresholds");
function sanitizeFlaresLimit(raw, fallback = 50) {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, 1, 200);
}
__name(sanitizeFlaresLimit, "sanitizeFlaresLimit");
__name2(sanitizeFlaresLimit, "sanitizeFlaresLimit");
function validateDevicePreferencesRequest(input, options = {}) {
  const installIdRequired = options.installIdRequired ?? true;
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ code: "invalid_body", field: "body", message: "JSON object is required" }]
    };
  }
  const errors = [];
  const installId = asNonEmptyString(input.installId, 128);
  if (installIdRequired && !installId) {
    errors.push({ code: "invalid_install_id", field: "installId", message: "installId is required" });
  }
  const payload = {
    installId: installId ?? "",
    alertsEnabled: coerceBoolean(input.alertsEnabled, true),
    thresholds: sanitizeThresholds(input.thresholds),
    quietHours: sanitizeQuietHours(input.quietHours),
    backgroundAudioEnabled: coerceBoolean(input.backgroundAudioEnabled, true),
    updatedAt: asNonEmptyString(input.updatedAt, 64) ?? (/* @__PURE__ */ new Date()).toISOString()
  };
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: payload };
}
__name(validateDevicePreferencesRequest, "validateDevicePreferencesRequest");
__name2(validateDevicePreferencesRequest, "validateDevicePreferencesRequest");
function validateDeviceRegistrationRequest(input) {
  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ code: "invalid_body", field: "body", message: "JSON object is required" }]
    };
  }
  const errors = [];
  const installId = asNonEmptyString(input.installId, 128);
  const pushToken = asNonEmptyString(input.pushToken, 512);
  const timezone = asNonEmptyString(input.timezone, 120);
  const platform = normalizePlatform(input.platform);
  const appVersion = asNonEmptyString(input.appVersion, 64) ?? void 0;
  if (!installId) {
    errors.push({ code: "invalid_install_id", field: "installId", message: "installId is required" });
  }
  if (!pushToken) {
    errors.push({ code: "invalid_push_token", field: "pushToken", message: "pushToken is required" });
  }
  if (!timezone) {
    errors.push({ code: "invalid_timezone", field: "timezone", message: "timezone is required" });
  } else if (!isValidTimezone(timezone)) {
    errors.push({ code: "invalid_timezone", field: "timezone", message: "timezone must be a valid IANA timezone" });
  }
  if (!platform) {
    errors.push({ code: "invalid_platform", field: "platform", message: "platform must be ios or android" });
  }
  let preferences;
  if (input.preferences !== void 0) {
    const validatedPreferences = validateDevicePreferencesRequest(input.preferences, {
      installIdRequired: false
    });
    if (!validatedPreferences.ok) {
      errors.push(
        ...validatedPreferences.errors.map((issue) => ({
          ...issue,
          field: `preferences.${issue.field}`
        }))
      );
    } else {
      preferences = {
        ...validatedPreferences.value,
        installId: installId ?? validatedPreferences.value.installId
      };
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      installId,
      pushToken,
      timezone,
      platform,
      appVersion,
      preferences
    }
  };
}
__name(validateDeviceRegistrationRequest, "validateDeviceRegistrationRequest");
__name2(validateDeviceRegistrationRequest, "validateDeviceRegistrationRequest");
function memoryStore() {
  if (!globalThis.__HELIOSINGER_MOBILE_MEM__) {
    globalThis.__HELIOSINGER_MOBILE_MEM__ = {
      devices: /* @__PURE__ */ new Map(),
      snapshots: [],
      flares: []
    };
  }
  return globalThis.__HELIOSINGER_MOBILE_MEM__;
}
__name(memoryStore, "memoryStore");
__name2(memoryStore, "memoryStore");
function rateLimitStore() {
  if (!globalThis.__HELIOSINGER_MOBILE_RATE_LIMIT_MEM__) {
    globalThis.__HELIOSINGER_MOBILE_RATE_LIMIT_MEM__ = /* @__PURE__ */ new Map();
  }
  return globalThis.__HELIOSINGER_MOBILE_RATE_LIMIT_MEM__;
}
__name(rateLimitStore, "rateLimitStore");
__name2(rateLimitStore, "rateLimitStore");
function parseNumber(input, fallback = 0) {
  const value = Number.parseFloat(String(input ?? ""));
  return Number.isFinite(value) ? value : fallback;
}
__name(parseNumber, "parseNumber");
__name2(parseNumber, "parseNumber");
function normalizeKpValue(raw) {
  return Math.max(0, Math.min(9, parseNumber(raw, 0)));
}
__name(normalizeKpValue, "normalizeKpValue");
__name2(normalizeKpValue, "normalizeKpValue");
function d1Changes(result) {
  if (!result) return 0;
  if (typeof result.meta?.changes === "number") return result.meta.changes;
  if (typeof result.meta?.rows_written === "number") return result.meta.rows_written;
  if (result.success) return 1;
  return 0;
}
__name(d1Changes, "d1Changes");
__name2(d1Changes, "d1Changes");
function requestIdFromRequest(request) {
  if (!request) return void 0;
  return request.headers.get("cf-ray") ?? request.headers.get("x-request-id") ?? void 0;
}
__name(requestIdFromRequest, "requestIdFromRequest");
__name2(requestIdFromRequest, "requestIdFromRequest");
function clientIpFromRequest(request) {
  if (!request) return "unknown";
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return "unknown";
  return forwardedFor.split(",")[0]?.trim() || "unknown";
}
__name(clientIpFromRequest, "clientIpFromRequest");
__name2(clientIpFromRequest, "clientIpFromRequest");
function normalizedTimezone(input) {
  return isValidTimezone(input) ? input : "UTC";
}
__name(normalizedTimezone, "normalizedTimezone");
__name2(normalizedTimezone, "normalizedTimezone");
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function corsOptionsResponse() {
  return new Response(null, { headers: corsHeaders });
}
__name(corsOptionsResponse, "corsOptionsResponse");
__name2(corsOptionsResponse, "corsOptionsResponse");
function jsonResponse(payload, init = {}) {
  const headers = new Headers(init.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return new Response(JSON.stringify(payload), {
    ...init,
    headers
  });
}
__name(jsonResponse, "jsonResponse");
__name2(jsonResponse, "jsonResponse");
function errorResponse(status, code, message, options = {}) {
  const payload = {
    ok: false,
    error: {
      code,
      message,
      ...options.details !== void 0 ? { details: options.details } : {}
    },
    ...options.requestId ? { requestId: options.requestId } : {}
  };
  return jsonResponse(payload, { status, headers: options.headers });
}
__name(errorResponse, "errorResponse");
__name2(errorResponse, "errorResponse");
function withHeaders(response, headers) {
  if (!headers) return response;
  const merged = new Headers(response.headers);
  const incoming = new Headers(headers);
  incoming.forEach((value, key) => merged.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged
  });
}
__name(withHeaders, "withHeaders");
__name2(withHeaders, "withHeaders");
function logApiEvent(level, event, payload) {
  const record = JSON.stringify({
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    component: "mobile-api",
    event,
    ...payload
  });
  if (level === "error") {
    console.error(record);
    return;
  }
  if (level === "warn") {
    console.warn(record);
    return;
  }
  console.info(record);
}
__name(logApiEvent, "logApiEvent");
__name2(logApiEvent, "logApiEvent");
function createRequestLogger(context) {
  const startedAt = Date.now();
  return (status, extra = {}) => {
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
    logApiEvent(level, "request.complete", {
      route: context.route,
      method: context.method,
      requestId: context.requestId ?? null,
      clientIp: context.clientIp,
      status,
      durationMs: Date.now() - startedAt,
      ...extra
    });
  };
}
__name(createRequestLogger, "createRequestLogger");
__name2(createRequestLogger, "createRequestLogger");
function captureApiError(error, context) {
  logApiEvent("error", "request.error", {
    route: context.route,
    method: context.method,
    requestId: context.requestId ?? null,
    clientIp: context.clientIp,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : void 0,
    ...context.details ?? {}
  });
}
__name(captureApiError, "captureApiError");
__name2(captureApiError, "captureApiError");
function rateLimitHeaders(result) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetEpochSeconds)
  };
}
__name(rateLimitHeaders, "rateLimitHeaders");
__name2(rateLimitHeaders, "rateLimitHeaders");
async function readRateLimitCount(env, key) {
  try {
    const raw = await env?.HELIOSINGER_KV?.get(key, "text");
    if (typeof raw === "string") {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed)) {
        return Math.max(0, parsed);
      }
    }
  } catch {
  }
  return rateLimitStore().get(key) ?? 0;
}
__name(readRateLimitCount, "readRateLimitCount");
__name2(readRateLimitCount, "readRateLimitCount");
async function writeRateLimitCount(env, key, count, ttlSeconds) {
  try {
    if (env?.HELIOSINGER_KV) {
      await env.HELIOSINGER_KV.put(key, String(count), {
        expirationTtl: Math.max(1, ttlSeconds)
      });
      return;
    }
  } catch {
  }
  rateLimitStore().set(key, count);
}
__name(writeRateLimitCount, "writeRateLimitCount");
__name2(writeRateLimitCount, "writeRateLimitCount");
async function enforceRateLimit(env, request, config) {
  const nowSeconds = Math.floor(Date.now() / 1e3);
  const windowStartSeconds = nowSeconds - nowSeconds % config.windowSeconds;
  const resetEpochSeconds = windowStartSeconds + config.windowSeconds;
  const retryAfterSeconds = Math.max(1, resetEpochSeconds - nowSeconds);
  const clientIp = clientIpFromRequest(request);
  const key = `mobile:rate-limit:${config.key}:${clientIp}:${windowStartSeconds}`;
  const current = await readRateLimitCount(env, key);
  if (current >= config.limit) {
    const result2 = {
      allowed: false,
      key,
      limit: config.limit,
      remaining: 0,
      resetEpochSeconds,
      retryAfterSeconds,
      clientIp
    };
    return {
      ...result2,
      headers: rateLimitHeaders(result2)
    };
  }
  const nextCount = current + 1;
  await writeRateLimitCount(env, key, nextCount, retryAfterSeconds + 1);
  const result = {
    allowed: true,
    key,
    limit: config.limit,
    remaining: Math.max(0, config.limit - nextCount),
    resetEpochSeconds,
    retryAfterSeconds,
    clientIp
  };
  return {
    ...result,
    headers: rateLimitHeaders(result)
  };
}
__name(enforceRateLimit, "enforceRateLimit");
__name2(enforceRateLimit, "enforceRateLimit");
async function parseJsonBody(request, requestId) {
  try {
    const parsed = await request.json();
    return { ok: true, value: parsed };
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "invalid_json", "Request body must be valid JSON", {
        requestId
      })
    };
  }
}
__name(parseJsonBody, "parseJsonBody");
__name2(parseJsonBody, "parseJsonBody");
function validateRegistrationPayload(body) {
  const validated = validateDeviceRegistrationRequest(body);
  if (!validated.ok) {
    return {
      ok: false,
      failure: {
        code: "invalid_registration_payload",
        message: "Registration payload is invalid",
        details: validated.errors
      }
    };
  }
  return {
    ok: true,
    payload: {
      ...validated.value,
      timezone: normalizedTimezone(validated.value.timezone),
      platform: normalizePlatform(validated.value.platform) ?? "ios"
    }
  };
}
__name(validateRegistrationPayload, "validateRegistrationPayload");
__name2(validateRegistrationPayload, "validateRegistrationPayload");
function validatePreferencesPayload(body) {
  const validated = validateDevicePreferencesRequest(body, { installIdRequired: true });
  if (!validated.ok) {
    return {
      ok: false,
      failure: {
        code: "invalid_preferences_payload",
        message: "Preferences payload is invalid",
        details: validated.errors
      }
    };
  }
  return {
    ok: true,
    payload: {
      ...validated.value,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
__name(validatePreferencesPayload, "validatePreferencesPayload");
__name2(validatePreferencesPayload, "validatePreferencesPayload");
function validateUnregisterPayload(body) {
  const result = validateDevicePreferencesRequest(body, { installIdRequired: true });
  if (!result.ok || !result.value.installId) {
    return {
      ok: false,
      failure: {
        code: "invalid_install_id",
        message: "installId is required",
        details: result.ok ? void 0 : result.errors
      }
    };
  }
  return { ok: true, installId: result.value.installId };
}
__name(validateUnregisterPayload, "validateUnregisterPayload");
__name2(validateUnregisterPayload, "validateUnregisterPayload");
function parseFlaresLimit(raw) {
  return sanitizeFlaresLimit(raw, 50);
}
__name(parseFlaresLimit, "parseFlaresLimit");
__name2(parseFlaresLimit, "parseFlaresLimit");
async function fetchJsonArray(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const parsed = await response.json();
  return Array.isArray(parsed) ? parsed : null;
}
__name(fetchJsonArray, "fetchJsonArray");
__name2(fetchJsonArray, "fetchJsonArray");
async function fetchLatestSpaceWeather() {
  const [plasmaResult, magResult, kResult, xrayResult] = await Promise.allSettled([
    fetchJsonArray("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json"),
    fetchJsonArray("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json"),
    fetchJsonArray("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"),
    fetchJsonArray("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json")
  ]);
  const plasma = plasmaResult.status === "fulfilled" ? plasmaResult.value : null;
  const mag = magResult.status === "fulfilled" ? magResult.value : null;
  const k = kResult.status === "fulfilled" ? kResult.value : null;
  const xray = xrayResult.status === "fulfilled" ? xrayResult.value : null;
  let solarWind = null;
  if (Array.isArray(plasma) && plasma.length > 1) {
    const latest = plasma[plasma.length - 1];
    solarWind = {
      timestamp: new Date(latest?.[0] ?? Date.now()).toISOString(),
      density: parseNumber(latest?.[1]),
      velocity: parseNumber(latest?.[2]),
      temperature: parseNumber(latest?.[3]),
      bz: 0,
      bt: 0
    };
  }
  if (solarWind && Array.isArray(mag) && mag.length > 1) {
    const latest = mag[mag.length - 1];
    const bx = parseNumber(latest?.[1]);
    const by = parseNumber(latest?.[2]);
    const bz = parseNumber(latest?.[3]);
    solarWind.bz = bz;
    solarWind.bt = parseNumber(latest?.[4], Math.sqrt(bx * bx + by * by + bz * bz));
  }
  let geomagnetic = null;
  if (Array.isArray(k) && k.length > 1) {
    const latest = k[k.length - 1];
    geomagnetic = {
      kp: normalizeKpValue(latest?.[1]),
      aRunning: parseNumber(latest?.[2])
    };
  }
  let flare = null;
  if (Array.isArray(xray) && xray.length > 0) {
    const latest = xray[xray.length - 1];
    const timestamp = new Date(
      latest?.time_tag ?? latest?.timestamp ?? Date.now()
    ).toISOString();
    const shortWave = parseNumber(latest?.xrsa ?? latest?.short_wave ?? latest?.["0.05-0.4nm"]);
    const longWave = parseNumber(latest?.xrsb ?? latest?.long_wave ?? latest?.["0.1-0.8nm"]);
    const flareClass = String(latest?.flare_class ?? classifyFlareClass(longWave || shortWave));
    const rScale = deriveRScale(longWave || shortWave);
    flare = {
      timestamp,
      shortWave,
      longWave,
      flareClass,
      rScale,
      impactSummary: summarizeFlareImpact(flareClass, rScale)
    };
  }
  if (!solarWind && !geomagnetic && !flare) {
    throw new Error("No live upstream datasets are currently available");
  }
  const referenceTimestamp = solarWind?.timestamp ?? flare?.timestamp ?? (/* @__PURE__ */ new Date()).toISOString();
  const staleness = computeStaleness(referenceTimestamp);
  const condition = deriveSpaceWeatherCondition({
    kp: geomagnetic?.kp,
    velocity: solarWind?.velocity,
    bz: solarWind?.bz
  });
  const payload = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    stale: staleness.stale,
    staleSeconds: staleness.staleSeconds,
    source: "live",
    condition,
    solarWind,
    geomagnetic,
    flare,
    impacts: [],
    lastUpdatedAt: referenceTimestamp
  };
  payload.impacts = buildImpactBullets(payload);
  return payload;
}
__name(fetchLatestSpaceWeather, "fetchLatestSpaceWeather");
__name2(fetchLatestSpaceWeather, "fetchLatestSpaceWeather");
async function fetchFlareTimeline(limit = 50) {
  try {
    const response = await fetch("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json");
    if (!response.ok) {
      return [];
    }
    const raw = await response.json();
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.slice(Math.max(0, raw.length - Math.max(1, limit))).map((entry) => {
      const timestamp = new Date(
        entry?.time_tag ?? entry?.timestamp ?? Date.now()
      ).toISOString();
      const shortWave = parseNumber(entry?.xrsa ?? entry?.short_wave ?? entry?.["0.05-0.4nm"]);
      const longWave = parseNumber(entry?.xrsb ?? entry?.long_wave ?? entry?.["0.1-0.8nm"]);
      const flareClass = String(entry?.flare_class ?? classifyFlareClass(longWave || shortWave));
      return toFlareTimelineItem({
        timestamp,
        shortWave,
        longWave,
        flareClass,
        source: "goes"
      });
    }).reverse();
  } catch {
    return [];
  }
}
__name(fetchFlareTimeline, "fetchFlareTimeline");
__name2(fetchFlareTimeline, "fetchFlareTimeline");
function getLearningContext(now) {
  return buildLearningCards(now);
}
__name(getLearningContext, "getLearningContext");
__name2(getLearningContext, "getLearningContext");
function getDefaultPreferences(installId) {
  return {
    installId,
    alertsEnabled: true,
    thresholds: {
      kp: 5,
      bzSouth: 8,
      flareClasses: ["M", "X"]
    },
    quietHours: {
      enabled: false,
      startHour: 22,
      endHour: 7
    },
    backgroundAudioEnabled: true,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(getDefaultPreferences, "getDefaultPreferences");
__name2(getDefaultPreferences, "getDefaultPreferences");
function snapshotWithCurrentStaleness(snapshot, source = "cached") {
  const staleness = computeStaleness(snapshot.lastUpdatedAt);
  return {
    ...snapshot,
    source,
    stale: true,
    staleSeconds: staleness.staleSeconds,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(snapshotWithCurrentStaleness, "snapshotWithCurrentStaleness");
__name2(snapshotWithCurrentStaleness, "snapshotWithCurrentStaleness");
async function persistSnapshot(env, payload) {
  const meta = {
    stored: { d1: false, kv: false, memory: false },
    errors: []
  };
  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      await db.prepare(
        `
        INSERT INTO space_weather_snapshots (
          snapshot_at,
          source,
          condition,
          stale,
          stale_seconds,
          velocity,
          density,
          bz,
          temperature,
          kp,
          flare_class,
          flare_short_wave,
          flare_long_wave,
          flare_r_scale,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).bind(
        payload.lastUpdatedAt,
        payload.source,
        payload.condition,
        payload.stale ? 1 : 0,
        payload.staleSeconds,
        payload.solarWind?.velocity ?? null,
        payload.solarWind?.density ?? null,
        payload.solarWind?.bz ?? null,
        payload.solarWind?.temperature ?? null,
        payload.geomagnetic?.kp ?? null,
        payload.flare?.flareClass ?? null,
        payload.flare?.shortWave ?? null,
        payload.flare?.longWave ?? null,
        payload.flare?.rScale ?? null,
        JSON.stringify(payload)
      ).run();
      meta.stored.d1 = true;
    } catch (error) {
      meta.errors.push(`d1_snapshot_write_failed:${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  if (!meta.stored.d1) {
    const mem = memoryStore();
    mem.snapshots.unshift(payload);
    mem.snapshots = mem.snapshots.slice(0, 200);
    meta.stored.memory = true;
  }
  try {
    await env?.HELIOSINGER_KV?.put("mobile:latest-space-weather", JSON.stringify(payload), {
      expirationTtl: 60 * 60
    });
    if (env?.HELIOSINGER_KV) {
      meta.stored.kv = true;
    }
  } catch (error) {
    meta.errors.push(`kv_snapshot_write_failed:${error instanceof Error ? error.message : "unknown"}`);
  }
  return meta;
}
__name(persistSnapshot, "persistSnapshot");
__name2(persistSnapshot, "persistSnapshot");
async function cachedSnapshot(env) {
  try {
    const fromKv = await env?.HELIOSINGER_KV?.get("mobile:latest-space-weather", "text");
    if (typeof fromKv === "string") {
      try {
        return JSON.parse(fromKv);
      } catch {
      }
    }
  } catch {
  }
  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      const row = await db.prepare("SELECT payload_json FROM space_weather_snapshots ORDER BY id DESC LIMIT 1").first();
      if (row?.payload_json) {
        try {
          return JSON.parse(row.payload_json);
        } catch {
        }
      }
    } catch {
    }
  }
  return memoryStore().snapshots[0] ?? null;
}
__name(cachedSnapshot, "cachedSnapshot");
__name2(cachedSnapshot, "cachedSnapshot");
async function persistFlares(env, items) {
  const meta = {
    stored: { d1: false, kv: false, memory: false },
    errors: []
  };
  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      for (const flare of items) {
        await db.prepare(
          `
          INSERT OR IGNORE INTO flare_events (
            event_id,
            event_at,
            flare_class,
            short_wave,
            long_wave,
            r_scale,
            impact_summary,
            source,
            payload_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).bind(
          flare.id,
          flare.timestamp,
          flare.flareClass,
          flare.shortWave,
          flare.longWave,
          flare.rScale,
          flare.impactSummary,
          flare.source,
          JSON.stringify(flare)
        ).run();
      }
      meta.stored.d1 = true;
    } catch (error) {
      meta.errors.push(`d1_flares_write_failed:${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  if (!meta.stored.d1) {
    const mem = memoryStore();
    const merged = /* @__PURE__ */ new Map();
    for (const existing of mem.flares) {
      merged.set(existing.id, existing);
    }
    for (const incoming of items) {
      merged.set(incoming.id, incoming);
    }
    mem.flares = [...merged.values()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 300);
    meta.stored.memory = true;
  }
  try {
    await env?.HELIOSINGER_KV?.put("mobile:latest-flares", JSON.stringify(items.slice(0, 200)), {
      expirationTtl: 60 * 60
    });
    if (env?.HELIOSINGER_KV) {
      meta.stored.kv = true;
    }
  } catch (error) {
    meta.errors.push(`kv_flares_write_failed:${error instanceof Error ? error.message : "unknown"}`);
  }
  return meta;
}
__name(persistFlares, "persistFlares");
__name2(persistFlares, "persistFlares");
async function cachedFlares(env, limit) {
  try {
    const fromKv = await env?.HELIOSINGER_KV?.get("mobile:latest-flares", "text");
    if (typeof fromKv === "string") {
      try {
        const parsed = JSON.parse(fromKv);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, limit);
        }
      } catch {
      }
    }
  } catch {
  }
  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      const rows = await db.prepare(
        "SELECT event_id, event_at, flare_class, short_wave, long_wave, r_scale, impact_summary, source FROM flare_events ORDER BY event_at DESC LIMIT ?"
      ).bind(limit).all();
      return rows.results.map((row) => ({
        id: row.event_id,
        timestamp: row.event_at,
        flareClass: row.flare_class,
        shortWave: row.short_wave,
        longWave: row.long_wave,
        rScale: row.r_scale,
        impactSummary: row.impact_summary,
        source: row.source === "goes" ? "goes" : "derived"
      }));
    } catch {
    }
  }
  return memoryStore().flares.slice(0, limit);
}
__name(cachedFlares, "cachedFlares");
__name2(cachedFlares, "cachedFlares");
async function registerDevice(env, payload) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const preferences = payload.preferences ?? getDefaultPreferences(payload.installId);
  const timezone = normalizedTimezone(payload.timezone);
  const platform = normalizePlatform(payload.platform) ?? "ios";
  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      await db.prepare(
        `
        INSERT INTO device_subscriptions (
          install_id,
          push_token,
          timezone,
          platform,
          app_version,
          alerts_enabled,
          kp_threshold,
          bz_south_threshold,
          flare_classes,
          quiet_hours_enabled,
          quiet_start_hour,
          quiet_end_hour,
          background_audio_enabled,
          preferences_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(install_id) DO UPDATE SET
          push_token = excluded.push_token,
          timezone = excluded.timezone,
          platform = excluded.platform,
          app_version = excluded.app_version,
          alerts_enabled = excluded.alerts_enabled,
          kp_threshold = excluded.kp_threshold,
          bz_south_threshold = excluded.bz_south_threshold,
          flare_classes = excluded.flare_classes,
          quiet_hours_enabled = excluded.quiet_hours_enabled,
          quiet_start_hour = excluded.quiet_start_hour,
          quiet_end_hour = excluded.quiet_end_hour,
          background_audio_enabled = excluded.background_audio_enabled,
          preferences_json = excluded.preferences_json,
          updated_at = excluded.updated_at
      `
      ).bind(
        payload.installId,
        payload.pushToken,
        timezone,
        platform,
        payload.appVersion ?? null,
        preferences.alertsEnabled ? 1 : 0,
        preferences.thresholds.kp,
        preferences.thresholds.bzSouth,
        JSON.stringify(preferences.thresholds.flareClasses),
        preferences.quietHours.enabled ? 1 : 0,
        preferences.quietHours.startHour,
        preferences.quietHours.endHour,
        preferences.backgroundAudioEnabled ? 1 : 0,
        JSON.stringify(preferences),
        now,
        now
      ).run();
      return;
    } catch {
    }
  }
  memoryStore().devices.set(payload.installId, {
    installId: payload.installId,
    pushToken: payload.pushToken,
    timezone,
    platform,
    appVersion: payload.appVersion ?? null,
    preferences,
    updatedAt: now
  });
}
__name(registerDevice, "registerDevice");
__name2(registerDevice, "registerDevice");
async function updateDevicePreferences(env, payload) {
  const db = env?.HELIOSINGER_DB;
  const now = payload.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  if (db) {
    try {
      const result = await db.prepare(
        `
        UPDATE device_subscriptions
        SET
          alerts_enabled = ?,
          kp_threshold = ?,
          bz_south_threshold = ?,
          flare_classes = ?,
          quiet_hours_enabled = ?,
          quiet_start_hour = ?,
          quiet_end_hour = ?,
          background_audio_enabled = ?,
          preferences_json = ?,
          updated_at = ?
        WHERE install_id = ?
      `
      ).bind(
        payload.alertsEnabled ? 1 : 0,
        payload.thresholds.kp,
        payload.thresholds.bzSouth,
        JSON.stringify(payload.thresholds.flareClasses),
        payload.quietHours.enabled ? 1 : 0,
        payload.quietHours.startHour,
        payload.quietHours.endHour,
        payload.backgroundAudioEnabled ? 1 : 0,
        JSON.stringify(payload),
        now,
        payload.installId
      ).run();
      return d1Changes(result) > 0;
    } catch {
    }
  }
  const existing = memoryStore().devices.get(payload.installId);
  if (!existing) return false;
  memoryStore().devices.set(payload.installId, {
    ...existing,
    preferences: { ...payload, updatedAt: now },
    updatedAt: now
  });
  return true;
}
__name(updateDevicePreferences, "updateDevicePreferences");
__name2(updateDevicePreferences, "updateDevicePreferences");
async function unregisterDevice(env, installId) {
  const db = env?.HELIOSINGER_DB;
  if (db) {
    try {
      const result = await db.prepare("DELETE FROM device_subscriptions WHERE install_id = ?").bind(installId).run();
      return d1Changes(result) > 0;
    } catch {
    }
  }
  return memoryStore().devices.delete(installId);
}
__name(unregisterDevice, "unregisterDevice");
__name2(unregisterDevice, "unregisterDevice");
function getRequestId(request) {
  return requestIdFromRequest(request);
}
__name(getRequestId, "getRequestId");
__name2(getRequestId, "getRequestId");
async function onRequestOptions() {
  return corsOptionsResponse();
}
__name(onRequestOptions, "onRequestOptions");
__name2(onRequestOptions, "onRequestOptions");
async function onRequestPut(context) {
  const requestId = getRequestId(context.request);
  const rateLimit = await enforceRateLimit(context.env, context.request, {
    key: "mobile-v1-devices-preferences-put",
    limit: 40,
    windowSeconds: 600
  });
  const completeRequest = createRequestLogger({
    route: "/api/mobile/v1/devices/preferences",
    method: context.request.method,
    requestId,
    clientIp: rateLimit.clientIp
  });
  if (!rateLimit.allowed) {
    const response = errorResponse(429, "rate_limited", "Too many requests", {
      details: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        resetEpochSeconds: rateLimit.resetEpochSeconds
      },
      requestId,
      headers: {
        ...rateLimit.headers,
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    });
    completeRequest(429, { errorCode: "rate_limited" });
    return response;
  }
  try {
    const parsed = await parseJsonBody(context.request, requestId);
    if (!parsed.ok) {
      const response2 = withHeaders(parsed.response, rateLimit.headers);
      completeRequest(response2.status, { errorCode: "invalid_json" });
      return response2;
    }
    const validated = validatePreferencesPayload(parsed.value);
    if (!validated.ok) {
      const response2 = errorResponse(400, validated.failure.code, validated.failure.message, {
        details: validated.failure.details,
        requestId,
        headers: rateLimit.headers
      });
      completeRequest(400, { errorCode: validated.failure.code });
      return response2;
    }
    const payload = validated.payload;
    const updated = await updateDevicePreferences(context.env, payload);
    if (!updated) {
      const response2 = errorResponse(404, "device_not_found", "Device not found", {
        requestId,
        headers: rateLimit.headers
      });
      completeRequest(404, { errorCode: "device_not_found" });
      return response2;
    }
    const response = jsonResponse(
      {
        ok: true,
        installId: payload.installId,
        meta: { requestId }
      },
      { headers: rateLimit.headers }
    );
    completeRequest(200);
    return response;
  } catch (error) {
    captureApiError(error, {
      route: "/api/mobile/v1/devices/preferences",
      method: context.request.method,
      requestId,
      clientIp: rateLimit.clientIp
    });
    const response = errorResponse(
      500,
      "device_preferences_update_failed",
      "Failed to update device preferences",
      {
        details: error instanceof Error ? error.message : "Unknown error",
        requestId,
        headers: rateLimit.headers
      }
    );
    completeRequest(500, { errorCode: "device_preferences_update_failed" });
    return response;
  }
}
__name(onRequestPut, "onRequestPut");
__name2(onRequestPut, "onRequestPut");
async function onRequestOptions2() {
  return corsOptionsResponse();
}
__name(onRequestOptions2, "onRequestOptions2");
__name2(onRequestOptions2, "onRequestOptions");
async function onRequestPost(context) {
  const requestId = getRequestId(context.request);
  const rateLimit = await enforceRateLimit(context.env, context.request, {
    key: "mobile-v1-devices-register-post",
    limit: 20,
    windowSeconds: 600
  });
  const completeRequest = createRequestLogger({
    route: "/api/mobile/v1/devices/register",
    method: context.request.method,
    requestId,
    clientIp: rateLimit.clientIp
  });
  if (!rateLimit.allowed) {
    const response = errorResponse(429, "rate_limited", "Too many requests", {
      details: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        resetEpochSeconds: rateLimit.resetEpochSeconds
      },
      requestId,
      headers: {
        ...rateLimit.headers,
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    });
    completeRequest(429, { errorCode: "rate_limited" });
    return response;
  }
  try {
    const parsed = await parseJsonBody(context.request, requestId);
    if (!parsed.ok) {
      const response2 = withHeaders(parsed.response, rateLimit.headers);
      completeRequest(response2.status, { errorCode: "invalid_json" });
      return response2;
    }
    const validated = validateRegistrationPayload(parsed.value);
    if (!validated.ok) {
      const response2 = errorResponse(400, validated.failure.code, validated.failure.message, {
        details: validated.failure.details,
        requestId,
        headers: rateLimit.headers
      });
      completeRequest(400, { errorCode: validated.failure.code });
      return response2;
    }
    const payload = {
      ...validated.payload,
      preferences: validated.payload.preferences ?? getDefaultPreferences(validated.payload.installId)
    };
    await registerDevice(context.env, payload);
    const response = jsonResponse(
      {
        ok: true,
        installId: payload.installId,
        registeredAt: (/* @__PURE__ */ new Date()).toISOString(),
        meta: { requestId }
      },
      { status: 201, headers: rateLimit.headers }
    );
    completeRequest(201);
    return response;
  } catch (error) {
    captureApiError(error, {
      route: "/api/mobile/v1/devices/register",
      method: context.request.method,
      requestId,
      clientIp: rateLimit.clientIp
    });
    const response = errorResponse(500, "device_registration_failed", "Failed to register device", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
      headers: rateLimit.headers
    });
    completeRequest(500, { errorCode: "device_registration_failed" });
    return response;
  }
}
__name(onRequestPost, "onRequestPost");
__name2(onRequestPost, "onRequestPost");
async function onRequestOptions3() {
  return corsOptionsResponse();
}
__name(onRequestOptions3, "onRequestOptions3");
__name2(onRequestOptions3, "onRequestOptions");
async function onRequestDelete(context) {
  const requestId = getRequestId(context.request);
  const rateLimit = await enforceRateLimit(context.env, context.request, {
    key: "mobile-v1-devices-unregister-delete",
    limit: 20,
    windowSeconds: 600
  });
  const completeRequest = createRequestLogger({
    route: "/api/mobile/v1/devices/unregister",
    method: context.request.method,
    requestId,
    clientIp: rateLimit.clientIp
  });
  if (!rateLimit.allowed) {
    const response = errorResponse(429, "rate_limited", "Too many requests", {
      details: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        resetEpochSeconds: rateLimit.resetEpochSeconds
      },
      requestId,
      headers: {
        ...rateLimit.headers,
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    });
    completeRequest(429, { errorCode: "rate_limited" });
    return response;
  }
  try {
    const parsed = await parseJsonBody(context.request, requestId);
    if (!parsed.ok) {
      const response2 = withHeaders(parsed.response, rateLimit.headers);
      completeRequest(response2.status, { errorCode: "invalid_json" });
      return response2;
    }
    const validated = validateUnregisterPayload(parsed.value);
    if (!validated.ok) {
      const response2 = errorResponse(400, validated.failure.code, validated.failure.message, {
        details: validated.failure.details,
        requestId,
        headers: rateLimit.headers
      });
      completeRequest(400, { errorCode: validated.failure.code });
      return response2;
    }
    const removed = await unregisterDevice(context.env, validated.installId);
    if (!removed) {
      const response2 = errorResponse(404, "device_not_found", "Device not found", {
        requestId,
        headers: rateLimit.headers
      });
      completeRequest(404, { errorCode: "device_not_found" });
      return response2;
    }
    const response = jsonResponse(
      {
        ok: true,
        installId: validated.installId,
        meta: { requestId }
      },
      { headers: rateLimit.headers }
    );
    completeRequest(200);
    return response;
  } catch (error) {
    captureApiError(error, {
      route: "/api/mobile/v1/devices/unregister",
      method: context.request.method,
      requestId,
      clientIp: rateLimit.clientIp
    });
    const response = errorResponse(500, "device_unregister_failed", "Failed to unregister device", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
      headers: rateLimit.headers
    });
    completeRequest(500, { errorCode: "device_unregister_failed" });
    return response;
  }
}
__name(onRequestDelete, "onRequestDelete");
__name2(onRequestDelete, "onRequestDelete");
async function onRequestOptions4() {
  return corsOptionsResponse();
}
__name(onRequestOptions4, "onRequestOptions4");
__name2(onRequestOptions4, "onRequestOptions");
async function onRequestGet(context) {
  const requestId = getRequestId(context.request);
  const rateLimit = await enforceRateLimit(context.env, context.request, {
    key: "mobile-v1-learn-context-get",
    limit: 120,
    windowSeconds: 60
  });
  const completeRequest = createRequestLogger({
    route: "/api/mobile/v1/learn/context",
    method: context.request.method,
    requestId,
    clientIp: rateLimit.clientIp
  });
  if (!rateLimit.allowed) {
    const response = errorResponse(429, "rate_limited", "Too many requests", {
      details: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        resetEpochSeconds: rateLimit.resetEpochSeconds
      },
      requestId,
      headers: {
        ...rateLimit.headers,
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    });
    completeRequest(429, { errorCode: "rate_limited" });
    return response;
  }
  try {
    const now = await fetchLatestSpaceWeather();
    const storage = await persistSnapshot(context.env, now);
    const cards = getLearningContext(now);
    const response = jsonResponse(
      {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        source: now.source,
        condition: now.condition,
        cards,
        meta: {
          requestId,
          source: "live",
          storage
        }
      },
      { headers: rateLimit.headers }
    );
    completeRequest(200, { source: "live" });
    return response;
  } catch (error) {
    captureApiError(error, {
      route: "/api/mobile/v1/learn/context",
      method: context.request.method,
      requestId,
      clientIp: rateLimit.clientIp
    });
    const cached = await cachedSnapshot(context.env);
    if (cached) {
      const staleSnapshot = snapshotWithCurrentStaleness(cached, "cached");
      const response2 = jsonResponse(
        {
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          source: "cached",
          condition: staleSnapshot.condition,
          cards: getLearningContext(staleSnapshot),
          meta: {
            requestId,
            source: "cached"
          }
        },
        { headers: rateLimit.headers }
      );
      completeRequest(200, { source: "cached" });
      return response2;
    }
    const response = errorResponse(500, "learning_context_failed", "Failed to build learning context", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
      headers: rateLimit.headers
    });
    completeRequest(500, { errorCode: "learning_context_failed" });
    return response;
  }
}
__name(onRequestGet, "onRequestGet");
__name2(onRequestGet, "onRequestGet");
async function onRequestOptions5() {
  return corsOptionsResponse();
}
__name(onRequestOptions5, "onRequestOptions5");
__name2(onRequestOptions5, "onRequestOptions");
async function onRequestGet2(context) {
  const requestId = getRequestId(context.request);
  const rateLimit = await enforceRateLimit(context.env, context.request, {
    key: "mobile-v1-space-weather-now-get",
    limit: 120,
    windowSeconds: 60
  });
  const completeRequest = createRequestLogger({
    route: "/api/mobile/v1/space-weather/now",
    method: context.request.method,
    requestId,
    clientIp: rateLimit.clientIp
  });
  if (!rateLimit.allowed) {
    const response = errorResponse(429, "rate_limited", "Too many requests", {
      details: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        resetEpochSeconds: rateLimit.resetEpochSeconds
      },
      requestId,
      headers: {
        ...rateLimit.headers,
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    });
    completeRequest(429, { errorCode: "rate_limited" });
    return response;
  }
  try {
    const payload = await fetchLatestSpaceWeather();
    const storage = await persistSnapshot(context.env, payload);
    const response = jsonResponse(
      {
        ...payload,
        meta: {
          requestId,
          source: "live",
          storage
        }
      },
      { headers: rateLimit.headers }
    );
    completeRequest(200, { source: "live" });
    return response;
  } catch (error) {
    captureApiError(error, {
      route: "/api/mobile/v1/space-weather/now",
      method: context.request.method,
      requestId,
      clientIp: rateLimit.clientIp
    });
    const cached = await cachedSnapshot(context.env);
    if (cached) {
      const response2 = jsonResponse(
        {
          ...snapshotWithCurrentStaleness(cached, "cached"),
          meta: {
            requestId,
            source: "cached"
          }
        },
        { headers: rateLimit.headers }
      );
      completeRequest(200, { source: "cached" });
      return response2;
    }
    const response = errorResponse(500, "space_weather_now_failed", "Failed to fetch latest space weather", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
      headers: rateLimit.headers
    });
    completeRequest(500, { errorCode: "space_weather_now_failed" });
    return response;
  }
}
__name(onRequestGet2, "onRequestGet2");
__name2(onRequestGet2, "onRequestGet");
async function onRequestOptions6() {
  return corsOptionsResponse();
}
__name(onRequestOptions6, "onRequestOptions6");
__name2(onRequestOptions6, "onRequestOptions");
async function onRequestGet3(context) {
  const requestId = getRequestId(context.request);
  const url = new URL(context.request.url);
  const limit = parseFlaresLimit(url.searchParams.get("limit"));
  const rateLimit = await enforceRateLimit(context.env, context.request, {
    key: "mobile-v1-flares-get",
    limit: 120,
    windowSeconds: 60
  });
  const completeRequest = createRequestLogger({
    route: "/api/mobile/v1/flares",
    method: context.request.method,
    requestId,
    clientIp: rateLimit.clientIp
  });
  if (!rateLimit.allowed) {
    const response = errorResponse(429, "rate_limited", "Too many requests", {
      details: {
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        resetEpochSeconds: rateLimit.resetEpochSeconds
      },
      requestId,
      headers: {
        ...rateLimit.headers,
        "Retry-After": String(rateLimit.retryAfterSeconds)
      }
    });
    completeRequest(429, { errorCode: "rate_limited" });
    return response;
  }
  try {
    const timeline = await fetchFlareTimeline(limit);
    if (timeline.length > 0) {
      const storage = await persistFlares(context.env, timeline);
      const response2 = jsonResponse(
        {
          items: timeline,
          limit,
          source: "live",
          meta: {
            requestId,
            source: "live",
            storage
          }
        },
        { headers: rateLimit.headers }
      );
      completeRequest(200, { source: "live" });
      return response2;
    }
    const cached = await cachedFlares(context.env, limit);
    if (cached.length > 0) {
      const response2 = jsonResponse(
        {
          items: cached,
          limit,
          source: "cached",
          meta: {
            requestId,
            source: "cached"
          }
        },
        { headers: rateLimit.headers }
      );
      completeRequest(200, { source: "cached" });
      return response2;
    }
    const response = jsonResponse(
      {
        items: [],
        limit,
        source: "live",
        meta: {
          requestId,
          source: "live"
        }
      },
      { headers: rateLimit.headers }
    );
    completeRequest(200, { source: "live", empty: true });
    return response;
  } catch (error) {
    captureApiError(error, {
      route: "/api/mobile/v1/flares",
      method: context.request.method,
      requestId,
      clientIp: rateLimit.clientIp,
      details: { limit }
    });
    const response = errorResponse(500, "flare_timeline_failed", "Failed to fetch flare timeline", {
      details: error instanceof Error ? error.message : "Unknown error",
      requestId,
      headers: rateLimit.headers
    });
    completeRequest(500, { errorCode: "flare_timeline_failed" });
    return response;
  }
}
__name(onRequestGet3, "onRequestGet3");
__name2(onRequestGet3, "onRequestGet");
var DEFAULT_MAPPING_CONFIG = {
  id: "default-mapping-1",
  name: "Default Solar Wind Mapping",
  velocity_min: 200,
  velocity_max: 800,
  midi_note_min: 36,
  // C2
  midi_note_max: 84,
  // C6
  density_min: 0.5,
  density_max: 50,
  decay_time_min: 0.2,
  decay_time_max: 5,
  bz_detune_cents: -20,
  bz_threshold: -5,
  is_active: "true",
  created_at: (/* @__PURE__ */ new Date()).toISOString(),
  updated_at: (/* @__PURE__ */ new Date()).toISOString()
};
async function onRequestOptions7() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions7, "onRequestOptions7");
__name2(onRequestOptions7, "onRequestOptions");
async function onRequestGet4() {
  try {
    return new Response(JSON.stringify(DEFAULT_MAPPING_CONFIG), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to fetch active mapping", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet4, "onRequestGet4");
__name2(onRequestGet4, "onRequestGet");
var DEFAULT_MAPPING_CONFIG2 = {
  velocity_min: 200,
  velocity_max: 800,
  midi_note_min: 36,
  midi_note_max: 84,
  density_min: 0.5,
  density_max: 50,
  decay_time_min: 0.2,
  decay_time_max: 5,
  bz_detune_cents: -20,
  bz_threshold: -5
};
var TEST_CONDITION_INPUTS = {
  quiet: { velocity: 350, density: 5, bz: 2 },
  moderate: { velocity: 500, density: 8, bz: -7 },
  storm: { velocity: 750, density: 2, bz: -15 }
};
function buildConfig(config) {
  return {
    velocityMin: config?.velocityMin ?? DEFAULT_MAPPING_CONFIG2.velocity_min,
    velocityMax: config?.velocityMax ?? DEFAULT_MAPPING_CONFIG2.velocity_max,
    midiNoteMin: config?.midiNoteMin ?? DEFAULT_MAPPING_CONFIG2.midi_note_min,
    midiNoteMax: config?.midiNoteMax ?? DEFAULT_MAPPING_CONFIG2.midi_note_max,
    densityMin: config?.densityMin ?? DEFAULT_MAPPING_CONFIG2.density_min,
    densityMax: config?.densityMax ?? DEFAULT_MAPPING_CONFIG2.density_max,
    decayTimeMin: config?.decayTimeMin ?? DEFAULT_MAPPING_CONFIG2.decay_time_min,
    decayTimeMax: config?.decayTimeMax ?? DEFAULT_MAPPING_CONFIG2.decay_time_max,
    bzDetuneCents: config?.bzDetuneCents ?? DEFAULT_MAPPING_CONFIG2.bz_detune_cents,
    bzThreshold: config?.bzThreshold ?? DEFAULT_MAPPING_CONFIG2.bz_threshold
  };
}
__name(buildConfig, "buildConfig");
__name2(buildConfig, "buildConfig");
function buildMappedChord(input, config) {
  const mappingConfig = buildConfig(config);
  const chord = mapSolarWindToChord(input.velocity, input.density, input.bz, {
    velocityMin: mappingConfig.velocityMin,
    velocityMax: mappingConfig.velocityMax,
    midiNoteMin: mappingConfig.midiNoteMin,
    midiNoteMax: mappingConfig.midiNoteMax,
    densityMin: mappingConfig.densityMin,
    densityMax: mappingConfig.densityMax,
    decayTimeMin: mappingConfig.decayTimeMin,
    decayTimeMax: mappingConfig.decayTimeMax,
    bzDetuneCents: mappingConfig.bzDetuneCents,
    bzThreshold: mappingConfig.bzThreshold
  });
  return {
    ...chord,
    baseNote: chord.noteName,
    velocity: input.velocity,
    density: input.density,
    bz: input.bz,
    frequency: Math.round(chord.frequency * 100) / 100,
    decayTime: Math.round(chord.decayTime * 100) / 100
  };
}
__name(buildMappedChord, "buildMappedChord");
__name2(buildMappedChord, "buildMappedChord");
function getTestConditionInput(condition) {
  if (!(condition in TEST_CONDITION_INPUTS)) {
    return null;
  }
  return TEST_CONDITION_INPUTS[condition];
}
__name(getTestConditionInput, "getTestConditionInput");
__name2(getTestConditionInput, "getTestConditionInput");
async function onRequestOptions8() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions8, "onRequestOptions8");
__name2(onRequestOptions8, "onRequestOptions");
async function onRequestPost2(context) {
  try {
    const { velocity, density, bz } = await context.request.json();
    if (typeof velocity !== "number" || typeof density !== "number" || typeof bz !== "number") {
      return new Response(
        JSON.stringify({ message: "Invalid input parameters" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
    const chordData = buildMappedChord({ velocity, density, bz });
    return new Response(JSON.stringify(chordData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to calculate chord mapping", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestPost2, "onRequestPost2");
__name2(onRequestPost2, "onRequestPost");
async function onRequestOptions9() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions9, "onRequestOptions9");
__name2(onRequestOptions9, "onRequestOptions");
async function onRequestPost3(context) {
  try {
    const { condition } = await context.request.json();
    const testData = getTestConditionInput(condition);
    if (!testData) {
      return new Response(
        JSON.stringify({ message: "Invalid condition. Use 'quiet', 'moderate', or 'storm'" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
    const { velocity, density, bz } = testData;
    const chordData = buildMappedChord({ velocity, density, bz });
    return new Response(JSON.stringify({
      condition,
      canonicalCondition: chordData.condition,
      testData,
      chord: chordData
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to test space weather condition", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestPost3, "onRequestPost3");
__name2(onRequestPost3, "onRequestPost");
async function onRequestOptions10() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions10, "onRequestOptions10");
__name2(onRequestOptions10, "onRequestOptions");
async function onRequestGet5() {
  const defaultSettings = {
    enabled: "false",
    intensity: 0.5,
    volume: 0.3,
    respect_night: "true",
    day_only: "false",
    smoothing: 0.8,
    max_rate: 10,
    battery_min: 20
  };
  return new Response(JSON.stringify(defaultSettings), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestGet5, "onRequestGet5");
__name2(onRequestGet5, "onRequestGet");
async function onRequestPost4(context) {
  try {
    const body = await context.request.json();
    return new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to update settings", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestPost4, "onRequestPost4");
__name2(onRequestPost4, "onRequestPost");
async function onRequestOptions11() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions11, "onRequestOptions11");
__name2(onRequestOptions11, "onRequestOptions");
async function onRequestGet6() {
  try {
    const plasmaResponse = await fetch("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json");
    if (!plasmaResponse.ok) {
      throw new Error(`NOAA plasma API error: ${plasmaResponse.status}`);
    }
    const plasmaData = await plasmaResponse.json();
    const dataRows = plasmaData.slice(1);
    const latestPlasma = dataRows[dataRows.length - 1];
    let bz = 0;
    let bx = 0;
    let by = 0;
    let bt = 0;
    try {
      const magResponse = await fetch("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json");
      if (magResponse.ok) {
        const magData = await magResponse.json();
        const magRows = magData.slice(1);
        const latestMag = magRows[magRows.length - 1];
        if (latestMag && latestMag.length >= 5) {
          bx = parseFloat(latestMag[1]) || 0;
          by = parseFloat(latestMag[2]) || 0;
          bz = parseFloat(latestMag[3]) || 0;
          bt = parseFloat(latestMag[4]) || 0;
        }
      }
    } catch (magError) {
      console.warn("Failed to fetch magnetometer data:", magError);
    }
    if (!latestPlasma || latestPlasma.length < 4) {
      throw new Error(`Invalid NOAA data format`);
    }
    const solarWindData = {
      id: `sw-${Date.now()}`,
      timestamp: new Date(latestPlasma[0]).toISOString(),
      velocity: parseFloat(latestPlasma[2]) || 0,
      // speed km/s
      density: parseFloat(latestPlasma[1]) || 0,
      // proton density p/cm³
      bz,
      bx,
      by,
      bt: bt || Math.sqrt(bx * bx + by * by + bz * bz),
      // Calculate Bt if not provided
      temperature: parseFloat(latestPlasma[3]) || 0,
      raw_data: latestPlasma
    };
    return new Response(JSON.stringify(solarWindData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to fetch NOAA data", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet6, "onRequestGet6");
__name2(onRequestGet6, "onRequestGet");
async function onRequestOptions12() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions12, "onRequestOptions12");
__name2(onRequestOptions12, "onRequestOptions");
async function onRequestPost5() {
  try {
    const plasmaResponse = await fetch("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json");
    if (!plasmaResponse.ok) {
      throw new Error(`NOAA plasma API error: ${plasmaResponse.status}`);
    }
    const plasmaData = await plasmaResponse.json();
    const dataRows = plasmaData.slice(1);
    const latestPlasma = dataRows[dataRows.length - 1];
    let bz = 0;
    try {
      const magResponse = await fetch("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json");
      if (magResponse.ok) {
        const magData = await magResponse.json();
        const magRows = magData.slice(1);
        const latestMag = magRows[magRows.length - 1];
        if (latestMag && latestMag.length >= 4) {
          bz = parseFloat(latestMag[3]) || 0;
        }
      }
    } catch (magError) {
      console.warn("Failed to fetch magnetometer data:", magError);
    }
    if (!latestPlasma || latestPlasma.length < 4) {
      throw new Error(`Invalid NOAA data format`);
    }
    const solarWindData = {
      id: `sw-${Date.now()}`,
      timestamp: new Date(latestPlasma[0]).toISOString(),
      velocity: parseFloat(latestPlasma[2]) || 0,
      // speed km/s
      density: parseFloat(latestPlasma[1]) || 0,
      // proton density p/cm³
      bz,
      bt: null,
      temperature: parseFloat(latestPlasma[3]) || 0,
      raw_data: latestPlasma
    };
    return new Response(JSON.stringify(solarWindData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to fetch NOAA data", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestPost5, "onRequestPost5");
__name2(onRequestPost5, "onRequestPost");
async function onRequestOptions13() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions13, "onRequestOptions13");
__name2(onRequestOptions13, "onRequestOptions");
async function onRequestGet7(context) {
  try {
    const url = new URL(context.request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const plasmaResponse = await fetch("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json");
    if (!plasmaResponse.ok) {
      throw new Error(`NOAA plasma API error: ${plasmaResponse.status}`);
    }
    const plasmaData = await plasmaResponse.json();
    const dataRows = plasmaData.slice(1);
    let magData = [];
    try {
      const magResponse = await fetch("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json");
      if (magResponse.ok) {
        const magJson = await magResponse.json();
        magData = magJson.slice(1);
      }
    } catch (magError) {
      console.warn("Failed to fetch magnetometer data:", magError);
    }
    const readings = dataRows.slice(-limit).map((row, index) => {
      const plasmaTime = new Date(row[0]).getTime();
      let bz = 0;
      for (const magRow of magData) {
        if (magRow && magRow.length >= 4) {
          const magTime = new Date(magRow[0]).getTime();
          const timeDiff = Math.abs(plasmaTime - magTime);
          if (timeDiff < 5 * 60 * 1e3) {
            bz = parseFloat(magRow[3]) || 0;
            break;
          }
        }
      }
      return {
        id: `sw-${Date.now()}-${index}`,
        timestamp: new Date(row[0]).toISOString(),
        velocity: parseFloat(row[2]) || 0,
        density: parseFloat(row[1]) || 0,
        bz,
        bt: null,
        temperature: parseFloat(row[3]) || 0,
        raw_data: row
      };
    });
    return new Response(JSON.stringify(readings), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to fetch NOAA history", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet7, "onRequestGet7");
__name2(onRequestGet7, "onRequestGet");
function getNumberCandidate(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
__name(getNumberCandidate, "getNumberCandidate");
__name2(getNumberCandidate, "getNumberCandidate");
function parseNumber2(value) {
  return getNumberCandidate(value) ?? 0;
}
__name(parseNumber2, "parseNumber2");
__name2(parseNumber2, "parseNumber");
function parseXrayFlux(input, now = (/* @__PURE__ */ new Date()).toISOString()) {
  if (input === null || input === void 0) return null;
  let shortWave = 0;
  let longWave = 0;
  let timestamp = now;
  let providedFlareClass;
  let begin;
  let current;
  let end;
  let maxFlux;
  let note;
  if (Array.isArray(input) && input.length > 0) {
    const latest = input[input.length - 1];
    if (Array.isArray(latest)) {
      timestamp = latest[0] ? new Date(latest[0]).toISOString() : timestamp;
      shortWave = parseNumber2(latest[1]) || parseNumber2(latest[2]);
      longWave = parseNumber2(latest[2]) || parseNumber2(latest[3]);
    } else if (typeof latest === "object") {
      return parseXrayFlux(latest, now);
    } else {
      return null;
    }
  } else if (typeof input === "object") {
    const data = input;
    timestamp = data.timestamp ? new Date(String(data.timestamp)).toISOString() : timestamp;
    shortWave = parseNumber2(data.short_wave) || parseNumber2(data["0.05-0.4nm"]) || parseNumber2(data.xrsa) || parseNumber2(data.xrs_short) || parseNumber2(data.current);
    longWave = parseNumber2(data.long_wave) || parseNumber2(data["0.1-0.8nm"]) || parseNumber2(data.xrsb) || parseNumber2(data.xrs_long);
    providedFlareClass = typeof data.flare_class === "string" ? data.flare_class : void 0;
    begin = typeof data.begin === "string" ? data.begin : void 0;
    current = typeof data.current === "string" ? data.current : void 0;
    end = typeof data.end === "string" ? data.end : void 0;
    maxFlux = typeof data.max_flux === "string" ? data.max_flux : void 0;
    note = typeof data.note === "string" ? data.note : void 0;
  } else {
    return null;
  }
  const calculatedFlareClass = classifyFlareClass(shortWave);
  const flareClass = providedFlareClass && ["A", "B", "C", "M", "X"].includes(providedFlareClass[0]) ? providedFlareClass : calculatedFlareClass;
  const payload = {
    timestamp,
    short_wave: shortWave,
    long_wave: longWave,
    flare_class: flareClass
  };
  if (begin) payload.begin = begin;
  if (current) payload.current = current;
  if (end) payload.end = end;
  if (maxFlux) payload.max_flux = maxFlux;
  if (note) payload.note = note;
  return payload;
}
__name(parseXrayFlux, "parseXrayFlux");
__name2(parseXrayFlux, "parseXrayFlux");
async function onRequestOptions14() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions14, "onRequestOptions14");
__name2(onRequestOptions14, "onRequestOptions");
async function onRequestGet8() {
  try {
    const PLASMATAIL_MONITOR_URL = "https://plasmatail-monitor.shannonlabs.io";
    const [solarWind, kIndex, xrayFlux, protonFlux, electronFlux, magnetometer, reconnection] = await Promise.allSettled([
      fetch("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json").then((r) => r.json()),
      fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json").then((r) => r.json()),
      fetch("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json").then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("https://services.swpc.noaa.gov/json/goes/goes-r_proton-1m.json").then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("https://services.swpc.noaa.gov/json/goes/goes-r_electron-1m.json").then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("https://services.swpc.noaa.gov/json/boulder/magnetometer.json").then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch(`${PLASMATAIL_MONITOR_URL}/v1/monitor/signals?limit=1&type=reconnection_composite`, { signal: AbortSignal.timeout(3e3) }).then((r) => r.ok ? r.json() : null).catch(() => null)
    ]);
    let solarWindData = null;
    if (solarWind.status === "fulfilled" && Array.isArray(solarWind.value) && solarWind.value.length > 1) {
      const rows = solarWind.value.slice(1);
      const latest = rows[rows.length - 1];
      solarWindData = {
        timestamp: new Date(latest[0]).toISOString(),
        velocity: parseFloat(latest[2]) || 0,
        density: parseFloat(latest[1]) || 0,
        temperature: parseFloat(latest[3]) || 0
      };
    }
    let bz = 0;
    let bx = 0;
    let by = 0;
    let bt = 0;
    try {
      const magResponse = await fetch("https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json");
      if (magResponse.ok) {
        const magData = await magResponse.json();
        const magRows = magData.slice(1);
        const latestMag = magRows[magRows.length - 1];
        if (latestMag && latestMag.length >= 5) {
          bx = parseFloat(latestMag[1]) || 0;
          by = parseFloat(latestMag[2]) || 0;
          bz = parseFloat(latestMag[3]) || 0;
          bt = parseFloat(latestMag[4]) || 0;
        }
      }
    } catch (e) {
    }
    if (solarWindData) {
      solarWindData.bz = bz;
      solarWindData.bx = bx;
      solarWindData.by = by;
      solarWindData.bt = bt || Math.sqrt(bx * bx + by * by + bz * bz);
    }
    let kIndexData = null;
    if (kIndex.status === "fulfilled" && Array.isArray(kIndex.value) && kIndex.value.length > 1) {
      const rows = kIndex.value.slice(1);
      const latest = rows[rows.length - 1];
      kIndexData = {
        timestamp: new Date(latest[0]).toISOString(),
        kp: parseFloat(latest[1]) || 0,
        a_running: parseFloat(latest[2]) || 0
      };
    }
    let xrayData = null;
    if (xrayFlux.status === "fulfilled" && xrayFlux.value) {
      xrayData = parseXrayFlux(xrayFlux.value);
    }
    let protonData = null;
    if (protonFlux.status === "fulfilled" && protonFlux.value) {
      if (Array.isArray(protonFlux.value) && protonFlux.value.length > 1) {
        const rows = protonFlux.value.slice(1);
        const latest = rows[rows.length - 1];
        protonData = {
          timestamp: new Date(latest[0] || Date.now()).toISOString(),
          flux_10mev: parseFloat(latest[1]) || 0,
          flux_50mev: parseFloat(latest[2]) || 0,
          flux_100mev: parseFloat(latest[3]) || 0
        };
      }
    }
    let electronData = null;
    if (electronFlux.status === "fulfilled" && electronFlux.value) {
      if (Array.isArray(electronFlux.value) && electronFlux.value.length > 1) {
        const rows = electronFlux.value.slice(1);
        const latest = rows[rows.length - 1];
        electronData = {
          timestamp: new Date(latest[0] || Date.now()).toISOString(),
          flux_2mev: parseFloat(latest[1]) || 0,
          flux_0_8mev: parseFloat(latest[2]) || 0
        };
      }
    }
    let magnetometerData = null;
    if (magnetometer.status === "fulfilled" && magnetometer.value) {
      if (Array.isArray(magnetometer.value) && magnetometer.value.length > 1) {
        const rows = magnetometer.value.slice(1);
        const latest = rows[rows.length - 1];
        magnetometerData = {
          timestamp: new Date(latest[0] || Date.now()).toISOString(),
          h_component: parseFloat(latest[1]) || 0,
          d_component: parseFloat(latest[2]) || 0,
          z_component: parseFloat(latest[3]) || 0
        };
      }
    }
    let reconnectionData = null;
    if (reconnection.status === "fulfilled" && reconnection.value) {
      try {
        const signals = Array.isArray(reconnection.value) ? reconnection.value : reconnection.value.signals;
        if (Array.isArray(signals) && signals.length > 0) {
          const latest = signals[0];
          const meta = latest.metadata || {};
          reconnectionData = {
            timestamp: latest.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
            score: typeof meta.score === "number" ? meta.score : parseFloat(latest.value) || 0,
            level: latest.level || "WATCH",
            raw_score: typeof meta.raw_score === "number" ? meta.raw_score : 0,
            kp_boost: typeof meta.kp_boost === "number" ? meta.kp_boost : 1,
            contributors: meta.contributors || {}
          };
        }
      } catch {
      }
    }
    const comprehensiveData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      solar_wind: solarWindData ? { ...solarWindData, bz } : null,
      k_index: kIndexData,
      xray_flux: xrayData,
      proton_flux: protonData,
      electron_flux: electronData,
      magnetometer: magnetometerData,
      reconnection: reconnectionData
    };
    return new Response(JSON.stringify(comprehensiveData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to fetch comprehensive space weather data", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet8, "onRequestGet8");
__name2(onRequestGet8, "onRequestGet");
async function onRequestOptions15() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions15, "onRequestOptions15");
__name2(onRequestOptions15, "onRequestOptions");
async function onRequestGet9() {
  try {
    const response = await fetch("https://services.swpc.noaa.gov/json/goes/goes-r_electron-1m.json");
    if (!response.ok) {
      return new Response(JSON.stringify({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        flux_2mev: 0,
        flux_0_8mev: 0,
        note: "Data source temporarily unavailable"
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    const data = await response.json();
    let electronData;
    if (Array.isArray(data) && data.length > 1) {
      const rows = data.slice(1);
      const latest = rows[rows.length - 1];
      electronData = {
        timestamp: new Date(latest[0] || Date.now()).toISOString(),
        flux_2mev: parseFloat(latest[1]) || 0,
        flux_0_8mev: parseFloat(latest[2]) || 0
      };
    } else if (data && typeof data === "object") {
      electronData = {
        timestamp: data.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        flux_2mev: data.flux_2mev || data["2MeV"] || 0,
        flux_0_8mev: data.flux_0_8mev || data["0.8MeV"] || 0
      };
    } else {
      throw new Error("Unexpected data format");
    }
    return new Response(JSON.stringify(electronData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        message: "Failed to fetch electron flux data",
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        flux_2mev: 0,
        flux_0_8mev: 0
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet9, "onRequestGet9");
__name2(onRequestGet9, "onRequestGet");
async function onRequestOptions16() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions16, "onRequestOptions16");
__name2(onRequestOptions16, "onRequestOptions");
async function onRequestGet10() {
  try {
    const response = await fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json");
    if (!response.ok) {
      throw new Error(`NOAA K-index API error: ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error("Invalid K-index data format");
    }
    const rows = data.slice(1);
    const latest = rows[rows.length - 1];
    const last24h = rows.slice(-24);
    const kIndexData = {
      timestamp: new Date(latest[0]).toISOString(),
      kp: parseFloat(latest[1]) || 0,
      a_running: parseFloat(latest[2]) || 0,
      station_count: parseInt(latest[3]) || 0,
      history: last24h.map((row) => ({
        timestamp: new Date(row[0]).toISOString(),
        kp: parseFloat(row[1]) || 0,
        a_running: parseFloat(row[2]) || 0
      }))
    };
    return new Response(JSON.stringify(kIndexData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to fetch K-index data", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet10, "onRequestGet10");
__name2(onRequestGet10, "onRequestGet");
async function onRequestOptions17() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions17, "onRequestOptions17");
__name2(onRequestOptions17, "onRequestOptions");
async function onRequestGet11() {
  try {
    const response = await fetch("https://services.swpc.noaa.gov/json/boulder/magnetometer.json");
    if (!response.ok) {
      return new Response(JSON.stringify({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        h_component: 0,
        d_component: 0,
        z_component: 0,
        note: "Data source temporarily unavailable"
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    const data = await response.json();
    let magnetometerData;
    if (Array.isArray(data) && data.length > 1) {
      const rows = data.slice(1);
      const latest = rows[rows.length - 1];
      magnetometerData = {
        timestamp: new Date(latest[0] || Date.now()).toISOString(),
        h_component: parseFloat(latest[1]) || 0,
        d_component: parseFloat(latest[2]) || 0,
        z_component: parseFloat(latest[3]) || 0
      };
    } else if (data && typeof data === "object" && !Array.isArray(data)) {
      magnetometerData = {
        timestamp: data.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        h_component: data.h_component || data.H || 0,
        d_component: data.d_component || data.D || 0,
        z_component: data.z_component || data.Z || 0
      };
    } else {
      const latest = Array.isArray(data) ? data[data.length - 1] : data;
      magnetometerData = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        h_component: latest?.h || latest?.H || 0,
        d_component: latest?.d || latest?.D || 0,
        z_component: latest?.z || latest?.Z || 0
      };
    }
    return new Response(JSON.stringify(magnetometerData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        message: "Failed to fetch magnetometer data",
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        h_component: 0,
        d_component: 0,
        z_component: 0
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet11, "onRequestGet11");
__name2(onRequestGet11, "onRequestGet");
async function onRequestOptions18() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions18, "onRequestOptions18");
__name2(onRequestOptions18, "onRequestOptions");
async function onRequestGet12() {
  try {
    const response = await fetch("https://services.swpc.noaa.gov/json/goes/goes-r_proton-1m.json");
    if (!response.ok) {
      return new Response(JSON.stringify({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        flux_10mev: 0,
        flux_50mev: 0,
        flux_100mev: 0,
        note: "Data source temporarily unavailable"
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    const data = await response.json();
    let protonData;
    if (Array.isArray(data) && data.length > 1) {
      const rows = data.slice(1);
      const latest = rows[rows.length - 1];
      protonData = {
        timestamp: new Date(latest[0] || Date.now()).toISOString(),
        flux_10mev: parseFloat(latest[1]) || 0,
        flux_50mev: parseFloat(latest[2]) || 0,
        flux_100mev: parseFloat(latest[3]) || 0
      };
    } else if (data && typeof data === "object") {
      protonData = {
        timestamp: data.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        flux_10mev: data.flux_10mev || data["10MeV"] || 0,
        flux_50mev: data.flux_50mev || data["50MeV"] || 0,
        flux_100mev: data.flux_100mev || data["100MeV"] || 0
      };
    } else {
      throw new Error("Unexpected data format");
    }
    return new Response(JSON.stringify(protonData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        message: "Failed to fetch proton flux data",
        error: errorMessage,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        flux_10mev: 0,
        flux_50mev: 0,
        flux_100mev: 0
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet12, "onRequestGet12");
__name2(onRequestGet12, "onRequestGet");
async function onRequestOptions19() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions19, "onRequestOptions19");
__name2(onRequestOptions19, "onRequestOptions");
async function onRequestGet13() {
  try {
    let xrayData = null;
    let error = null;
    try {
      const response = await fetch("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json");
      if (response.ok) {
        const data = await response.json();
        if (data) {
          xrayData = parseXrayFlux(data);
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
    }
    if (!xrayData) {
      try {
        const response = await fetch("https://services.swpc.noaa.gov/text/goes-xray-report.txt");
        if (response.ok) {
          const text = await response.text();
          const lines = text.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
          if (lines.length > 0) {
            const latest = lines[lines.length - 1].trim().split(/\s+/);
            if (latest.length >= 7) {
              const maxFlux = parseFloat(latest[7]) || 0;
              const timestamp = `${latest[0]}-${latest[1]}-${latest[2]} ${latest[3].slice(0, 2)}:${latest[3].slice(2, 4)}:00`;
              const flareClass = classifyFlareClass(maxFlux);
              xrayData = {
                timestamp,
                short_wave: maxFlux,
                long_wave: 0,
                flare_class: flareClass,
                begin: latest[4],
                current: latest[5],
                end: latest[6],
                max_flux: latest[7] || "0"
              };
            }
          }
        }
      } catch (e) {
        error = e instanceof Error ? e.message : "Unknown error";
      }
    }
    if (!xrayData) {
      xrayData = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        short_wave: 0,
        long_wave: 0,
        flare_class: "A",
        note: "Data source temporarily unavailable"
      };
    }
    return new Response(JSON.stringify(xrayData), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to fetch X-ray flux data", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet13, "onRequestGet13");
__name2(onRequestGet13, "onRequestGet");
async function onRequestOptions20() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions20, "onRequestOptions20");
__name2(onRequestOptions20, "onRequestOptions");
async function onRequestGet14(context) {
  try {
    const statuses = [
      {
        id: "status-1",
        component: "data_stream",
        status: "active",
        details: "Connected to NOAA DSCOVR",
        last_update: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "status-2",
        component: "network",
        status: "active",
        details: "Online",
        last_update: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    return new Response(JSON.stringify(statuses), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ message: "Failed to fetch system status", error: errorMessage }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
__name(onRequestGet14, "onRequestGet14");
__name2(onRequestGet14, "onRequestGet");
var routes = [
  {
    routePath: "/api/mobile/v1/devices/preferences",
    mountPath: "/api/mobile/v1/devices",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/mobile/v1/devices/preferences",
    mountPath: "/api/mobile/v1/devices",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/mobile/v1/devices/register",
    mountPath: "/api/mobile/v1/devices",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/api/mobile/v1/devices/register",
    mountPath: "/api/mobile/v1/devices",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/mobile/v1/devices/unregister",
    mountPath: "/api/mobile/v1/devices",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/mobile/v1/devices/unregister",
    mountPath: "/api/mobile/v1/devices",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions3]
  },
  {
    routePath: "/api/mobile/v1/learn/context",
    mountPath: "/api/mobile/v1/learn",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/mobile/v1/learn/context",
    mountPath: "/api/mobile/v1/learn",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions4]
  },
  {
    routePath: "/api/mobile/v1/space-weather/now",
    mountPath: "/api/mobile/v1/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/mobile/v1/space-weather/now",
    mountPath: "/api/mobile/v1/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions5]
  },
  {
    routePath: "/api/mobile/v1/flares",
    mountPath: "/api/mobile/v1",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/mobile/v1/flares",
    mountPath: "/api/mobile/v1",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions6]
  },
  {
    routePath: "/api/mapping/active",
    mountPath: "/api/mapping",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/mapping/active",
    mountPath: "/api/mapping",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions7]
  },
  {
    routePath: "/api/mapping/calculate-chord",
    mountPath: "/api/mapping",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions8]
  },
  {
    routePath: "/api/mapping/calculate-chord",
    mountPath: "/api/mapping",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/mapping/test-condition",
    mountPath: "/api/mapping",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions9]
  },
  {
    routePath: "/api/mapping/test-condition",
    mountPath: "/api/mapping",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/settings/ambient",
    mountPath: "/api/settings",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/settings/ambient",
    mountPath: "/api/settings",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions10]
  },
  {
    routePath: "/api/settings/ambient",
    mountPath: "/api/settings",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/solar-wind/current",
    mountPath: "/api/solar-wind",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/solar-wind/current",
    mountPath: "/api/solar-wind",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions11]
  },
  {
    routePath: "/api/solar-wind/fetch",
    mountPath: "/api/solar-wind",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions12]
  },
  {
    routePath: "/api/solar-wind/fetch",
    mountPath: "/api/solar-wind",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/solar-wind/history",
    mountPath: "/api/solar-wind",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/solar-wind/history",
    mountPath: "/api/solar-wind",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions13]
  },
  {
    routePath: "/api/space-weather/comprehensive",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/space-weather/comprehensive",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions14]
  },
  {
    routePath: "/api/space-weather/electron-flux",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/api/space-weather/electron-flux",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions15]
  },
  {
    routePath: "/api/space-weather/k-index",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet10]
  },
  {
    routePath: "/api/space-weather/k-index",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions16]
  },
  {
    routePath: "/api/space-weather/magnetometer",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet11]
  },
  {
    routePath: "/api/space-weather/magnetometer",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions17]
  },
  {
    routePath: "/api/space-weather/proton-flux",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet12]
  },
  {
    routePath: "/api/space-weather/proton-flux",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions18]
  },
  {
    routePath: "/api/space-weather/xray-flux",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet13]
  },
  {
    routePath: "/api/space-weather/xray-flux",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions19]
  },
  {
    routePath: "/api/system/status",
    mountPath: "/api/system",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet14]
  },
  {
    routePath: "/api/system/status",
    mountPath: "/api/system",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions20]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// ../../../Users/hunterbown/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// ../../../Users/hunterbown/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-1A2atf/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../../../Users/hunterbown/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-1A2atf/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.24172463752349738.js.map
