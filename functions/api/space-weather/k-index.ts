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
    const response = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
    if (!response.ok) {
      throw new Error(`NOAA K-index API error: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error('Invalid K-index data format');
    }

    // Format: [time_tag, Kp, a_running, station_count]
    const rows = data.slice(1); // Remove header
    const latest = rows[rows.length - 1];
    
    // Get last 24 hours for trend
    const last24h = rows.slice(-24);

    const kIndexData = {
      timestamp: new Date(latest[0]).toISOString(),
      kp: parseFloat(latest[1]) || 0,
      a_running: parseFloat(latest[2]) || 0,
      station_count: parseInt(latest[3]) || 0,
      history: last24h.map((row: any[]) => ({
        timestamp: new Date(row[0]).toISOString(),
        kp: parseFloat(row[1]) || 0,
        a_running: parseFloat(row[2]) || 0
      }))
    };

    return new Response(JSON.stringify(kIndexData), {
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
      JSON.stringify({ message: "Failed to fetch K-index data", error: errorMessage }),
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

