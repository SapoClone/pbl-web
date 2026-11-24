# End-to-end tests (Playwright)

Real browser, real backend. The tests drive the tenant web app the way a store owner does (sign up, create the store,
catalogue, stock, suppliers, customers, promotions, POS sale, orders, staff and roles, reports) against the docker
compose stack behind the KrakenD gateway. Every test is **recorded on video** with an on-screen caption for each step.

The flows themselves are written down in [flows/FLOWS.md](flows/FLOWS.md) (one section per spec file, in run order).
[flows/UI-INVENTORY.md](flows/UI-INVENTORY.md) lists every screen's labels, messages and API calls. Test data is a
coffee shop with named people and products: [support/data.ts](support/data.ts).

## Run it

```bash
# 1. the backend (from pbl-api): the gateway must answer on http://localhost:18080 (override with E2E_GATEWAY_URL)
#    its CORS allows only http://localhost:5173 and :3000 for the web app
docker --context kiri compose up -d

# 2. the tests (this folder has its own package.json: the app's yarn lockfile and CI are untouched)
cd e2e
npm install
npx playwright install chromium
npm test                       # a FRESH world: new run id, new owner account, new store; runs 01..13 in order
npm run report                 # opens the HTML report: every test with its steps, video and failure details
```

`npm test` starts the web app's vite dev server itself (port 5173, `VITE_API_URL` pointed at the gateway) unless one
is already running there.

Videos are in `reports/artifacts/<test>/video.webm` and inside the HTML report. A failing test also keeps a
screenshot and a trace (`npx playwright show-trace <trace.zip>`).

### One spec at a time

The specs build on each other (the store, the catalogue, the stock), so the first full run creates a *world* in
`.auth/` (run id, owner session). To work on one spec afterwards reuse it:

```bash
npm run test:spec -- tests/05-warehouses-transfers-stocktake.spec.ts --headed
```

Specs after the first are re-runnable on the same world (they create what is missing and assert stock as deltas).
Only `01-auth-and-onboarding` needs a fresh world (`npm test`, or `E2E_FRESH=1`).

## Skipped on purpose (`test.fixme`, they show in the report with the reason)

| Flow | Why |
|---|---|
| Forgot password | backend placeholder: `POST /auth/forgot-password` sends nothing and answers a plain string |
| Combos | backend has no combo-items endpoints yet |
| Edit a promotion / coupon, coupon simulator | `PATCH /promotions/{id}`, `PATCH /coupons/{id}`, `POST /coupons/evaluate` are not routed |
| Connect a Lazada / Shopee shop | needs the real marketplace (OAuth, seller account) |
| Product image upload | needs S3 |
| Customer list "Điểm thưởng" column | app bug: the page reads `pointsBalance`, the API returns `loyaltyPoints` |

## Notes for whoever extends it

- Add names, SKUs and prices to `support/data.ts`, never inline in a spec.
- The local stack's Free plan is 1 branch / 3 users (`freePlan` in `data.ts`). Production's Free plan was changed by
  hand, so `02-settings-and-plan` is meant for the local stack.
- The app has almost no `data-testid`; selectors use role and visible text. A few lists are stale after creating
  something until the page reloads (a real app quirk): the specs reload and re-assert, which doubles as the
  persistence check.
