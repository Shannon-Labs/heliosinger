// Default active mapping configuration for static site
const DEFAULT_MAPPING_CONFIG = {
  id: 'default-mapping-1',
  name: 'Default Solar Wind Mapping',
  velocity_min: 200,
  velocity_max: 800,
  midi_note_min: 36, // C2
  midi_note_max: 84, // C6
  density_min: 0.5,
  density_max: 50.0,
  decay_time_min: 0.2,
  decay_time_max: 5.0,
  bz_detune_cents: -20,
  bz_threshold: -5.0,
  is_active: "true",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

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
    return new Response(JSON.stringify(DEFAULT_MAPPING_CONFIG), {
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
      JSON.stringify({ message: "Failed to fetch active mapping", error: errorMessage }),
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

