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
    // Fetch plasma data
    const plasmaResponse = await fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json');
    if (!plasmaResponse.ok) {
      throw new Error(`NOAA plasma API error: ${plasmaResponse.status}`);
    }

    const plasmaData = await plasmaResponse.json();
    const dataRows = plasmaData.slice(1); // Remove header row
    const latestPlasma = dataRows[dataRows.length - 1];

    // Fetch magnetometer data for Bz, Bx, By, Bt
    // Format: [time_tag, bx_gsm, by_gsm, bz_gsm, bt]
    let bz = 0;
    let bx = 0;
    let by = 0;
    let bt = 0;
    try {
      const magResponse = await fetch('https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json');
      if (magResponse.ok) {
        const magData = await magResponse.json();
        const magRows = magData.slice(1); // Remove header
        const latestMag = magRows[magRows.length - 1];
        if (latestMag && latestMag.length >= 5) {
          bx = parseFloat(latestMag[1]) || 0; // Bx GSM is at index 1
          by = parseFloat(latestMag[2]) || 0; // By GSM is at index 2
          bz = parseFloat(latestMag[3]) || 0; // Bz GSM is at index 3
          bt = parseFloat(latestMag[4]) || 0; // Bt (total) is at index 4
        }
      }
    } catch (magError) {
      console.warn('Failed to fetch magnetometer data:', magError);
      // Continue without magnetic field data
    }

    if (!latestPlasma || latestPlasma.length < 4) {
      throw new Error(`Invalid NOAA data format`);
    }

    // Format: [time_tag, density, speed, temperature]
    const solarWindData = {
      id: `sw-${Date.now()}`,
      timestamp: new Date(latestPlasma[0]).toISOString(),
      velocity: parseFloat(latestPlasma[2]) || 0, // speed km/s
      density: parseFloat(latestPlasma[1]) || 0, // proton density p/cm³
      bz: bz,
      bx: bx,
      by: by,
      bt: bt || Math.sqrt(bx * bx + by * by + bz * bz), // Calculate Bt if not provided
      temperature: parseFloat(latestPlasma[3]) || 0,
      raw_data: latestPlasma
    };

    return new Response(JSON.stringify(solarWindData), {
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
      JSON.stringify({ message: "Failed to fetch NOAA data", error: errorMessage }),
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

