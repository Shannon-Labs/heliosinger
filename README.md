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

## Mobile Production Setup

Use these steps to provision and deploy the mobile backend stack.

1. Create D1 database

```bash
npx wrangler d1 create heliosinger-mobile
```

2. Create KV namespace

```bash
npx wrangler kv namespace create HELIOSINGER_KV
```

3. Copy binding ids into config
- Root Pages config (for `/functions/api/mobile/v1/*`): `/Volumes/VIXinSSD/Heliosinger/wrangler.toml`
- Worker config: `/Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher/wrangler.toml`
- Template: `/Volumes/VIXinSSD/Heliosinger/wrangler.mobile.example.toml`

4. Apply D1 migrations in order

```bash
npx wrangler d1 execute heliosinger-mobile --file ./scripts/migrations/mobile/0001_initial.sql
npx wrangler d1 execute heliosinger-mobile --file ./scripts/migrations/mobile/0002_notification_dedupe.sql
```

5. Configure secrets

```bash
cd /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher
npx wrangler secret put EXPO_PUSH_ACCESS_TOKEN
```

6. Build + deploy Pages (web + API functions)

```bash
cd /Volumes/VIXinSSD/Heliosinger
npm run build
npx wrangler pages deploy dist --project-name=heliosinger
```

7. Deploy scheduled alerts worker

```bash
cd /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher
npx wrangler deploy
```

### Required Bindings

- `HELIOSINGER_DB` (D1)
- `HELIOSINGER_KV` (KV)
- `EXPO_PUSH_ACCESS_TOKEN` (worker secret; optional but recommended)

### Validation Commands

```bash
npm run test:core
npm run test:mobile-api
npm run test:alerts-worker
npm run check
npm run build
npx wrangler pages functions build functions --outdir /tmp/hs-pages-build-final
npx wrangler deploy --dry-run --config ./workers/alerts-dispatcher/wrangler.toml
npm --prefix ./mobile run typecheck
```

## License

MIT

---
