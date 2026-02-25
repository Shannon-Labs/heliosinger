# Rollback Drill Log

Last updated: 2026-02-18

## Instructions

- Run one rollback drill per launch cycle.
- Fill every field below with exact timestamps and command outputs.

## Drill Entry

- Date (UTC): 2026-02-18T16:57:45Z
- Operator: `hbown@smu.edu`
- Worker version before rollback: `eabff0b8-54d1-4c52-95da-2cd575d54931`
- Worker version rolled back to: `5e0119cd-8ae0-44b1-9d89-fd2cb631ba24`
- Rollback command used:
  `npx wrangler rollback 5e0119cd-8ae0-44b1-9d89-fd2cb631ba24 --name heliosinger-alerts-dispatcher --yes --message "launch rollback drill"`
- Deployment status after rollback:
  `Created: 2026-02-18T16:56:00.295Z`, `Version(s): (100%) 5e0119cd-8ae0-44b1-9d89-fd2cb631ba24`
- Tail evidence snippet (`run.started` / `run.completed`):
  `{"event":"run.started","dispatchCap":200,"hasExpoPushAccessToken":false}`
  `{"event":"run.completed","snapshotSource":"live","devicesScanned":0,"eligibleDevices":0,"eventsDetected":0,"sent":0,"skipped":0,"failed":0,"capped":0,"durationMs":2060}`
- D1 snapshot query evidence:
  Latest row observed after rollback: `id=6`, `snapshot_at=2026-02-18T16:53:00.000Z`, `source=live`, `condition=moderate`, `created_at=2026-02-18 16:56:52`
- Roll-forward command used:
  `npx wrangler deploy --config /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher/wrangler.toml`
- Worker version after roll-forward: `eabb0212-5434-447c-a490-d4dd36ee6d81` (`Created: 2026-02-18T16:56:11.254Z`)
- Outcome: `PASS`
- Notes:
  Rollback/roll-forward completed without trigger downtime. Push dispatch remains gated until `EXPO_PUSH_ACCESS_TOKEN` is set in worker secrets.
