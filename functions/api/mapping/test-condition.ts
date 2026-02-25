import { buildMappedChord, getTestConditionInput } from "./_shared/chord-mapping";

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

    const testData = getTestConditionInput(condition);
    if (!testData) {
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

    const { velocity, density, bz } = testData;
    const chordData = buildMappedChord({ velocity, density, bz });

    return new Response(JSON.stringify({
      condition,
      canonicalCondition: chordData.condition,
      testData,
      chord: chordData,
    }), {
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
