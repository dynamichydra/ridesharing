# CLAUDE.md (portal)

Guidance for Claude Code when working inside `portal/` — the React admin web portal for the
ride-sharing platform. See the repo-root `CLAUDE.md` for how this project fits into the rest of
the monorepo (`backend/`, `app/`).

This doc is written the way an engineering team's internal frontend guide would be: it states the
conventions, shows the canonical example, gives a copy-paste playbook for new work, and is honest
about the parts of the codebase that don't yet meet the standard so nobody "fixes" them by
surprise in an unrelated PR.

## Stack

React 19 + Vite + TypeScript, Tailwind v4, Radix UI primitives wrapped shadcn-style in
`src/components/ui`, TanStack Query (server state) + TanStack Table (grids), react-hook-form +
zod (forms), react-router-dom (routing), axios (HTTP), react-hot-toast (notifications).

```bash
npm run dev       # vite dev server
npm run build     # tsc -b && vite build
npm run lint      # oxlint
npm run preview
```

There is no test runner configured (no vitest/jest in `package.json`) and `tsconfig.app.json` does
not set `"strict": true` — it only opts into `noUnusedLocals`/`noUnusedParameters`/
`noFallthroughCasesInSwitch`. Don't assume type-safety or test coverage guarantees this repo
doesn't actually have; see [Known gaps](#known-gaps--tech-debt).

## Architecture layers

Requests flow in one direction; each layer only talks to the one directly below it.

```
pages/*.tsx            route-level component: wires hooks + UI, owns page-local state
   |
components/*.tsx       dialog = stateful (owns a mutation + form), form = dumb (just fields),
   |                    column.tsx = table cell factory (takes callbacks, no hooks)
   |
hooks.ts               useQuery / useMutation — the ONLY place feature code talks to TanStack Query
   |
api.ts                 one function per REST endpoint, thin, calls apiClient
   |
lib/api-client.ts       unwraps backend's { SUCCESS, MESSAGE, COUNT?, PAGINATION? } envelope
   |
lib/api.ts (axios)      base URL, JWT bearer header, global 401/403/405 handling
   |
backend REST API
```

Never skip a layer — a `pages/*.tsx` file should not import axios or `apiClient` directly, and a
`components/*.tsx` file should not import `ridersApi`/`ridesApi`/etc. directly; it goes through the
feature's `hooks.ts`. This is what makes every feature swappable/copyable as a unit.

## State management: which tool owns which state

Big source of bugs in admin UIs is fighting over who owns a piece of state. This repo has a fixed
answer per kind of state — don't introduce a new mechanism for one of these without a reason:

| Kind of state | Owner | Example |
|---|---|---|
| Server data (anything from the API) | TanStack Query, via feature `hooks.ts` | `useRiders`, `useUpdateRider` |
| List filters / pagination / sort | URL query string, via `useFilterController` | `?search=&isVerified=true&page=2` |
| Auth session | `LocalStorage` (`rideshare-admin-user` key) + `useUser` hook | `ProtectedRoute`, axios interceptor |
| Ephemeral UI state (dialog open, draft input) | Local `useState` in the page/component | `isCreateOpen` in `list.tsx` |
| Cross-cutting client state (theme) | React Context provider | `ThemeProvider` |

There is no global client-state store (no Redux/Zustand/Jotai) and none is needed — if a feature
seems to need one, it's almost always because server state or URL state should have been used
instead. Filters belong in the URL (shareable/back-button-safe), not in `useState`.

## Data layer contract

