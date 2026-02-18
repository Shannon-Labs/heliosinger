# Heliosinger

Real-time space weather sonification - transforms live space weather data from NOAA into beautiful ambient audio. The sun sings its space weather story through vowel-shaped formants and harmonic layers.

🌐 **Live Site**: https://heliosinger.com

## What is Heliosinger?

Heliosinger is an interactive web application that converts real-time space weather data into scientifically-informed, multi-layered ambient audio. The enhanced sonification system uses a sophisticated mapping framework that preserves physical relationships between space weather parameters while creating musically coherent soundscapes. The sun "sings" through vowel-shaped formant filters that morph based on space weather conditions.

## Features

- **Enhanced Multi-Layer Sonification**: Scientifically-informed audio architecture with distinct perceptual layers
  - **Foundation Layer**: Solar wind velocity → Pentatonic pitch scales (C2-C6)
  - **Harmonic Richness**: Density controls harmonic count (1-12 partials), temperature controls spectral brightness, Alfvén Mach number enhances harmonic richness
  - **Spatial Audio**: IMF vector (Bx/By/Bz) mapped to stereo field with clock angle-based auto-pan rotation
  - **Rhythmic Layer**: K-index drives pulsing rate (0.5-8 Hz) and complexity, magnetometer H-component adds slow pulses and LF "thuds"
  - **Texture Layer**: Temperature shimmer + electron flux shimmer + sub-bass rumble from proton flux during radiation storms

- **Advanced Space Weather Parameters**: Comprehensive integration of multiple space weather data sources
  - **X-ray Flux (GOES)**: Solar flare detection → transient brightness boosts and filter openings
  - **Proton Flux (GOES)**: Radiation storms → sub-bass rumble gain and enhanced reverb density
  - **Electron Flux (GOES)**: High-energy electrons → high-frequency shimmer and air
  - **Magnetometer (Boulder)**: Geomagnetic disturbances → tremolo depth and rhythmic pulses

- **Derived Metrics**: Computed physical parameters for enhanced sonification
  - **Dynamic Pressure (Pdyn)**: Solar wind pressure shocks → percussive delay feedback modulation
  - **IMF Clock Angle (θc)**: Interplanetary magnetic field orientation → stereo auto-pan rotation
  - **Interplanetary Electric Field (Ey)**: Reconnection potential → vibrato rate modulation
  - **Alfvén Mach Number (MA)**: Flow speed relative to Alfvén speed → harmonic richness and modulation depth
  - **Plasma Beta (β)**: Pressure-to-magnetic field ratio → filter brightness and vowel openness

- **Transient Event Detection**: Real-time spike detection for dramatic audio events
  - X-ray flare spikes (2x+ increase) → brief filter brightness bursts
  - Dynamic pressure shocks (1.5x+ increase) → percussive delay feedback resets

- **Real-Time Data**: Fetches live data from NOAA Space Weather Prediction Center with adaptive refetch intervals (1-60 seconds based on activity)
- **Scientific Accuracy**: Preserves physical relationships and uses correct formulas for derived metrics
- **Musical Coherence**: Pentatonic scales and harmonic series prevent dissonance, vowel formants create natural vocal timbres
- **Visual Display**: Real-time visualization of all space weather parameters and derived metrics

## Data Sources

- NOAA DSCOVR (Solar Wind)
- NOAA SWPC (K-index, X-ray flux, proton flux, electron flux)
- Boulder Magnetometer

## Technology

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Cloudflare Pages + Cloudflare Functions (Serverless)
- **Audio**: Web Audio API with enhanced multi-layer engine
- **Styling**: Tailwind CSS with shadcn/ui components
- **Data Fetching**: React Query (TanStack Query)
- **Sonification**: Enhanced multi-layer framework with pentatonic scales and harmonic series

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=heliosinger
```

## Mobile MVP Scaffold

This repository now includes a mobile and backend scaffold for the Heliosinger
iOS/Android MVP:

- `mobile/` - Expo React Native app with `Listen`, `Flares`, `Learn`, `Settings`
- `packages/core/` - shared contracts and deterministic logic (flare/radio scale, alert evaluation, learning cards)
- `functions/api/mobile/v1/` - versioned mobile endpoints
- `workers/alerts-dispatcher/` - scheduled push dispatcher worker
- `scripts/migrations/mobile/` - D1 schema migrations
- `wrangler.mobile.example.toml` - binding template for D1/KV

Helpful commands:

```bash
# Run shared core tests
npm run test:core

# Run mobile app
npm run mobile:start
```

## License

MIT

---
