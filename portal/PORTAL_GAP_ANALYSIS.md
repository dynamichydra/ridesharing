# Admin Portal Gap Analysis

Compares what `backend/` can already do against what `portal/` actually exposes, and lists what's
missing for the portal to work like a real ops/support tool at a mature ride-sharing company (think
Uber/Ola/Lyft internal admin tooling). Driver self-registration/onboarding *screens* are
intentionally out of scope — drivers register from the mobile app, not the admin portal — but the
**admin-side config tools** for that system (question builder, document types, legal docs) are in
scope, since backend already built full CRUD APIs for them that the portal never wired up.

Sources: full endpoint inventory of `backend/src/modules/**`, `backend/docs/*.md`,
`drizzle/schema/index.js`; full inventory of `portal/src/features/**`, routes, nav, and dependencies.

---

## 1. Backend features with zero portal UI

These are endpoints/entities the backend already supports that have **no page at all** in the
portal today.

| Area | Backend support | Portal today |
|---|---|---|
| **Onboarding config admin** (question builder, conditional logic, options, reorder) | `GET/POST/PATCH /onboarding/admin/questions`, `/reorder`, `/options` | None — admin can't edit the driver questionnaire without hitting the API directly |
| **Legal documents admin** (ToS/privacy versions) | `GET/POST /onboarding/admin/legal` | None |
| **Translations admin** (Tier-2 content localization) | `PUT /onboarding/admin/translations/:entityType/:entityId` | None |
| **Document types & per-scope requirements** | `GET/POST/PATCH /documents/admin/types`, `/types/:id/requirements` | None — only per-driver document *review* exists (approve/reject), not the config of what's required where |
| **Admin user management** | Not built in backend either (see §4) — only `/auth/admin/login` exists | Login only; no create/list admins, no roles |
| **Payment transactions** | `payments` table exists, but backend has **no admin route** to list/search/refund | None — driver list shows only a `subscriptionStatus` badge |
| **Individual driver subscription history** (renewals, cancellations, payment attempts) | `GET /subscriptions/history` is driver-self only; no admin equivalent | None — portal's "subscriptions" feature manages *plans*, not actual subscriber records |
| **Driver device/session admin view** (fraud signal) | `GET /auth/devices` is driver-self only | None |
| **Language management** | `languages` table exists, no CRUD route anywhere | None |
| **Live ride tracking (admin)** | `/tracking/:rideId` exists for rider/driver only | None — no map view of an in-progress ride for support/ops |
| **Ride manual actions** | No backend route for admin-initiated cancel/reassign/fare-override either | Rides page is read-only telemetry |
| **Rider block/unblock** | Drivers have dedicated `/block` `/unblock`; riders only have generic `PATCH /riders/:id` | Portal toggles it through the generic PATCH — works, but no reason field/audit trail like the driver flow has |
| **Bank details / emergency contacts** | Tables don't exist in schema yet (documented but not built) | N/A — flag as a backend gap, not a portal one |

**Bug found in passing (backend, not portal):** `backend/docs/API_ENDPOINTS.md` documents driver
list filters `registrationStatus`/`countryId`/`cityId`, but the actual route only implements
`approvalStatus`/`subscriptionStatus`/`isBlocked`. Worth reconciling doc vs. code.

---

## 2. Existing portal features — incomplete or buggy

