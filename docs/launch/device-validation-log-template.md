# Device Validation Log Template

Use one entry per scenario execution.

- Timestamp (local):
- Timestamp (UTC):
- Device model:
- OS version:
- Platform (`ios` or `android`):
- App build/version:
- Install ID:
- Scenario name:
- Preconditions:
- Steps executed:
- Observed behavior:
- Expected behavior:
- Result (`PASS` or `FAIL`):
- Related API logs path:
- Related device logs path:
- Screenshot/video paths:
- Notes / follow-up actions:

## Current blocked run entries (2026-02-18)

### iOS physical validation

- Timestamp (local): not captured (no physical device access in terminal session)
- Timestamp (UTC): 2026-02-18T17:23:54Z
- Device model: N/A
- OS version: N/A
- Platform (`ios` or `android`): `ios`
- App build/version: N/A
- Install ID: N/A
- Scenario name: all iOS launch scenarios (push register/update/unregister, quiet-hours, background audio, lockscreen controls, interruption)
- Preconditions: physical iOS device required
- Steps executed: none (blocked)
- Observed behavior: scenario could not be executed
- Expected behavior: all iOS scenarios pass with evidence
- Result (`PASS` or `FAIL`): `FAIL`
- Related API logs path: `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md`
- Related device logs path: `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md`
- Screenshot/video paths: `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/ios-terminal-blocked.md`
- Notes / follow-up actions: execute full matrix on one physical iOS device and replace blocked evidence file with real artifacts.

### Android physical validation

- Timestamp (local): not captured (no physical device access in terminal session)
- Timestamp (UTC): 2026-02-18T17:23:54Z
- Device model: N/A
- OS version: N/A
- Platform (`ios` or `android`): `android`
- App build/version: N/A
- Install ID: N/A
- Scenario name: all Android launch scenarios (push register/update/unregister, quiet-hours, background audio, lockscreen controls, audio focus)
- Preconditions: physical Android device required
- Steps executed: none (blocked)
- Observed behavior: scenario could not be executed
- Expected behavior: all Android scenarios pass with evidence
- Result (`PASS` or `FAIL`): `FAIL`
- Related API logs path: `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md`
- Related device logs path: `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md`
- Screenshot/video paths: `/Volumes/VIXinSSD/Heliosinger/docs/launch/evidence/device/2026-02-18-terminal-only/android-terminal-blocked.md`
- Notes / follow-up actions: execute full matrix on one physical Android device and replace blocked evidence file with real artifacts.
