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
    // Try GOES electron flux endpoint
    const response = await fetch('https://services.swpc.noaa.gov/json/goes/goes-r_electron-1m.json');
    
    if (!response.ok) {
      // Return default structure if endpoint unavailable
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        flux_2mev: 0,
        flux_0_8mev: 0,
        note: 'Data source temporarily unavailable'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const data = await response.json();
    
    // Format varies, try to extract latest values
    let electronData;
    if (Array.isArray(data) && data.length > 1) {
      const rows = data.slice(1);
      const latest = rows[rows.length - 1];
      electronData = {
        timestamp: new Date(latest[0] || Date.now()).toISOString(),
        flux_2mev: parseFloat(latest[1]) || 0,
        flux_0_8mev: parseFloat(latest[2]) || 0
      };
    } else if (data && typeof data === 'object') {
      electronData = {
        timestamp: data.timestamp || new Date().toISOString(),
        flux_2mev: data.flux_2mev || data['2MeV'] || 0,
        flux_0_8mev: data.flux_0_8mev || data['0.8MeV'] || 0
      };
    } else {
      throw new Error('Unexpected data format');
    }

    return new Response(JSON.stringify(electronData), {
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
      JSON.stringify({ 
        message: "Failed to fetch electron flux data", 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        flux_2mev: 0,
        flux_0_8mev: 0
      }),
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