| Feature | Issue |
|---|---|
| **Users (riders)** | `pages/list.tsx` hardcodes `page: 1, limit: 10` into the query instead of reading the filter controller's actual page/limit — **pagination is broken**, clicking page 2 or changing page size does nothing to the fetched data. No detail/edit page, only inline verify/block toggles. |
| **Drivers list** | Backend supports `registrationStatus`/`countryId`/`cityId` filters (per docs) but only `approvalStatus` is exposed as a UI filter. |
| **Rides** | No manual action of any kind (cancel, reassign, refund, fare override) — purely observational. For a support team this is the highest-friction gap: a rider calls in with a stuck ride and the admin can only *look* at it. |
| **Fare rules** | No search/filter on the list at all; also uses local `useState` pagination instead of the shared `useFilterController` pattern the rest of the app uses — inconsistent UX and harder to maintain. |
| **Subscription plans** | Same — no filters, local pagination, inconsistent with `geo`/`drivers`/`users`. |
| **Zones** | Polygon is edited as a raw `[[lng,lat],...]` JSON textarea — no map-based visual editor. Error-prone for non-technical ops staff. |
| **"No delete on master data" policy violation** | [[feedback_no_delete_master_data]] says never add delete endpoints for master data — but **`vehicle-types`, `zones`, `fare-rules`, and `subscription-plans` all already call `DELETE` endpoints** in the portal (some with a code comment claiming "soft delete" that doesn't match the hard `DELETE` HTTP verb actually used). This directly contradicts stated policy and should be reconciled — either the policy needs an explicit carve-out for these four, or they need to move to enable/disable like `geo` already does. |
| **Orphan nav links** | Header dropdown links to `user/profile` and `user/reset-password/:id` — neither route exists, so these menu items currently go nowhere. `components/nav-user.tsx` is dead code with a no-op "Profile" click handler. |
| **Dead filter components** | `RiderFilters`, `DriverFilters`, `RideFilterForm` are all unused, superseded by `AutoFilters` — worth deleting to avoid confusion for the next person who edits filters. |

---

## 3. Cross-cutting infrastructure — what a mature admin portal needs

Ranked roughly by how much a support/ops team would feel the absence day-to-day.

- **Role-based access control (RBAC) in the UI.** `UserRole = "super_admin" | "admin"` already
  exists in the type system and `ProtectedRoute` already accepts an `allowedRoles` prop — it's just
  never used. Every admin currently sees every page and can hit every mutation. Real companies
  split this: e.g. support agents can view rides/riders but not touch fare rules or subscription
  plans; only super_admin can manage admins, pricing, or payouts.
- **Error boundary.** A single uncaught render error currently blanks the whole app. One
  `<ErrorBoundary>` around the router fixes this for the entire portal.
- **Audit-log viewer.** Backend already tracks `audit_logs` and exposes `GET /admin/audit-logs` —
  the portal has no page for it. This is usually one of the first things a compliance/security
  reviewer asks for ("who approved this driver / changed this fare rule / blocked this rider").
- **CSV/data export.** Zero list pages support exporting to CSV. Finance and ops teams routinely
  need "give me all completed rides last month" as a spreadsheet, not a paginated table.
- **Global search.** The `cmdk`/command-palette infrastructure (`Search.tsx`, `command.tsx`) is
  already built but unused — no feature wires it up. A `Cmd+K` "find driver by phone / ride by ID /
  rider by email" is standard in ops tooling and the scaffolding already exists.
- **Real-time updates.** No Socket.IO client despite the backend having a full Socket.IO layer for
  driver location and ride status. Rides/drivers pages are poll-on-refetch only. A support agent
  watching an active ride currently has no live view.
- **Environment-based config.** `SERVER_URL` is hardcoded to `localhost:3000` in
  `src/constant/index.ts` with no `import.meta.env` usage — there is currently no way to point a
  built portal at staging/prod without editing source and rebuilding. This blocks any real deploy
  pipeline.
- **Bulk operations.** Everything is single-record (one driver approved at a time, one document
  verified at a time). At any real scale (hundreds of pending driver approvals) this becomes the
  main bottleneck for an ops team.
- **Notification/broadcast tool.** No way for an admin to push an ad-hoc message to a rider,
  driver, or a filtered segment (e.g. "drivers in Zone X, subscription expiring this week"). Backend
  has no route for this either — would need both layers.
- **Payments/refunds workspace.** Given this is a subscription-driver-pays model, being unable to
  see or refund an individual payment transaction is a real operational gap once real money is
  flowing — currently neither backend nor portal support it.
- **Testing.** No `vitest`/RTL setup in the portal at all. Even light coverage on the filter
  controller and mutation hooks (the two things that just caused the pagination bug above) would
  catch regressions before they ship.
- **Consistency cleanup.** Standardize every list page on `useFilterController` +
  `AutoFilters` (fare-rules and subscriptions currently deviate) and on `zodResolver`-backed forms
  (vehicle-types/zones/geo currently hand-roll `useState` + manual `safeParse`). Reduces the surface
  area new engineers need to learn.
- **Minor polish already half-built:** `Skeleton`, `breadcrumb`, and `multi-select` UI primitives
  exist in `components/ui/` but are unused anywhere — low-effort wins to adopt for loading states,
  page trails, and multi-value filters.
- **Dependency hygiene:** `moment` is installed with zero usages — drop it (date-fns is already the
  actual dependency in use), keeps the bundle and audit surface smaller.
- **i18n.** All strings are hardcoded English. Lower priority unless the ops team itself is
  multi-region, but worth flagging since the backend already has a two-tier localization system
  designed for the *product*.

---

## 4. New feature areas — need backend work too, not just portal

These don't exist anywhere in the stack yet but are standard for a company at this stage:

- **Multi-admin accounts with roles** — currently only one seeded admin login exists; no way to
  create a second admin or a support-only role via API.
- **Admin self-service profile/password** — there was a portal menu for this pointing at routes
  that never existed; removed rather than built, because there's no backend route for an admin to
  view/update their own profile or change their own password either (only `/auth/admin/login`
  exists). A real gap once there's more than one admin account.
- **Promo codes / coupons / referral credits** — no schema, no routes, no UI. Common growth lever
  for a ride-sharing platform's rider or driver side.
- **Support tickets / disputes / refund workflow** — no schema, no routes, no UI. Currently there's
  no structured way to track "rider says driver overcharged them" from report to resolution.
- **Driver payouts/earnings** (distinct from the subscription-payment flow) — not applicable if
  drivers only ever pay a subscription and never receive platform-processed payouts; confirm this
  is intentional for the business model before treating it as a gap.
- **Bank details / emergency contacts** — documented in the driver-registration design doc as steps
  9–10 but the tables were never added to the schema; registration is effectively short by two
  steps versus its own design doc.

---

## 5. Suggested priority order

All P0–P2 items below are done. Kept as a record of what changed and why.

**P0 — fixes to existing broken/inconsistent behavior**
1. ✅ Fixed the riders-list pagination bug (`pages/list.tsx` was ignoring filter controller state).
2. ✅ Reconciled the DELETE-vs-no-delete-policy conflict on vehicle-types/zones/fare-rules/subscriptions
   — converted to `PATCH .../:id/enable|disable`, matching the `geo` module's pattern (backend +
   portal, plus audit-log events on every toggle).
