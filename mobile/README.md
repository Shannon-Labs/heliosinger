# Heliosinger Mobile (Expo)

## Run

```bash
cd mobile
npm install
npm run start
```

Set API base URL (optional):

```bash
EXPO_PUBLIC_API_BASE_URL=https://heliosinger.com npm run start
```

## Current MVP Surfaces

- `Listen`: Ambient playback and live condition summary
- `Flares`: Latest flare + timeline
- `Learn`: Deterministic educational cards
- `Settings`: Alert thresholds, quiet hours, background audio toggle

## Native Audio Module

The custom module lives in `mobile/modules/heliosinger-audio` and exposes:

- `start(initialParams)`
- `update(paramsPatch)`
- `setVolume(volume)`
- `setBackgroundMode(enabled)`
- `pause()`
- `resume()`
- `stop()`

In Expo Go, the JS fallback no-op implementation is used.
