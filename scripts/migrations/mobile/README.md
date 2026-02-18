# Mobile D1 Migrations

Apply the initial schema:

```bash
npx wrangler d1 execute heliosinger-mobile --file ./scripts/migrations/mobile/0001_initial.sql
```

Recommended bindings:
- D1 binding name: `HELIOSINGER_DB`
- KV binding name: `HELIOSINGER_KV`
