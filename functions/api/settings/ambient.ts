// For static site, we'll use localStorage on the client side
// This function provides a simple interface but data is stored client-side
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestGet(): Promise<Response> {
  // Return default settings
  const defaultSettings = {
    enabled: "false",
    intensity: 0.5,
    volume: 0.3,
    respect_night: "true",
    day_only: "false",
    smoothing: 0.8,
    max_rate: 10.0,
    battery_min: 20.0
  };

  return new Response(JSON.stringify(defaultSettings), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  // For static site, settings are stored in localStorage on client
  // This endpoint just returns success
  try {
    const body = await context.request.json();
    return new Response(JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ message: "Failed to update settings", error: errorMessage }),
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

