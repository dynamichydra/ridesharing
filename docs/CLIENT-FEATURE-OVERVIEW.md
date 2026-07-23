# RideShare Platform — Feature Overview

A subscription-based ride-hailing platform. Drivers pay a recurring membership fee to use
the platform instead of paying a commission on every ride, riders can optionally hold their
own membership for perks, and every ride is priced automatically using live traffic, time-of-
day, and zone-based rules.

The platform has three parts:

- **Rider mobile app** — where customers book and pay for rides
- **Admin portal** — the back-office console the operations team uses to run the business
- **Core platform** — the engine behind the scenes that matches drivers, calculates fares,
  tracks trips, and processes payments

See [`diagrams/client-feature-map.mermaid`](diagrams/client-feature-map.mermaid) for a visual
map of everything described below.

---

## 1. Rider Experience

- **Account & sign-in** — phone-number sign-up with one-time-password verification, plus
  profile management (name, email, photo, preferred language).
- **Book a ride** — enter pickup and drop-off, see an upfront fare estimate for every
  available vehicle category (bike, auto, cab, etc.) before confirming.
- **Automatic driver matching** — the platform searches for the nearest available, highest-
  rated driver, automatically widening the search area if no one is found nearby right away.
- **Live tracking** — see the assigned driver's live location and estimated arrival time
  while they approach, and live trip progress once the ride is underway.
- **Flexible payment** — pay online (card/UPI/wallet via payment gateway) or in cash,
  whichever the local market supports.
- **In-app wallet** — a prepaid balance riders can use toward rides.
- **Ride history & receipts** — a full history of past trips with downloadable invoices.
- **Rider membership plans** — optional subscription plans offering perks/benefits.
- **Ratings & reviews** — rate the driver and leave a review after each trip.
- **Notifications** — status updates for ride requests, driver assignment, arrival, and
  completion.
- **Cancel a ride** — cancel with a reason at any point before the trip starts.

## 2. Driver Experience

- **Guided onboarding** — a step-by-step registration flow that walks new drivers through
  submitting personal details, vehicle information, required identity/license documents, and
  accepting the latest terms & privacy policy — customizable per country/city/vehicle type by
  the operations team, and available in multiple languages.
- **Document verification** — drivers upload identity and vehicle documents; the operations
  team reviews and approves or rejects each one, with drivers notified either way.
- **Vehicle management** — drivers register their vehicle's details (type, make, model,
  year, plate number).
- **Go online / offline** — drivers toggle their availability whenever they want to work;
  going online is only possible once their account is approved and their membership is active.
- **Ride offers** — drivers receive ride requests from nearby riders and can accept or
  decline each one.
- **Earnings & subscription** — drivers pay a subscription (daily/weekly/monthly/lifetime
  options) instead of a per-ride commission, keeping 100% of every fare they collect.
- **In-app wallet** — a balance drivers can view, with the operations team able to credit or
  debit it (bonuses, penalties, refunds, etc.).
- **Cash collection** — drivers can mark a cash ride as collected once the rider pays them
  directly.
- **Referral tracking** — drivers can refer other drivers to the platform.
- **Multi-device sign-in control** — drivers can see and revoke access from devices they've
  previously logged into.

## 3. Fare & Pricing Engine

- **Upfront, transparent pricing** — every ride shows its estimated fare before booking,
  built from a base fare plus per-distance and per-time rates that the operations team sets
  per vehicle category and per country.
- **Dynamic pricing rules** — the operations team can configure extra pricing rules for:
  - **Time-based** pricing (e.g. late-night or peak-hour rates)
  - **Traffic-based** pricing (adjusts for real-time traffic delay)
  - **Zone-based** pricing (e.g. airport or event-zone surcharges)
  - **Demand-based surge** pricing
- **Tax handling** — country/state-specific tax rates are automatically applied and can be
  shown as included or added on top of the fare.
- **Fair-fare protection** — actual GPS-tracked trip distance is compared against the
  original estimate after every ride; if the difference is unusually large, the trip is
  automatically flagged for a member of the operations team to review and adjust the final
  fare manually — protecting both riders from being overcharged and drivers from being
  underpaid.
