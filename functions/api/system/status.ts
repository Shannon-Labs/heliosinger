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
    // Return mock system status for static site
    const statuses = [
      {
        id: 'status-1',
        component: 'data_stream',
        status: 'active',
        details: 'Connected to NOAA DSCOVR',
        last_update: new Date().toISOString()
      },
      {
        id: 'status-2',
        component: 'network',
        status: 'active',
        details: 'Online',
        last_update: new Date().toISOString()
      }
    ];

    return new Response(JSON.stringify(statuses), {
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
      JSON.stringify({ message: "Failed to fetch system status", error: errorMessage }),
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