3. ✅ Added an error boundary (`src/components/error-boundary.tsx`, wraps the app in `App.tsx`).
4. ✅ Removed the two orphan profile/reset-password menu items (no backend route ever existed for
   admin self-service profile/password — flagged as a real gap, see §4) and deleted dead components
   (`nav-user.tsx`, the three unused legacy `*Filters` components).

**P1 — highest-value missing capability for day-to-day ops**
5. ✅ Wired up RBAC — `vehicle-types`/`zones`/`locations`/`fare-rules`/`subscription-plans`/
   `audit-logs`/`onboarding-config` are now `super_admin`-only, both in route guards
   (`AppRoutes.tsx`) and sidebar visibility (`app-sidebar.tsx`); `admin` role keeps
   dashboard/users/drivers/rides.
6. ✅ Added manual ride cancellation for admins — `POST /rides/:id/cancel/admin` (backend) +
   a reason field and action in the ride detail dialog (portal). Reassignment/fare-override still
   don't exist — flagged as a future gap.
7. ✅ Audit-log viewer page (`/audit-logs`) — the backend endpoint already existed and is already
   fed by a working Kafka consumer; also added missing `AUDIT_LOG` events for the new enable/disable
   toggles and admin ride cancellation so the log has real entries for those actions.
8. ✅ Admin-side onboarding config UI (`/onboarding-config`) — document types + per-scope
   requirements, question builder with conditional (`dependsOn…`) logic and options management,
   legal document version publishing. Backend was missing a `GET .../questions/:id/options` list
   endpoint entirely — added it, since the UI had no way to manage existing options without it.
   Translations admin UI intentionally skipped (English-only).
9. ✅ Individual driver subscription/payment history — new admin endpoints
   (`GET /subscriptions/admin/drivers/:driverId/history` and `.../payments`) plus a panel on the
   driver detail page. Payment history only covers attempts already linked to a subscription — an
   attempt that failed before ever activating one has no driverId anywhere on that row; documented
   in code as a schema limitation, not fixed (would need a new column/migration).

**P2 — scale/robustness for a bigger team**
10. ✅ CSV export on the three highest-traffic operational lists (riders, drivers, rides) — shared
    `src/lib/csv.ts` utility, pulls up to 5000 rows matching current filters since there's no
    dedicated backend export endpoint.
11. ✅ Global search (`Cmd+K`) using the already-built `cmdk` scaffolding — searches riders and
    drivers by name/phone/email, jumps to any nav page. Along the way, found and fixed a real
    backend gap: the admin driver list had **no search filter at all** (only status/blocked
    filters), unlike riders which already had one.
12. ✅ Bulk approve (drivers, pending only) and bulk block/unblock (riders) — added a reusable
    row-selection checkbox column (`components/data-table/selection-column.tsx`) since `DataTable`
    already supported controlled `rowSelection` but no column ever used it. Implemented as
    client-side `Promise.allSettled` over per-record mutations (no bulk backend endpoint exists).
13. ✅ Env-based API URL config — `VITE_API_BASE_URL` (see `.env.example`), falls back to
    `localhost:3000` for dev. `.gitignore` updated so a real `.env` can never be committed.
14. ✅ Standardized fare-rules and subscription-plans list pages onto `useFilterController` +
    `AutoFilters` (previously local `useState` pagination with zero filters). Added the
    corresponding backend filters (`ruleType`/`isActive`/`countryId` for fare rules;
    `countryId`/`isActive` for plans) since they didn't exist to filter by.
    Note: did **not** migrate vehicle-types/zones/geo off their hand-rolled `useState` forms onto
    `zodResolver` — the existing `fare-rules` and `subscriptions` forms already have a broken
    `zodResolver` type conflict (two incompatible `react-hook-form` copies in `node_modules`,
    pre-existing, unrelated to this work) and converting more forms would likely hit the same
    wall. Worth a dependency dedupe pass before attempting that migration.

**P3 — needs backend design work first**
15. Payments/refunds admin view.
16. Notification broadcast tool.
17. Promo codes, support tickets/disputes.
18. Multi-admin account management with roles.
