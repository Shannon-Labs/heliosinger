# Rollback Runbook

Last updated: 2026-02-18

## Preconditions

- Wrangler auth is active for the target Cloudflare account.
- You know the last known-good deployment identifiers.

## Worker rollback

1. List recent worker versions:

```bash
cd /Volumes/VIXinSSD/Heliosinger
npx wrangler versions list --name heliosinger-alerts-dispatcher
```

2. Roll back to last known-good version:

```bash
npx wrangler rollback <version_id> --name heliosinger-alerts-dispatcher --yes --message "rollback: restore known-good alerts dispatcher"
```

3. Confirm deployment status:

```bash
npx wrangler deployments status --config /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher/wrangler.toml
```

4. Tail one cron cycle:

```bash
npx wrangler tail heliosinger-alerts-dispatcher
```

5. Confirm snapshots continue writing:

```bash
npx wrangler d1 execute heliosinger-mobile --remote --command "SELECT id, snapshot_at, source, condition, created_at FROM space_weather_snapshots ORDER BY id DESC LIMIT 5;"
```

## Worker roll-forward after drill

```bash
cd /Volumes/VIXinSSD/Heliosinger
npx wrangler deploy --config /Volumes/VIXinSSD/Heliosinger/workers/alerts-dispatcher/wrangler.toml
```

## Pages rollback

Cloudflare Pages does not have a one-command rollback in Wrangler. Use one of these methods:

- Promote/redeploy a previous commit from CI that previously passed.
- Re-run deploy locally from the last known-good commit SHA.

Example local redeploy:

```bash
cd /Volumes/VIXinSSD/Heliosinger
git checkout <known_good_sha>
npm run build
npx wrangler pages deploy /Volumes/VIXinSSD/Heliosinger/dist --project-name=heliosinger --branch=main --commit-hash $(git rev-parse HEAD) --commit-message "rollback: restore known-good pages build"
```

Then return to `main` and continue normal release flow.

## Post-rollback acceptance checks

```bash
curl -i https://heliosinger.com/api/mobile/v1/space-weather/now
curl -i "https://heliosinger.com/api/mobile/v1/flares?limit=3"
curl -i https://heliosinger.com/api/mobile/v1/learn/context
```

Expected:

- API routes return JSON `200` responses.
- Worker logs show regular cron execution.
