# Heliochime

Real-time space weather sonification - transforms live space weather data from NOAA into beautiful ambient audio.

🌐 **Live Site**: https://heliochime.pages.dev

## What is Heliochime?

Heliochime is an interactive web application that converts real-time space weather data into multi-layered ambient audio. Each space weather parameter controls a distinct audio layer, creating a rich, evolving soundscape that represents the dynamic space weather environment.

## Features

- **Multi-Parameter Sonification**: Six simultaneous audio layers representing different aspects of space weather
  - Solar Wind (velocity, density, magnetic field) → Base frequency and harmonics
  - K-index (geomagnetic activity) → Rhythmic pulsing and tempo
  - X-ray Flux (solar flares) → Percussive bursts and brightness
  - Proton Flux (radiation) → Harmonic richness and texture
  - Electron Flux → High-frequency shimmer
  - Magnetometer → Low-frequency rumble

- **Real-Time Data**: Fetches live data from NOAA Space Weather Prediction Center
- **Interactive Controls**: Toggle between simple solar wind mode and full multi-parameter mode
- **Visual Display**: Real-time visualization of all space weather parameters

## Data Sources

- NOAA DSCOVR (Solar Wind)
- NOAA SWPC (K-index, X-ray flux, proton flux, electron flux)
- Boulder Magnetometer

## Technology

- **Frontend**: React + TypeScript + Vite
- **Backend**: Cloudflare Pages + Cloudflare Functions
- **Audio**: Web Audio API
- **Styling**: Tailwind CSS

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=heliochime
```

## License

MIT

---

Made with ❤️ for space weather enthusiasts.
