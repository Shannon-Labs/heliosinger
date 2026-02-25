# Store Screenshot Shot List

Last updated: 2026-02-18

## Capture execution status (2026-02-18)

- Result: `FAIL (not executed in terminal session)`
- Evidence: `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/store/2026-02-18-terminal-only/store-console-blocked.md`
- Blocker: physical device capture and store-console uploads must be completed externally.

## iOS screenshot set

Capture from real device builds where possible.

1. Listen tab with active playback, condition badges visible
2. Latest conditions panel with velocity/density/Bz/Kp values
3. Flares tab with latest flare + timeline entries
4. Learn tab with at least two populated learning cards
5. Settings tab showing alert thresholds and quiet-hours controls
6. Settings tab showing background playback + registration status

## Android screenshot set

1. Listen tab with active playback and premium header
2. Flares tab with timeline rows
3. Learn tab with educational cards
4. Settings tab with alert profile controls
5. Settings tab with quiet-hours window and registration controls

## Required supporting assets

- App icon (`1024x1024`) from `mobile/assets/icon.png`
- Android adaptive icon foreground from `mobile/assets/adaptive-icon.png`
- Splash image from `mobile/assets/splash.png`

## Capture guidance

- Use production API endpoint (`https://heliosinger.com`).
- Ensure no debug UI overlays.
- Use consistent locale/timezone for narrative coherence.
- Keep typography crisp and avoid clipped text in all screenshots.
