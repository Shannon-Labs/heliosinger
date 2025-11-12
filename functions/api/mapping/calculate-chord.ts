// Default mapping configuration
const DEFAULT_CONFIG = {
  velocity_min: 200,
  velocity_max: 800,
  midi_note_min: 36, // C2
  midi_note_max: 84, // C6
  density_min: 0.5,
  density_max: 50.0,
  decay_time_min: 0.2,
  decay_time_max: 5.0,
  bz_detune_cents: -20,
  bz_threshold: -5.0
};

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
    const { velocity, density, bz } = await context.request.json();
    
    if (typeof velocity !== 'number' || typeof density !== 'number' || typeof bz !== 'number') {
      return new Response(
        JSON.stringify({ message: "Invalid input parameters" }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Calculate MIDI note from velocity
    const velocityRange = DEFAULT_CONFIG.velocity_max - DEFAULT_CONFIG.velocity_min;
    const midiRange = DEFAULT_CONFIG.midi_note_max - DEFAULT_CONFIG.midi_note_min;
    const velocityNormalized = Math.max(0, Math.min(1, (velocity - DEFAULT_CONFIG.velocity_min) / velocityRange));
    const midiNote = Math.round(DEFAULT_CONFIG.midi_note_min + (velocityNormalized * midiRange));
    
    // Convert MIDI note to frequency (A440 standard)
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    
    // Calculate note name
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor((midiNote - 12) / 12);
    const noteIndex = (midiNote - 12) % 12;
    const noteName = `${noteNames[noteIndex]}${octave}`;

    // Calculate decay time from density (logarithmic mapping)
    const densityNormalized = Math.max(0, Math.min(1, Math.log(density / DEFAULT_CONFIG.density_min) / Math.log(DEFAULT_CONFIG.density_max / DEFAULT_CONFIG.density_min)));
    const decayTime = DEFAULT_CONFIG.decay_time_min + ((1 - densityNormalized) * (DEFAULT_CONFIG.decay_time_max - DEFAULT_CONFIG.decay_time_min));

    // Calculate detune from Bz (southward creates beating)
    const detuneCents = bz < DEFAULT_CONFIG.bz_threshold ? DEFAULT_CONFIG.bz_detune_cents : 0;
    
    // Determine space weather condition
    let condition: 'quiet' | 'moderate' | 'storm' = 'quiet';
    if (velocity > 600 || Math.abs(bz) > 10) {
      condition = 'storm';
    } else if (velocity > 450 || Math.abs(bz) > 5) {
      condition = 'moderate';
    }

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

    return new Response(JSON.stringify(chordData), {
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
      JSON.stringify({ message: "Failed to calculate chord mapping", error: errorMessage }),
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

