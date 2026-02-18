# Alerts Dispatcher Worker

Scheduled worker that:

1. Polls NOAA datasets every minute.
2. Persists normalized snapshots and flare events to D1.
3. Evaluates per-device alert thresholds and quiet hours.
4. Sends Expo push notifications.
5. Logs notification results to `notification_log`.
6. Applies per-device dedupe cooldown (`installId + dedupeKey`, 15 minutes).

## Deploy

```bash
cd workers/alerts-dispatcher
npx wrangler deploy --dry-run
npx wrangler deploy
```

Required bindings:

- `HELIOSINGER_DB` (D1)
- `HELIOSINGER_KV` (KV)
- `EXPO_PUSH_ACCESS_TOKEN` (secret, optional but recommended)

## Verify

1. Check worker health and bindings

```bash
cd /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher
npx wrangler deployments list
npx wrangler tail
```

2. Verify recent snapshot + notification rows

```bash
cd /Volumes/VIXinSSD/Heliosinger
npx wrangler d1 execute heliosinger-mobile --command "SELECT id, snapshot_at, source, condition, created_at FROM space_weather_snapshots ORDER BY id DESC LIMIT 5;"
npx wrangler d1 execute heliosinger-mobile --command "SELECT install_id, event_id, status, reason, created_at FROM notification_log ORDER BY id DESC LIMIT 20;"
```

3. Confirm dedupe index exists

```bash
npx wrangler d1 execute heliosinger-mobile --command "PRAGMA index_list('notification_log');"
```

## Rollback

If a deploy regresses behavior:

1. Re-deploy the previous known-good commit of `workers/alerts-dispatcher/src/index.ts`.
2. Confirm schedule execution and notification flow with `npx wrangler tail`.
3. Re-run verification queries above to confirm rows are being written as expected.
