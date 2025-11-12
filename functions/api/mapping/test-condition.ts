export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  try {
    const { condition } = await context.request.json();
    
    let testData;
    switch (condition) {
      case 'quiet':
        testData = { velocity: 350, density: 5.0, bz: 2.0 };
        break;
      case 'moderate':
        testData = { velocity: 500, density: 8.0, bz: -7.0 };
        break;
      case 'storm':
        testData = { velocity: 750, density: 2.0, bz: -15.0 };
        break;
      default:
        return new Response(
          JSON.stringify({ message: "Invalid condition. Use 'quiet', 'moderate', or 'storm'" }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
    }

    // Calculate chord for test condition by calling calculate-chord logic inline
    const DEFAULT_CONFIG = {
      velocity_min: 200,
      velocity_max: 800,
      midi_note_min: 36,
      midi_note_max: 84,
      density_min: 0.5,
      density_max: 50.0,
      decay_time_min: 0.2,
      decay_time_max: 5.0,
      bz_detune_cents: -20,
      bz_threshold: -5.0
    };

    const { velocity, density, bz } = testData;
    const velocityRange = DEFAULT_CONFIG.velocity_max - DEFAULT_CONFIG.velocity_min;
    const midiRange = DEFAULT_CONFIG.midi_note_max - DEFAULT_CONFIG.midi_note_min;
    const velocityNormalized = Math.max(0, Math.min(1, (velocity - DEFAULT_CONFIG.velocity_min) / velocityRange));
    const midiNote = Math.round(DEFAULT_CONFIG.midi_note_min + (velocityNormalized * midiRange));
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor((midiNote - 12) / 12);
    const noteIndex = (midiNote - 12) % 12;
    const noteName = `${noteNames[noteIndex]}${octave}`;
    const densityNormalized = Math.max(0, Math.min(1, Math.log(density / DEFAULT_CONFIG.density_min) / Math.log(DEFAULT_CONFIG.density_max / DEFAULT_CONFIG.density_min)));
    const decayTime = DEFAULT_CONFIG.decay_time_min + ((1 - densityNormalized) * (DEFAULT_CONFIG.decay_time_max - DEFAULT_CONFIG.decay_time_min));
    const detuneCents = bz < DEFAULT_CONFIG.bz_threshold ? DEFAULT_CONFIG.bz_detune_cents : 0;

    const chordData = {
      baseNote: noteName,
      frequency,
      midiNote,
      decayTime: Math.round(decayTime * 100) / 100,
      detuneCents,
      condition,
      velocity,
      density,
      bz
    };

    return new Response(JSON.stringify({ condition, testData, chord: chordData }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ message: "Failed to test space weather condition", error: errorMessage }),
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

