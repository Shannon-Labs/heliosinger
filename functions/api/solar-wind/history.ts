export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  try {
    const url = new URL(context.request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    // Fetch plasma data
    const plasmaResponse = await fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json');
    if (!plasmaResponse.ok) {
      throw new Error(`NOAA plasma API error: ${plasmaResponse.status}`);
    }

    const plasmaData = await plasmaResponse.json();
    const dataRows = plasmaData.slice(1); // Remove header row

    // Fetch magnetometer data
    let magData: any[] = [];
    try {
      const magResponse = await fetch('https://services.swpc.noaa.gov/products/solar-wind/mag-2-hour.json');
      if (magResponse.ok) {
        const magJson = await magResponse.json();
        magData = magJson.slice(1);
      }
    } catch (magError) {
      console.warn('Failed to fetch magnetometer data:', magError);
    }

    // Combine data and format
    // Match plasma and magnetometer data by timestamp proximity
    const readings = dataRows.slice(-limit).map((row: any[], index: number) => {
      // Try to find matching magnetometer data
      const plasmaTime = new Date(row[0]).getTime();
      let bz = 0;
      
      // Find closest magnetometer reading by timestamp
      for (const magRow of magData) {
        if (magRow && magRow.length >= 4) {
          const magTime = new Date(magRow[0]).getTime();
          const timeDiff = Math.abs(plasmaTime - magTime);
          // Match if within 5 minutes
          if (timeDiff < 5 * 60 * 1000) {
            bz = parseFloat(magRow[3]) || 0; // Bz GSM is at index 3
            break;
          }
        }
      }
      
      return {
        id: `sw-${Date.now()}-${index}`,
        timestamp: new Date(row[0]).toISOString(),
        velocity: parseFloat(row[2]) || 0,
        density: parseFloat(row[1]) || 0,
        bz: bz,
        bt: null,
        temperature: parseFloat(row[3]) || 0,
        raw_data: row
      };
    });

    return new Response(JSON.stringify(readings), {
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
      JSON.stringify({ message: "Failed to fetch NOAA history", error: errorMessage }),
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

