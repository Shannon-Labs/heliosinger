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
    const baseUrl = 'https://heliochime.pages.dev'; // Use relative paths in production
    const [solarWind, kIndex, xrayFlux, protonFlux, electronFlux, magnetometer] = await Promise.allSettled([
      fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json').then(r => r.json()),
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json').then(r => r.json()),
      fetch('https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('https://services.swpc.noaa.gov/json/goes/goes-r_proton-1m.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('https://services.swpc.noaa.gov/json/goes/goes-r_electron-1m.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('https://services.swpc.noaa.gov/json/boulder/magnetometer.json').then(r => r.ok ? r.json() : null).catch(() => null)
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

    // Get Bz from magnetometer data
    let bz = 0;
    try {
      const magResponse = await fetch('https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json');
      if (magResponse.ok) {
        const magData = await magResponse.json();
        const magRows = magData.slice(1);
        const latestMag = magRows[magRows.length - 1];
        if (latestMag && latestMag.length >= 4) {
          bz = parseFloat(latestMag[3]) || 0;
        }
      }
    } catch (e) {
      // Continue without Bz
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
      if (Array.isArray(xrayFlux.value) && xrayFlux.value.length > 0) {
        const latest = xrayFlux.value[xrayFlux.value.length - 1];
        xrayData = {
          timestamp: latest.timestamp || new Date().toISOString(),
          short_wave: latest.short_wave || latest['0.05-0.4nm'] || 0,
          long_wave: latest.long_wave || latest['0.1-0.8nm'] || 0,
          flare_class: latest.flare_class || 'A'
        };
      } else if (typeof xrayFlux.value === 'object') {
        xrayData = xrayFlux.value;
      }
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

    const comprehensiveData = {
      timestamp: new Date().toISOString(),
      solar_wind: solarWindData ? { ...solarWindData, bz } : null,
      k_index: kIndexData,
      xray_flux: xrayData,
      proton_flux: protonData,
      electron_flux: electronData,
      magnetometer: magnetometerData
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

