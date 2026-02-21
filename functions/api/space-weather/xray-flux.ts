import { classifyFlareClass } from "../../../packages/core/src/index.ts";
import { parseXrayFlux } from "../_shared/parse-xray.ts";

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
    // Try multiple possible endpoints for X-ray flux
    let xrayData = null;
    let error = null;

    // Try GOES XRS report endpoint
    try {
      const response = await fetch('https://services.swpc.noaa.gov/json/goes/goes-xrs-report.json');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          xrayData = parseXrayFlux(data);
        }
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    }

    // If that fails, try the text report and parse it
    if (!xrayData) {
      try {
        const response = await fetch('https://services.swpc.noaa.gov/text/goes-xray-report.txt');
        if (response.ok) {
          const text = await response.text();
          // Parse the text format (this is a fallback)
          // Format: YYYY MM DD HHMM BEGIN CURRENT END MAX FLUX
          const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
          if (lines.length > 0) {
            const latest = lines[lines.length - 1].trim().split(/\s+/);
            if (latest.length >= 7) {
              // Parse max_flux which is typically in scientific notation like "1.2e-05"
              const maxFlux = parseFloat(latest[7]) || 0;
              const timestamp = `${latest[0]}-${latest[1]}-${latest[2]} ${latest[3].slice(0,2)}:${latest[3].slice(2,4)}:00`;
              const flareClass = classifyFlareClass(maxFlux);
              
              xrayData = {
                timestamp,
                short_wave: maxFlux,
                long_wave: 0,
                flare_class: flareClass,
                begin: latest[4],
                current: latest[5],
                end: latest[6],
                max_flux: latest[7] || '0'
              };
            }
          }
        }
      } catch (e) {
        error = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    // Return mock data structure if we can't fetch real data
    if (!xrayData) {
      xrayData = {
        timestamp: new Date().toISOString(),
        short_wave: 0,
        long_wave: 0,
        flare_class: 'A',
        note: 'Data source temporarily unavailable'
      };
    }

    return new Response(JSON.stringify(xrayData), {
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
      JSON.stringify({ message: "Failed to fetch X-ray flux data", error: errorMessage }),
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