- `src/lib/api.ts` — the single axios instance (`API`). Request interceptor attaches
  `Authorization: Bearer <access_token>` read from `LocalStorage.get("rideshare-admin-user")`.
  Response interceptor force-logs-out and hard-redirects to `/login` on 401/403/405 — any endpoint
  that legitimately returns 403 for a non-auth reason (e.g. "not allowed to edit this specific
  record") will still get the user logged out; that's a known sharp edge, don't special-case
  around it in feature code without a real fix.
- `src/lib/api-client.ts` — every feature's `api.ts` calls through `apiClient`, never `API`/axios
  directly. `apiClient.get` returns the **full envelope** (so callers get `COUNT`/`PAGINATION`);
  `post`/`patch`/`put`/`delete` unwrap to just `MESSAGE` and throw if `SUCCESS` is false. This
  mirrors the backend's `utils/response.js` convention documented in the root `CLAUDE.md` — the two
  must be read together when changing either side.
- Query keys are `[FEATURE_KEY, params]` (e.g. `["riders", params]`) — the whole params object is
  part of the key, so every distinct filter/page combination caches independently. Mutations
  invalidate by the bare `[FEATURE_KEY]` prefix, which matches every params variant.

## Feature module pattern

Each domain lives in `src/features/<domain>/` and repeats the same file set. Every one of these
files exists (or should) for every feature: `auth`, `dashboard`, `drivers`, `fare-rules`, `rides`,
`subscriptions`, `users`, `vehicle-types`, `zones`.

```
src/features/<domain>/
  api.ts             # thin wrapper: one function per endpoint, calls apiClient
  types.ts           # entity interface + ListParams + Create/Update payload types
  schema.ts          # zod schema + inferred form-values type + an "empty" default-values const
  hooks.ts           # TanStack Query hooks: useX (list query), useCreateX/useUpdateX (mutations)
  components/
    column.tsx       # getXColumns(actions) -> ColumnDef<X>[] factory for TanStack Table
    dialog.tsx        # Create/Edit dialog: react-hook-form + zodResolver + the shared form
    form.tsx          # presentational fields only, bound via `form: UseFormReturn<...>`
  pages/
    list.tsx / index.tsx   # the routed page: wires hooks + filters + DataTable + dialog
```

**`types.ts` vs `schema.ts`** — don't merge these. `types.ts` describes the wire shape (what the
API sends/accepts); `schema.ts` describes form validation (what the user is allowed to type). They
usually overlap but aren't identical (e.g. a required API field can have an optional/defaulted
form field, or a string API field can have a regex-validated form field).

### Worked example: `src/features/users/`

Note the naming: the folder/route is `users`, but the entity, types, hooks, and api are all named
around **`Rider`** (`Rider`, `ridersApi`, `useRiders`, `riderSchema`, `RiderForm`,
`CreateRiderDialog`, `/riders` backend route). The portal's "Users" page manages riders — don't be
thrown by the mismatch when extending it, and don't rename one without the other.

1. **`api.ts`** — one object (`ridersApi`) with `list`/`create`/`update` methods, each a one-line
   call into `apiClient`, endpoint documented with an inline `// GET /riders?...  (Admin)` style
   comment above the definition. A local `buildQuery()` turns a typed params object into a query
   string.

   ```ts
   export const ridersApi = {
     list: (params: RiderListParams) => apiClient.get<Rider[]>(`${BASE_URL}?${buildQuery(params)}`),
     create: (payload: CreateRiderPayload) => apiClient.post<Rider>(BASE_URL, payload),
     update: (id: string, payload: UpdateRiderPayload) =>
       apiClient.patch<Rider>(`${BASE_URL}/${id}`, payload),
   };
   ```

2. **`types.ts`** — plain interfaces, no zod here: `Rider` (API shape), `RiderListParams`
   (query filters + pagination), `CreateRiderPayload`, and `UpdateRiderPayload` derived with
   `Partial<Pick<Rider, ...>>` rather than hand-duplicated.

3. **`schema.ts`** — zod schema for the create/edit form (`riderSchema`), the inferred
   `RiderFormValues` type, and an `emptyRiderFormValues` constant used to reset the form.

