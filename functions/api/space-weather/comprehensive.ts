import { parseXrayFlux } from "../_shared/parse-xray.ts";

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestGet(): Promise<Response> {
  try {
    // Fetch all data sources in parallel
    const PLASMATAIL_MONITOR_URL = 'https://plasmatail-monitor.shannonlabs.io';
    const [solarWind, kIndex, xrayFlux, protonFlux, electronFlux, magnetometer, reconnection] = await Promise.allSettled([
      fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json').then(r => r.json()),
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json').then(r => r.json()),
      fetch('https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('https://services.swpc.noaa.gov/json/goes/goes-r_proton-1m.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('https://services.swpc.noaa.gov/json/goes/goes-r_electron-1m.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('https://services.swpc.noaa.gov/json/boulder/magnetometer.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${PLASMATAIL_MONITOR_URL}/v1/monitor/signals?limit=1&type=reconnection_composite`, { signal: AbortSignal.timeout(3000) }).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    // Process solar wind data
    let solarWindData = null;
    if (solarWind.status === 'fulfilled' && Array.isArray(solarWind.value) && solarWind.value.length > 1) {
      const rows = solarWind.value.slice(1);
      const latest = rows[rows.length - 1];
      solarWindData = {
        timestamp: new Date(latest[0]).toISOString(),
        velocity: parseFloat(latest[2]) || 0,
        density: parseFloat(latest[1]) || 0,
        temperature: parseFloat(latest[3]) || 0
      };
    }

    // Get Bz, Bx, By, Bt from magnetometer data
    let bz = 0;
    let bx = 0;
    let by = 0;
    let bt = 0;
    try {
      const magResponse = await fetch('https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json');
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
      // Continue without magnetic field data
    }
    
    // Add magnetic field data to solar wind
    if (solarWindData) {
      solarWindData.bz = bz;
      solarWindData.bx = bx;
      solarWindData.by = by;
      solarWindData.bt = bt || Math.sqrt(bx * bx + by * by + bz * bz);
    }

    // Process K-index
    let kIndexData = null;
    if (kIndex.status === 'fulfilled' && Array.isArray(kIndex.value) && kIndex.value.length > 1) {
      const rows = kIndex.value.slice(1);
      const latest = rows[rows.length - 1];
      kIndexData = {
        timestamp: new Date(latest[0]).toISOString(),
        kp: parseFloat(latest[1]) || 0,
        a_running: parseFloat(latest[2]) || 0
      };
    }

    // Process X-ray flux
    let xrayData = null;
    if (xrayFlux.status === 'fulfilled' && xrayFlux.value) {
      xrayData = parseXrayFlux(xrayFlux.value);
    }

    // Process proton flux
    let protonData = null;
    if (protonFlux.status === 'fulfilled' && protonFlux.value) {
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

    // Process electron flux
    let electronData = null;
    if (electronFlux.status === 'fulfilled' && electronFlux.value) {
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

    // Process magnetometer
    let magnetometerData = null;
    if (magnetometer.status === 'fulfilled' && magnetometer.value) {
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

    // Process reconnection data from plasmatail monitor
    let reconnectionData = null;
    if (reconnection.status === 'fulfilled' && reconnection.value) {
      try {
        const signals = Array.isArray(reconnection.value) ? reconnection.value : reconnection.value.signals;
        if (Array.isArray(signals) && signals.length > 0) {
          const latest = signals[0];
          const meta = latest.metadata || {};
          reconnectionData = {
            timestamp: latest.timestamp || new Date().toISOString(),
            score: typeof meta.score === 'number' ? meta.score : parseFloat(latest.value) || 0,
            level: latest.level || 'WATCH',
            raw_score: typeof meta.raw_score === 'number' ? meta.raw_score : 0,
            kp_boost: typeof meta.kp_boost === 'number' ? meta.kp_boost : 1.0,
            contributors: meta.contributors || {},
          };
        }
      } catch {
        // Reconnection data is optional; continue without it
      }
    }

    const comprehensiveData = {
      timestamp: new Date().toISOString(),
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ message: "Failed to fetch comprehensive space weather data", error: errorMessage }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
