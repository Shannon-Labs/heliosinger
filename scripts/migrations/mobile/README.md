# Mobile D1 Migrations

Apply migrations in order:

```bash
npx wrangler d1 execute heliosinger-mobile --file ./scripts/migrations/mobile/0001_initial.sql
npx wrangler d1 execute heliosinger-mobile --file ./scripts/migrations/mobile/0002_notification_dedupe.sql
```

Recommended bindings:
- D1 binding name: `HELIOSINGER_DB`
- KV binding name: `HELIOSINGER_KV`

## Ordered Flow

1. Create database:

```bash
npx wrangler d1 create heliosinger-mobile
```

2. Run `0001_initial.sql`.
3. Run `0002_notification_dedupe.sql`.
4. Deploy Pages Functions + alerts worker.

## Verification Queries

```bash
npx wrangler d1 execute heliosinger-mobile --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
npx wrangler d1 execute heliosinger-mobile --command "PRAGMA table_info('device_subscriptions');"
npx wrangler d1 execute heliosinger-mobile --command "PRAGMA index_list('notification_log');"
npx wrangler d1 execute heliosinger-mobile --command "PRAGMA index_info('idx_notification_log_install_event_unique');"
```
