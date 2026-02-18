# heliosinger-audio

Custom Expo module for continuous ambient binaural playback.

## JS Contract

- `start({ baseFrequency, binauralBeatHz, harmonicMix, volume })`
- `update(partialParams)`
- `setVolume(volume)`
- `setBackgroundMode(enabled)`
- `pause()`
- `resume()`
- `stop()`

The module ships a JS fallback for Expo Go where native code is not available.