- **Historical accuracy** — fare rates are versioned, so past rides can always be
  recalculated using the exact rate that was in effect at the time, which is important for
  billing disputes and audits.

## 4. Smart Driver Matching

- Automatically finds the best available driver for each ride request by balancing three
  factors: how close the driver is, their rating, and how reliably they accept ride offers —
  with the relative importance of each factor configurable by the operations team.
- If no driver is found nearby, the search radius automatically expands in stages so riders
  aren't left waiting indefinitely without a wider search being attempted.
- Riders and drivers who have had a problem with each other can be permanently excluded from
  being matched again.

## 5. Live Ride Tracking & Safety

- Real-time driver location shown to the rider during approach and throughout the trip.
- Estimated time of arrival and trip progress percentage updated continuously.
- Every ride's full status history (requested → matched → accepted → started → completed /
  cancelled) is permanently recorded for support and dispute resolution.
- GPS data from every trip is checked for quality (e.g. discarding erratic/impossible
  readings) before being used for fare or distance calculations.

## 6. Payments & Memberships

- **Ride payments** — online (card/UPI/wallet) or cash, with digital invoices for every trip.
- **Driver subscriptions** — the core monetization model: drivers choose a membership plan
  (with optional free trial) and pay to keep driving; the operations team can define as many
  plans as needed per country, with automatic expiry and renewal reminders.
- **Rider memberships** — optional paid plans offering riders extra perks or benefits.
- **Wallets** — every rider and driver has an in-app balance; the operations team can view
  balances, full transaction history, and make manual adjustments (refunds, bonuses,
  penalties) with a reason recorded for every change.
- Supports multiple payment providers so the right one can be used per country/currency.

## 7. Multi-Country & Multi-Language Support

- The platform can operate in multiple countries simultaneously, each with its own currency,
  timezone, tax rules, and fare rates.
- Content shown to drivers (onboarding questions, document requirements, legal documents) can
  be scoped differently per country, per city, or per vehicle type.
- Any admin-configurable text can be translated into multiple languages.

## 8. Admin Portal — Operations & Back-Office Tools

The operations team gets a dedicated web console covering:

- **Dashboard** — a live snapshot of active riders, online drivers, pending driver
  approvals, active subscriptions, and ride volume trends.
- **Rider management** — search, filter, view full profiles (wallet, membership, ride
  history), create accounts, and block/unblock riders individually or in bulk.
- **Driver approval workflow** — review new driver applications, verify submitted documents,
  approve or reject applications (with the driver notified automatically), request additional
  documents if something's missing, and block/unblock drivers.
- **Ride management** — search and inspect any ride's full detail, status timeline, and the
  list of drivers who were offered it; cancel a ride on a rider's or driver's behalf with a
  reason.
- **Payment records** — a complete, filterable ledger of every ride payment with invoice
  download.
- **Vehicle categories & pricing** — manage the list of vehicle types offered and set/update
  their fare rates per country.
- **Zones & geofencing** — draw operational zones on a map (e.g. airport, restricted areas,
  surge zones) used by the pricing engine.
- **Countries / states / cities** — manage the geographic markets the platform operates in.
- **Fare rules** — create and manage time/traffic/zone/demand-based pricing rules.
- **Subscription plan management** — create and manage both driver and rider membership
  plans.
- **Wallet administration** — view all wallets and make manual balance adjustments.
- **Onboarding configuration** — customize the driver sign-up questionnaire, required
  documents, and legal documents/terms per country.
- **Audit log** — a permanent, searchable record of every significant action taken in the
  system (approvals, rejections, blocks, rule changes, etc.) for accountability and
  compliance.
- **Role-based access** — a standard admin sees day-to-day operational tools (riders,
  drivers, rides, payments); a super-admin additionally controls pricing, zones, plans,
  wallets, and platform configuration.

## 9. Reliability & Trust

- Every admin action is logged for accountability.
- Master records (countries, accounts, subscriptions, etc.) are never permanently deleted —
  only disabled/blocked — so historical data and audit trails are always preserved.
- Automated fare-deviation detection protects both riders and drivers from GPS/billing
  errors.
- Document verification and legal-acceptance tracking keep the driver base compliant with
  local regulations.
