# Heliosinger Production Runbook

Last updated: 2026-02-18

## Scope

This runbook covers production provisioning and deployment for:

- Cloudflare Pages project: `heliosinger`
- Mobile API routes under `/api/mobile/v1/*`
- Alerts cron worker: `heliosinger-alerts-dispatcher`
- D1 database: `heliosinger-mobile`
- KV namespace binding: `HELIOSINGER_KV`

## 1) Provision resources

```bash
cd /Volumes/VIXinSSD/Heliosinger
npx wrangler d1 create heliosinger-mobile
npx wrangler kv namespace create HELIOSINGER_KV
```

Expected outcome:

- D1 create prints a `database_id` UUID.
- KV create prints an `id` UUID.

Copy both IDs into:

- `/Volumes/VIXinSSD/Heliosinger/wrangler.toml`
- `/Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher/wrangler.toml`

## 2) Apply migrations

```bash
cd /Volumes/VIXinSSD/Heliosinger
npx wrangler d1 execute heliosinger-mobile --remote --file /Volumes/VIXinSSD/Heliosinger/scripts/migrations/mobile/0001_initial.sql
npx wrangler d1 execute heliosinger-mobile --remote --file /Volumes/VIXinSSD/Heliosinger/scripts/migrations/mobile/0002_notification_dedupe.sql
```

Expected outcome:

- Tables: `device_subscriptions`, `space_weather_snapshots`, `flare_events`, `notification_log`.
- Unique notification index: `idx_notification_log_install_event_unique`.

## 3) Configure worker secret

```bash
cd /Volumes/VIXinSSD/Heliosinger
if [ -z "${EXPO_PUSH_ACCESS_TOKEN:-}" ]; then
  echo "EXPO_PUSH_ACCESS_TOKEN is missing; export it before continuing." >&2
  exit 1
fi
printf '%s' "$EXPO_PUSH_ACCESS_TOKEN" | npx wrangler secret put EXPO_PUSH_ACCESS_TOKEN --config /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher/wrangler.toml
```

Expected outcome:

- Wrangler confirms secret creation for `heliosinger-alerts-dispatcher`.
- Secret value is non-empty (wrangler accepts empty stdin, which is invalid for push dispatch).

## 4) Build and deploy

```bash
cd /Volumes/VIXinSSD/Heliosinger
npm run build
npx wrangler pages deploy /Volumes/VIXinSSD/Heliosinger/dist --project-name=heliosinger --branch=main --commit-hash $(git -C /Volumes/VIXinSSD/Heliosinger rev-parse HEAD) --commit-message "Launch hardening mobile backend"
npx wrangler deploy --config /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher/wrangler.toml
```

Expected outcome:

- Pages deployment URL printed and project domain updated.
- Worker deployment succeeds with cron trigger and bindings.

## 5) Smoke checks

### HTTP checks

```bash
curl -i https://heliosinger.com/api/mobile/v1/space-weather/now
curl -i "https://heliosinger.com/api/mobile/v1/flares?limit=3"
curl -i https://heliosinger.com/api/mobile/v1/learn/context
```

Success criteria:

- HTTP `200` JSON payloads.
- No HTML shell for mobile API routes.

### Worker and secret checks

```bash
npx wrangler deployments status --config /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher/wrangler.toml
npx wrangler secret list --config /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher/wrangler.toml
timeout 80 npx wrangler tail --config /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher/wrangler.toml --format json
```

Success criteria:

- Latest worker deployment status is healthy.
- `EXPO_PUSH_ACCESS_TOKEN` appears in secret list.
- `run.started` logs show `"hasExpoPushAccessToken":true`.

### D1 checks

```bash
npx wrangler d1 execute heliosinger-mobile --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
npx wrangler d1 execute heliosinger-mobile --remote --command "PRAGMA index_list('notification_log');"
npx wrangler d1 execute heliosinger-mobile --remote --command "SELECT id, snapshot_at, source, condition, created_at FROM space_weather_snapshots ORDER BY id DESC LIMIT 5;"
```

Success criteria:

- Schema objects exist.
- Snapshot rows are being written.

### Cron verification

```bash
npx wrangler tail heliosinger-alerts-dispatcher
```

Success criteria:

- At least one `run.started` and `run.completed` log appears.
- Snapshot write is reflected in D1 `space_weather_snapshots`.
