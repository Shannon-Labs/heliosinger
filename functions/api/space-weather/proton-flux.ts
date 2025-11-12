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
    // Try GOES proton flux endpoint
    const response = await fetch('https://services.swpc.noaa.gov/json/goes/goes-r_proton-1m.json');
    
    if (!response.ok) {
      // Return default structure if endpoint unavailable
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        flux_10mev: 0,
        flux_50mev: 0,
        flux_100mev: 0,
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
    } else if (data && typeof data === 'object') {
      protonData = {
        timestamp: data.timestamp || new Date().toISOString(),
        flux_10mev: data.flux_10mev || data['10MeV'] || 0,
        flux_50mev: data.flux_50mev || data['50MeV'] || 0,
        flux_100mev: data.flux_100mev || data['100MeV'] || 0
      };
    } else {
      throw new Error('Unexpected data format');
    }

    return new Response(JSON.stringify(protonData), {
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
        message: "Failed to fetch proton flux data", 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        flux_10mev: 0,
        flux_50mev: 0,
        flux_100mev: 0
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

