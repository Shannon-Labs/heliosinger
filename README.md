# Heliosinger

Real-time space weather sonification - transforms live space weather data from NOAA into beautiful ambient audio. The sun sings its space weather story through vowel-shaped formants and harmonic layers.

🌐 **Live Site**: https://heliosinger.pages.dev

## What is Heliosinger?

Heliosinger is an interactive web application that converts real-time space weather data into scientifically-informed, multi-layered ambient audio. The enhanced sonification system uses a sophisticated mapping framework that preserves physical relationships between space weather parameters while creating musically coherent soundscapes. The sun "sings" through vowel-shaped formant filters that morph based on space weather conditions.

## Features

- **Enhanced Multi-Layer Sonification**: Scientifically-informed audio architecture with distinct perceptual layers
  - **Foundation Layer**: Solar wind velocity → Pentatonic pitch scales (C2-C6)
  - **Harmonic Richness**: Density controls harmonic count (1-8 partials), temperature controls spectral brightness
  - **Spatial Audio**: IMF vector (Bx/By/Bz) mapped to stereo field and modulation
  - **Rhythmic Layer**: K-index drives pulsing rate (0.5-8 Hz) and complexity
  - **Texture Layer**: Temperature shimmer + sub-bass rumble during storms

- **Real-Time Data**: Fetches live data from NOAA Space Weather Prediction Center every 60 seconds
- **Scientific Accuracy**: Preserves physical relationships (velocity-density anticorrelation, temperature-velocity correlation, southward Bz effects)
- **Musical Coherence**: Pentatonic scales and harmonic series prevent dissonance
- **Visual Display**: Real-time visualization of all space weather parameters

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

## License

MIT

---
