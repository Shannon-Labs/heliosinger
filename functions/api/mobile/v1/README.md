# Mobile API v1

Routes:

- `GET /api/mobile/v1/space-weather/now`
- `GET /api/mobile/v1/flares?limit=50`
- `GET /api/mobile/v1/learn/context`
- `POST /api/mobile/v1/devices/register`
- `PUT /api/mobile/v1/devices/preferences`
- `DELETE /api/mobile/v1/devices/unregister`

These endpoints are additive and do not alter existing web routes.

## Error Contract

All non-2xx responses use the same payload:

```json
{
  "ok": false,
  "error": {
    "code": "stable_error_code",
    "message": "Human-readable summary",
    "details": {}
  },
  "requestId": "optional-cf-request-id"
}
```

Common codes:
- `invalid_json`
- `invalid_registration_payload`
- `invalid_preferences_payload`
- `invalid_install_id`
- `device_not_found`
- `space_weather_now_failed`
- `flare_timeline_failed`
- `learning_context_failed`

## Success Payload Notes

- Existing mobile success shapes remain backward-compatible.
- Responses include `source` where applicable (`live` or `cached`).
- Responses include `meta` with optional `requestId` and storage details.

## Request Examples

Register:

```json
{
  "installId": "hs-abcd1234",
  "pushToken": "ExponentPushToken[xxxx]",
  "timezone": "America/Los_Angeles",
  "platform": "ios",
  "appVersion": "0.1.0",
  "preferences": {
    "installId": "hs-abcd1234",
    "alertsEnabled": true,
    "thresholds": {
      "kp": 5,
      "bzSouth": 8,
      "flareClasses": ["M", "X"]
    },
    "quietHours": {
      "enabled": false,
      "startHour": 22,
      "endHour": 7
    },
    "backgroundAudioEnabled": true
  }
}
```

Update preferences:

```json
{
  "installId": "hs-abcd1234",
  "alertsEnabled": false,
  "thresholds": {
    "kp": 6,
    "bzSouth": 10,
    "flareClasses": ["X"]
  },
  "quietHours": {
    "enabled": true,
    "startHour": 23,
    "endHour": 6
  },
  "backgroundAudioEnabled": true
}
```

Unregister:

```json
{
  "installId": "hs-abcd1234"
}
```

## Fallback Behavior

- Reads: `KV -> D1 -> in-memory`.
- Writes: `D1` first, then `KV`; in-memory fallback is used when D1 is unavailable.
- Cached snapshots recompute staleness at response time.
