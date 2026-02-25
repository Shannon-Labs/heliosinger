# Real Device Validation Matrix

Last updated: 2026-02-18

## Devices under test

- iOS device: `FAIL (not executed; no physical iOS device attached to this session)`
- Android device: `FAIL (not executed; no physical Android device attached to this session)`
- App build identifier(s): `FAIL (not captured in terminal-only run)`
- API base URL: `https://heliosinger.com`

## Current execution status (2026-02-18)

- This Codex terminal session cannot operate physical devices directly.
- Matrix rows are recorded as `FAIL (not executed)` until one physical iOS and one physical Android run is completed.
- Evidence files for this blocked run:
  - `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md`
  - `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md`

## Execution requirements

- Physical hardware only. Simulators/emulators do not satisfy launch sign-off.
- Capture logs and screenshots for each scenario.
- Record local timezone and UTC timestamp for each run.

## Matrix

| Platform | Scenario | Steps | Expected Result | Status (Pass/Fail) | Evidence |
| --- | --- | --- | --- | --- | --- |
| iOS | Push registration | Fresh install, grant notifications, open Settings tab | Push token is registered and backend receives registration | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md` |
| iOS | Push preferences update | Toggle alerts / thresholds / quiet hours | `/devices/preferences` updates persist and survive app restart | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md` |
| iOS | Push unregister | Tap remove registration | Device token removed; no further push dispatch | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md` |
| iOS | Quiet-hours by timezone | Set timezone-dependent quiet window and trigger event | Alerts suppressed inside window and resume outside window | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md` |
| iOS | Background audio continuity | Start playback, lock phone, switch apps | Audio continues when background enabled | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md` |
| iOS | Lockscreen controls | Use lockscreen play/pause controls | Playback responds correctly and metadata remains visible | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md` |
| iOS | Interruption handling | Trigger call/alarm/headphone route change | Playback pauses/resumes according to system behavior | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md` |
| Android | Push registration | Fresh install, grant notifications, open Settings tab | Push token is registered and backend receives registration | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md` |
| Android | Push preferences update | Toggle alerts / thresholds / quiet hours | `/devices/preferences` updates persist and survive app restart | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md` |
| Android | Push unregister | Tap remove registration | Device token removed; no further push dispatch | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md` |
| Android | Quiet-hours by timezone | Set timezone-dependent quiet window and trigger event | Alerts suppressed inside window and resume outside window | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md` |
| Android | Background audio continuity | Start playback, lock phone, switch apps | Audio continues when background enabled | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md` |
| Android | Lockscreen controls | Use lockscreen play/pause controls | Playback responds correctly from media controls | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md` |
| Android | Audio focus/interruption | Trigger media focus loss (call, other media app) | Playback pauses on focus loss, resumes on focus gain | FAIL (not executed) | `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md` |

## iOS log capture workflow

1. Connect device to Mac.
2. Open Xcode -> Window -> Devices and Simulators -> selected device -> Open Console.
3. Filter for:
   - `HeliosingerAudio`
   - `expo-notifications`
   - `heliosinger-alerts`
4. Export relevant log snippets per scenario and store paths in matrix evidence column.

## Android log capture workflow

Use the helper script:

```bash
/Volumes/VIXinSSD/Heliosinger/scripts/mobile/android-logcat-capture.sh
```

Collect log snippets containing:

- `HeliosingerAudio`
- `expo-notifications`
- `AudioFocus`
- `heliosinger-alerts`
