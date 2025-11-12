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
    // Try Boulder magnetometer endpoint
    const response = await fetch('https://services.swpc.noaa.gov/json/boulder/magnetometer.json');
    
    if (!response.ok) {
      // Return default structure if endpoint unavailable
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        h_component: 0,
        d_component: 0,
        z_component: 0,
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
    } else if (data && typeof data === 'object' && !Array.isArray(data)) {
      magnetometerData = {
        timestamp: data.timestamp || new Date().toISOString(),
        h_component: data.h_component || data.H || 0,
        d_component: data.d_component || data.D || 0,
        z_component: data.z_component || data.Z || 0
      };
    } else {
      // Try alternative format
      const latest = Array.isArray(data) ? data[data.length - 1] : data;
      magnetometerData = {
        timestamp: new Date().toISOString(),
        h_component: latest?.h || latest?.H || 0,
        d_component: latest?.d || latest?.D || 0,
        z_component: latest?.z || latest?.Z || 0
      };
    }

    return new Response(JSON.stringify(magnetometerData), {
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
        message: "Failed to fetch magnetometer data", 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        h_component: 0,
        d_component: 0,
        z_component: 0
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

