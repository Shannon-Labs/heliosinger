var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-u8W9o7/checked-fetch.js
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

// .wrangler/tmp/pages-CEQi0j/functionsWorker-0.270591007620979.mjs
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
async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions, "onRequestOptions");
__name2(onRequestOptions, "onRequestOptions");
async function onRequestGet() {
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
__name(onRequestGet, "onRequestGet");
__name2(onRequestGet, "onRequestGet");
var DEFAULT_CONFIG = {
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
  bz_threshold: -5
};
async function onRequestOptions2() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions2, "onRequestOptions2");
__name2(onRequestOptions2, "onRequestOptions");
async function onRequestPost(context) {
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
    const velocityRange = DEFAULT_CONFIG.velocity_max - DEFAULT_CONFIG.velocity_min;
    const midiRange = DEFAULT_CONFIG.midi_note_max - DEFAULT_CONFIG.midi_note_min;
    const velocityNormalized = Math.max(0, Math.min(1, (velocity - DEFAULT_CONFIG.velocity_min) / velocityRange));
    const midiNote = Math.round(DEFAULT_CONFIG.midi_note_min + velocityNormalized * midiRange);
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor((midiNote - 12) / 12);
    const noteIndex = (midiNote - 12) % 12;
    const noteName = `${noteNames[noteIndex]}${octave}`;
    const densityNormalized = Math.max(0, Math.min(1, Math.log(density / DEFAULT_CONFIG.density_min) / Math.log(DEFAULT_CONFIG.density_max / DEFAULT_CONFIG.density_min)));
    const decayTime = DEFAULT_CONFIG.decay_time_min + (1 - densityNormalized) * (DEFAULT_CONFIG.decay_time_max - DEFAULT_CONFIG.decay_time_min);
    const detuneCents = bz < DEFAULT_CONFIG.bz_threshold ? DEFAULT_CONFIG.bz_detune_cents : 0;
    let condition = "quiet";
    if (velocity > 600 || Math.abs(bz) > 10) {
      condition = "storm";
    } else if (velocity > 450 || Math.abs(bz) > 5) {
      condition = "moderate";
    }
    const chordData = {
      baseNote: noteName,
      frequency,
      midiNote,
      decayTime: Math.round(decayTime * 100) / 100,
      detuneCents,
      condition,
      velocity,
      density,
      bz
    };
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
__name(onRequestPost, "onRequestPost");
__name2(onRequestPost, "onRequestPost");
async function onRequestOptions3() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions3, "onRequestOptions3");
__name2(onRequestOptions3, "onRequestOptions");
async function onRequestPost2(context) {
  try {
    const { condition } = await context.request.json();
    let testData;
    switch (condition) {
      case "quiet":
        testData = { velocity: 350, density: 5, bz: 2 };
        break;
      case "moderate":
        testData = { velocity: 500, density: 8, bz: -7 };
        break;
      case "storm":
        testData = { velocity: 750, density: 2, bz: -15 };
        break;
      default:
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
    const DEFAULT_CONFIG2 = {
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
    const { velocity, density, bz } = testData;
    const velocityRange = DEFAULT_CONFIG2.velocity_max - DEFAULT_CONFIG2.velocity_min;
    const midiRange = DEFAULT_CONFIG2.midi_note_max - DEFAULT_CONFIG2.midi_note_min;
    const velocityNormalized = Math.max(0, Math.min(1, (velocity - DEFAULT_CONFIG2.velocity_min) / velocityRange));
    const midiNote = Math.round(DEFAULT_CONFIG2.midi_note_min + velocityNormalized * midiRange);
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const octave = Math.floor((midiNote - 12) / 12);
    const noteIndex = (midiNote - 12) % 12;
    const noteName = `${noteNames[noteIndex]}${octave}`;
    const densityNormalized = Math.max(0, Math.min(1, Math.log(density / DEFAULT_CONFIG2.density_min) / Math.log(DEFAULT_CONFIG2.density_max / DEFAULT_CONFIG2.density_min)));
    const decayTime = DEFAULT_CONFIG2.decay_time_min + (1 - densityNormalized) * (DEFAULT_CONFIG2.decay_time_max - DEFAULT_CONFIG2.decay_time_min);
    const detuneCents = bz < DEFAULT_CONFIG2.bz_threshold ? DEFAULT_CONFIG2.bz_detune_cents : 0;
    const chordData = {
      baseNote: noteName,
      frequency,
      midiNote,
      decayTime: Math.round(decayTime * 100) / 100,
      detuneCents,
      condition,
      velocity,
      density,
      bz
    };
    return new Response(JSON.stringify({ condition, testData, chord: chordData }), {
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
__name(onRequestPost2, "onRequestPost2");
__name2(onRequestPost2, "onRequestPost");
async function onRequestOptions4() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions4, "onRequestOptions4");
__name2(onRequestOptions4, "onRequestOptions");
async function onRequestGet2() {
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
__name(onRequestGet2, "onRequestGet2");
__name2(onRequestGet2, "onRequestGet");
async function onRequestPost3(context) {
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
__name(onRequestPost3, "onRequestPost3");
__name2(onRequestPost3, "onRequestPost");
async function onRequestOptions5() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions5, "onRequestOptions5");
__name2(onRequestOptions5, "onRequestOptions");
async function onRequestGet3() {
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
__name(onRequestGet3, "onRequestGet3");
__name2(onRequestGet3, "onRequestGet");
async function onRequestOptions6() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions6, "onRequestOptions6");
__name2(onRequestOptions6, "onRequestOptions");
async function onRequestPost4() {
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
__name(onRequestPost4, "onRequestPost4");
__name2(onRequestPost4, "onRequestPost");
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
async function onRequestGet4(context) {
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
__name(onRequestGet4, "onRequestGet4");
__name2(onRequestGet4, "onRequestGet");
async function onRequestOptions8() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions8, "onRequestOptions8");
__name2(onRequestOptions8, "onRequestOptions");
async function onRequestGet5() {
  try {
    const baseUrl = "https://heliosinger.pages.dev";
    const [solarWind, kIndex, xrayFlux, protonFlux, electronFlux, magnetometer] = await Promise.allSettled([
      fetch("https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json").then((r) => r.json()),
      fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json").then((r) => r.json()),
      fetch("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json").then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("https://services.swpc.noaa.gov/json/goes/goes-r_proton-1m.json").then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("https://services.swpc.noaa.gov/json/goes/goes-r_electron-1m.json").then((r) => r.ok ? r.json() : null).catch(() => null),
      fetch("https://services.swpc.noaa.gov/json/boulder/magnetometer.json").then((r) => r.ok ? r.json() : null).catch(() => null)
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
      if (Array.isArray(xrayFlux.value) && xrayFlux.value.length > 0) {
        const latest = xrayFlux.value[xrayFlux.value.length - 1];
        xrayData = {
          timestamp: latest.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
          short_wave: latest.short_wave || latest["0.05-0.4nm"] || 0,
          long_wave: latest.long_wave || latest["0.1-0.8nm"] || 0,
          flare_class: latest.flare_class || "A"
        };
      } else if (typeof xrayFlux.value === "object") {
        xrayData = xrayFlux.value;
      }
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
    const comprehensiveData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      solar_wind: solarWindData ? { ...solarWindData, bz } : null,
      k_index: kIndexData,
      xray_flux: xrayData,
      proton_flux: protonData,
      electron_flux: electronData,
      magnetometer: magnetometerData
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
__name(onRequestGet5, "onRequestGet5");
__name2(onRequestGet5, "onRequestGet");
async function onRequestOptions9() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions9, "onRequestOptions9");
__name2(onRequestOptions9, "onRequestOptions");
async function onRequestGet6() {
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
__name(onRequestGet6, "onRequestGet6");
__name2(onRequestGet6, "onRequestGet");
async function onRequestOptions10() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions10, "onRequestOptions10");
__name2(onRequestOptions10, "onRequestOptions");
async function onRequestGet7() {
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
__name(onRequestGet7, "onRequestGet7");
__name2(onRequestGet7, "onRequestGet");
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
async function onRequestGet8() {
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
__name(onRequestGet8, "onRequestGet8");
__name2(onRequestGet8, "onRequestGet");
async function onRequestOptions12() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions12, "onRequestOptions12");
__name2(onRequestOptions12, "onRequestOptions");
async function onRequestGet9() {
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
__name(onRequestGet9, "onRequestGet9");
__name2(onRequestGet9, "onRequestGet");
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
async function onRequestGet10() {
  try {
    let xrayData = null;
    let error = null;
    try {
      const response = await fetch("https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json");
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0) {
          xrayData = data;
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
              xrayData = {
                timestamp: `${latest[0]}-${latest[1]}-${latest[2]} ${latest[3].slice(0, 2)}:${latest[3].slice(2, 4)}:00`,
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
__name(onRequestGet10, "onRequestGet10");
__name2(onRequestGet10, "onRequestGet");
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
async function onRequestGet11(context) {
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
__name(onRequestGet11, "onRequestGet11");
__name2(onRequestGet11, "onRequestGet");
var routes = [
  {
    routePath: "/api/mapping/active",
    mountPath: "/api/mapping",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/mapping/active",
    mountPath: "/api/mapping",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/mapping/calculate-chord",
    mountPath: "/api/mapping",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions2]
  },
  {
    routePath: "/api/mapping/calculate-chord",
    mountPath: "/api/mapping",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/mapping/test-condition",
    mountPath: "/api/mapping",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions3]
  },
  {
    routePath: "/api/mapping/test-condition",
    mountPath: "/api/mapping",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/settings/ambient",
    mountPath: "/api/settings",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/settings/ambient",
    mountPath: "/api/settings",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions4]
  },
  {
    routePath: "/api/settings/ambient",
    mountPath: "/api/settings",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/solar-wind/current",
    mountPath: "/api/solar-wind",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/solar-wind/current",
    mountPath: "/api/solar-wind",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions5]
  },
  {
    routePath: "/api/solar-wind/fetch",
    mountPath: "/api/solar-wind",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions6]
  },
  {
    routePath: "/api/solar-wind/fetch",
    mountPath: "/api/solar-wind",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/solar-wind/history",
    mountPath: "/api/solar-wind",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/solar-wind/history",
    mountPath: "/api/solar-wind",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions7]
  },
  {
    routePath: "/api/space-weather/comprehensive",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/space-weather/comprehensive",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions8]
  },
  {
    routePath: "/api/space-weather/electron-flux",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/space-weather/electron-flux",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions9]
  },
  {
    routePath: "/api/space-weather/k-index",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/space-weather/k-index",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions10]
  },
  {
    routePath: "/api/space-weather/magnetometer",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/space-weather/magnetometer",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions11]
  },
  {
    routePath: "/api/space-weather/proton-flux",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/api/space-weather/proton-flux",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions12]
  },
  {
    routePath: "/api/space-weather/xray-flux",
    mountPath: "/api/space-weather",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet10]
  },
  {
    routePath: "/api/space-weather/xray-flux",
    mountPath: "/api/space-weather",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions13]
  },
  {
    routePath: "/api/system/status",
    mountPath: "/api/system",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet11]
  },
  {
    routePath: "/api/system/status",
    mountPath: "/api/system",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions14]
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

// ../../../Users/hunterbown/.npm-global/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
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

// ../../../Users/hunterbown/.npm-global/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
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

// .wrangler/tmp/bundle-u8W9o7/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// ../../../Users/hunterbown/.npm-global/lib/node_modules/wrangler/templates/middleware/common.ts
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

// .wrangler/tmp/bundle-u8W9o7/middleware-loader.entry.ts
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
//# sourceMappingURL=functionsWorker-0.270591007620979.js.map
