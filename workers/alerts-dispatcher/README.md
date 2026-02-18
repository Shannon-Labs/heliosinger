# Alerts Dispatcher Worker

Scheduled worker that:

1. Polls NOAA datasets every minute.
2. Persists normalized snapshots and flare events to D1.
3. Evaluates per-device alert thresholds and quiet hours.
4. Sends Expo push notifications.
5. Logs notification results to `notification_log`.

## Deploy

```bash
cd workers/alerts-dispatcher
npx wrangler deploy
```

Required bindings:

- `HELIOSINGER_DB` (D1)
- `HELIOSINGER_KV` (KV)
- `EXPO_PUSH_ACCESS_TOKEN` (secret, optional but recommended)