4. **`hooks.ts`** — one `useQuery` per list endpoint keyed `[RIDERS_KEY, params]`, and one
   `useMutation` per write endpoint. Every mutation's `onSuccess` invalidates the list query key
   (`refetchType: "active"`) and fires a `toast.success(...)`; `onError` fires `toast.error(...)`.
   This invalidate+toast pair is the standard shape — copy it verbatim for new mutations. Mutation
   `onError` handlers currently type the error as `any` (`(err: any) => ...`) to read `err.message`
   — that's the established pattern here, not something to "fix" in passing; see
   [Known gaps](#known-gaps--tech-debt) if you want to tighten it project-wide instead.

5. **`components/column.tsx`** — `getRiderColumns({ onToggleVerify, onToggleBlock })` returns a
   `ColumnDef<Rider>[]`. Action callbacks are passed in as props rather than imported, so the
   column factory stays presentational and the page owns the actual mutation-calling logic.
   Status/boolean cells render as small pill/badge JSX inline (see the `isVerified`/`isBlocked`
   cells) rather than pulling in a separate Badge abstraction.

6. **`components/dialog.tsx`** + **`components/form.tsx`** — `CreateRiderDialog` owns the
   `useForm` + `zodResolver(riderSchema)` + the create mutation and resets the form via
   `useEffect` when `open` flips true; `RiderForm` is purely presentational, taking
   `form: UseFormReturn<RiderFormValues>` as a prop and rendering `<Input {...register(...)}>`
   fields plus a `Controller` for the one checkbox field. Split dialog (stateful, mutation-aware)
   from form (dumb, just fields) like this for every feature.

7. **`pages/list.tsx`** — the page component. Notice it does *not* use
   `components/filters.tsx` (an older, hand-rolled search+reset bar still present in this
   feature) — it uses the newer shared **`AutoFilters`** system instead:
   - Declare a `FILTER_SCHEMA: FilterSchema` (label/type/field/operator/options per filter).
   - `const controller = useFilterController()` — syncs a `draft`/`applied` pair of filter state
     to the URL query string (draft is what inputs show live; applied is what actually triggers
     the query, only updated when the user hits Search/Enter or changes a page).
   - Render `<AutoFilters schema={...} controller={controller} .../>` — it renders the right input
     type per schema entry and wires Search/Reset for you.
   - Feed `controller.applied.<field>` into the list `useQuery` params.
   - Render `<DataTable columns={...} data={data?.MESSAGE ?? []} pageCount={data?.PAGINATION?.totalPages || 0} .../>`
     — `DataTable` (`src/components/data-table/data-table.tsx`) is a generic manual-pagination
     wrapper over `@tanstack/react-table`: it owns sorting/column-filter/row-selection state
     internally, takes `isLoading`/`isFetching` for the loading skeleton vs. background-refetch
     progress bar, and a page-size `<Select>` (10/20/50/100) baked in.
   - `columns` are built with `useMemo`, action handlers with `useCallback`, so the table doesn't
     re-render columns every keystroke.

   **When adding a new list page, use `AutoFilters` + `useFilterController`, not the
   `components/filters.tsx`-style hand-rolled bar** — that pattern is legacy and only survives in
   `users` because it predates `AutoFilters`.

## How the app is wired together

- `src/App.tsx` — mounts `QueryClientProvider` (single shared `queryClient` from
  `src/lib/queryClient`), `ThemeProvider`, `AppRoutes`, and a global `<Toaster />`.
- `src/routes/AppRoutes.tsx` — one `createBrowserRouter` tree. Every page is `React.lazy`-loaded
  and wrapped in `<Suspense fallback={<Loader />}>`. `/login` and `/register` are public; everything
  else nests under `/` behind `<ProtectedRoute>` and the `Root` layout (sidebar/header shell in
  `src/layouts/Root/`). Adding a page = add a route here + a lazy import + an entry in
  `src/config/navConfig.ts` for the sidebar link.

## Error handling & loading UX

- **Mutations**: toast on both success and error (`react-hot-toast`); never fail silently. See
  `hooks.ts` pattern above.
- **Queries**: `isLoading` (no cached data yet) drives the full-table skeleton in `DataTable`;
  `isFetching` (refetch in flight, stale data still shown) drives the thin top progress bar and a
  60%-opacity dim on existing rows. Pass both through from the feature's `useQuery` — don't
  collapse them into one loading flag, the UX depends on the distinction.
- **Route-level failures**: `ProtectedRoute` redirects unauthenticated/unauthorized users; there is
  no error boundary around routed pages, so an uncaught render error in a page currently blanks the
  app rather than showing a fallback UI (see [Known gaps](#known-gaps--tech-debt)).
- **Form validation**: zod + `zodResolver`, errors rendered inline under each field
  (`errors.<field>.message`, styled `text-xs text-destructive`) — never `alert()` or a toast for
  field-level validation, only for submit-level API errors.

## Security notes

- Auth token lives in `localStorage` under `rideshare-admin-user`, run through `LocalStorage.set`
  (`btoa(JSON.stringify(value))`). **This is base64 encoding, not encryption** — it is trivially
  readable via devtools and offers no protection against XSS token theft. Don't describe it as
  "encrypted" in comments/docs, and don't add sensitive data (passwords, full card numbers) to
  anything stored this way.
- Every write request goes through the shared axios instance, so the bearer token and the global
  401/403/405 logout are automatic — don't hand-roll a separate `fetch`/axios call for a new
  feature, it will silently skip both.
- Master-data resources (users/riders, drivers, subscriptions, countries, vehicle types, etc.) have
  **no delete endpoints or delete UI** — this is an intentional platform-wide rule, not an
  oversight. Use/extend the block-unblock / verify-unverify / activate-deactivate toggle pattern
  (see `onToggleBlock`/`onToggleVerify` in the users example) instead of proposing a delete action.

## Performance conventions

- Route components are lazy-loaded (`React.lazy` + `Suspense`) in `AppRoutes.tsx` — every new top
  level page must be added the same way, not imported eagerly.
- `columns` (table column defs) are built with `useMemo`, action callbacks with `useCallback`,
  keyed on their real dependencies — this avoids `@tanstack/react-table` re-computing/re-rendering
  the whole grid on every keystroke in an unrelated filter input.
- `DataTable` pagination is server-side/manual (`manualPagination: true`, `pageCount` from the
  API's `PAGINATION.totalPages`) — never fetch a large page and paginate client-side in a new
  feature; follow the `limit`/`page` query params pattern from `RiderListParams`.

## Playbook: adding a new feature end-to-end

Concrete order for standing up a new admin resource (e.g. "promo codes"):

1. Confirm the backend route/response shape first (`backend/src/modules/<domain>` +
   `backend/RideShare-API.postman_collection.json` or Swagger) — `types.ts` and `api.ts` are a
   direct mirror of it, don't guess the shape.
2. `src/features/<domain>/types.ts` — entity interface, `<X>ListParams`, `Create<X>Payload`,
   `Update<X>Payload` (derive Update via `Partial<Pick<X, ...>>`).
3. `src/features/<domain>/api.ts` — `<x>Api` object, one method per endpoint, through `apiClient`.
4. `src/features/<domain>/schema.ts` — zod schema + form-values type + empty defaults, only for
   the fields actually editable in a form.
5. `src/features/<domain>/hooks.ts` — `use<X>` list query + `useCreate<X>`/`useUpdate<X>`
   mutations, each with the invalidate+toast pattern.
6. `src/features/<domain>/components/column.tsx` — `get<X>Columns(actionCallbacks)`.
7. `src/features/<domain>/components/form.tsx` + `dialog.tsx` — dumb form + stateful dialog split.
8. `src/features/<domain>/pages/list.tsx` — `FILTER_SCHEMA` + `useFilterController` +
   `AutoFilters` + `DataTable` + the create dialog, following the `users` example above.
9. Wire it up: add the route + lazy import in `src/routes/AppRoutes.tsx`, add the sidebar entry in
   `src/config/navConfig.ts`.
10. Run `npm run lint` and `npm run dev`, exercise create + filter + toggle-action flows manually —
    there is no automated test suite to fall back on (see below).

## Anti-patterns (don't do these)

- Don't call `API`/axios or `apiClient` from a `pages/*.tsx` or `components/*.tsx` file — go
  through the feature's `hooks.ts`.
- Don't put list filters in `useState` — use `useFilterController` so filters survive
  back/forward navigation and are shareable via URL.
- Don't build a new hand-rolled filter bar (à la the legacy `users/components/filters.tsx`) —
  extend `FilterSchema`/`AutoFilters` instead.
- Don't add a delete endpoint or delete button for a master-data resource.
- Don't fetch a large unfiltered page and paginate/filter it client-side — the API and
  `DataTable` are built for server-side pagination.
- Don't skip the toast+invalidate pair on a new mutation "because it's a minor action" — every
  mutation in this codebase does both.

## Known gaps / tech debt

Documented so they're treated as known trade-offs, not silently "fixed" as a side effect of an
unrelated change:

- No automated test setup (no vitest/jest/RTL in `package.json`) — verification is manual
  (`npm run dev` + click through the flow).
- `tsconfig.app.json` does not enable `"strict"` — don't rely on strict-mode guarantees
  (e.g. no-implicit-any, strict null checks) holding project-wide.
- Mutation error handlers are typed `(err: any)` throughout — consistent with the rest of the
  codebase, not a one-off to clean up in an unrelated PR.
- No error boundary around routed pages — an uncaught exception in a page blanks the app instead
  of showing a fallback.
- Auth "session" is a base64-encoded (not encrypted) localStorage blob — acceptable for an
  internal admin tool's current threat model, but don't extend the same storage helper to hold
  anything more sensitive without revisiting this.
- `src/features/users/components/filters.tsx` is dead code, superseded by `AutoFilters`, kept only
  because nobody has deleted it yet.
