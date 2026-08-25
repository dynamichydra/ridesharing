# Production Rideshare Platform — Compact Master Specification

> **Goal:** Build a production-grade, Uber-class rideshare platform with Node.js/TypeScript, PostgreSQL + PostGIS, Redis, WebSockets, background workers, a versioned fare engine, dispatch/matching, and a provider-agnostic financial system.
>
> **Principle:** Start as a modular monolith with strong domain boundaries. Extract services only when scale/operational needs justify it.

---

## 1. Recommended Technology Architecture

```text
Rider App ───────┐
Driver App ──────┼── API Gateway / Node.js Backend
Admin Portal ────┤
Business Portal ─┘
                       │
          ┌────────────┼─────────────────────┐
          │            │                     │
       REST/API     WebSocket            Webhooks
          │            │                     │
          └────────────┼─────────────────────┘
                       │
 ┌─────────────────────┼─────────────────────────────────────────┐
 │                     DOMAIN MODULES                            │
 │                                                               │
 │ Identity │ Rider │ Driver │ Vehicle │ Ride │ Dispatch         │
 │ Geo      │ Pricing │ Promotions │ Payment │ Ledger            │
 │ Wallet   │ Payout │ Subscription │ Corporate │ Safety         │
 │ Support  │ Notification │ Incentives │ Ratings │ Compliance   │
 └─────────────────────┼─────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
 PostgreSQL/PostGIS   Redis       Queue/Workers
 source of truth      realtime    BullMQ/Redis Streams
        │              │              │
        └──────────────┼──────────────┘
                       │
              External Providers
      Maps / Routing / PSP / SMS / Email / KYC
```

### Core infrastructure

- **Node.js + TypeScript**
- **PostgreSQL** as authoritative transactional database
- **PostGIS** for service boundaries, zones, airports and geospatial rules
- **Redis** for driver location, availability, locks, cache, rate limiting and short-lived dispatch state
- **BullMQ/Redis Streams** for asynchronous jobs
- **WebSocket/Socket.IO** for trip/driver realtime updates
- **Object storage** for KYC documents, vehicle documents, incident evidence and invoices
- **Routing abstraction**: OSRM/Google/Mapbox/etc.
- **PSP abstraction**: Razorpay/Cashfree/Stripe/etc.
- **Outbox pattern** for reliable domain events
- **Idempotency keys** for all externally retried financial/ride commands

---

# 2. Domain Map

```text
IDENTITY
 ├─ users
 ├─ roles / permissions
 ├─ sessions / devices
 └─ verification

RIDER
 ├─ profile
 ├─ saved places
 ├─ preferences
 ├─ payment methods
 ├─ wallet / credits
 ├─ subscriptions
 └─ ride history

DRIVER
 ├─ profile / onboarding
 ├─ KYC / documents
 ├─ vehicles
 ├─ availability
 ├─ location
 ├─ earnings
 ├─ incentives
 ├─ payout accounts
 └─ subscriptions

GEO
 ├─ countries
 ├─ states/regions
 ├─ cities
 ├─ service areas
 ├─ pricing zones
 ├─ airports / terminals
 ├─ pickup points
 └─ geofences

RIDE
 ├─ quote
 ├─ ride
 ├─ stops
 ├─ trip
 ├─ route
 ├─ tracking
 ├─ cancellation
 └─ ratings

DISPATCH
 ├─ candidate discovery
 ├─ eligibility
 ├─ ETA
 ├─ scoring
 ├─ dispatch waves
 ├─ offers
 ├─ reservations
 └─ queues

PRICING
 ├─ service pricing
 ├─ city pricing
 ├─ zone pricing
 ├─ time rules
 ├─ surge
 ├─ fees
 ├─ tax
 ├─ promotions
 └─ fare snapshots

FINANCE
 ├─ payments
 ├─ PSPs
 ├─ ledger
 ├─ wallets
 ├─ refunds
 ├─ chargebacks
 ├─ driver earnings
 ├─ payouts
 ├─ subscriptions
 ├─ corporate billing
 └─ reconciliation

SAFETY / TRUST
 ├─ SOS
 ├─ emergency contacts
 ├─ trip sharing
 ├─ PIN verification
 ├─ RideCheck
 ├─ audio/video evidence
 ├─ incident management
 ├─ fraud/risk
 └─ screening

OPERATIONS
 ├─ support
 ├─ notifications
 ├─ admin
 ├─ audit
 ├─ analytics
 ├─ feature flags
 └─ configuration
```

---

# 3. Service Area / City Availability

## Rule

A rider can create a ride only when the pickup location belongs to an **ACTIVE service area**.

Do not trust the city name returned by a map provider.

```text
pickup lat/lng
    ↓
Geo Resolver
    ↓
ACTIVE service area?
    ├─ NO  → RIDE_NOT_AVAILABLE
    └─ YES → continue
```

## Geography

```text
country
  └─ state/region
      └─ city
          ├─ service_area
          ├─ pricing_zone
          ├─ airport
          │   └─ terminal
          │       └─ pickup/dropoff point
          └─ geofence
```

## `cities`

```text
id
country_id
state_id
name
slug
currency
timezone
status: DRAFT | INACTIVE | ACTIVE | SUSPENDED | COMING_SOON
created_at
updated_at
```

## `city_service_areas`

```text
id
city_id
name
boundary: GEOMETRY(POLYGON/MULTIPOLYGON, 4326)
status
priority
created_at
updated_at
```

## City configuration

```text
allow_pickup
allow_dropoff
allow_intercity
allow_scheduled
allow_cash
allow_rental
allow_outstation
allowed_service_types
```

## Geo rules

- Use `ST_Covers`, not only `ST_Contains`, for boundary-inclusive service checks.
- PostGIS stores authoritative polygons.
- Admin draws/imports boundaries through the admin portal.
- Validate polygon geometry before activation.
- Version boundary changes.
- Existing rides keep their resolved city/service-area snapshot.
- Pickup and dropoff may have different policies.
- Support intercity route allowlists.
- Support service-specific boundaries.
- Support temporary closures/geofences.

---

# 4. Geographic Pricing Hierarchy

```text
Country
  → State/Region
    → City
      → Zone
        → Service/Product
          → Pricing Rules
            → Real-time modifiers
```

Zone types:

```text
AIRPORT
BUSINESS
PREMIUM
NORMAL
RESIDENTIAL
EVENT
HOTSPOT
TOLL
SCHOOL
STATION
CUSTOM
```

Each zone supports:

```text
geometry
priority
pricing_profile_id
status
effective_from
effective_to
```

A location may belong to multiple zones. Resolve by explicit priority and rule-composition policy.

---

# 5. Service / Product Catalog

Never hardcode `UberX`, `XL`, etc. into pricing or matching.

```text
service_types
 ├─ ECONOMY
 ├─ PREMIUM
 ├─ XL
 ├─ SUV
 ├─ LUXURY
 ├─ EV
 ├─ BIKE
 ├─ AUTO
 ├─ TAXI
 ├─ RENTAL
 ├─ OUTSTATION
 ├─ INTERCITY
 └─ ACCESSIBLE
```

Each service defines:

```text
capacity
eligible_vehicle_categories
city availability
zone availability
pricing profile
matching policy
cancellation policy
payment methods
feature flags
```

---

# 6. Fare / Pricing Engine

Pricing must be its own domain.

## Pipeline

```text
Fare Request
 ↓
Validate coordinates
 ↓
Resolve country/state/city/zone
 ↓
Resolve service type
 ↓
Resolve pricing version
 ↓
Calculate route
 ↓
Distance + ETA
 ↓
Base fare
 ↓
Distance fare
 ↓
Time fare
 ↓
Waiting estimate
 ↓
Minimum fare
 ↓
Zone/airport fees
 ↓
Time/day rules
 ↓
Traffic modifier
 ↓
Surge/demand modifier
 ↓
Tolls/parking
 ↓
Promotions/credits
 ↓
Subscription benefits
 ↓
Corporate rules
 ↓
Tax
 ↓
Rounding
 ↓
Caps/floors
 ↓
FINAL QUOTE
```

## Fare components

```text
base_fare
minimum_fare
distance_fare
time_fare
waiting_fare
booking_fee
service_fee
airport_fee
pickup_fee
dropoff_fee
terminal_fee
toll
parking
night_surcharge
peak_surcharge
demand/surge
traffic
weather
event
long_distance
rural/remote
highway
congestion
extra_stop
child_seat
special_request
tax
discount
wallet_credit
promo_credit
subscription_discount
corporate_discount
```

## Formula

```text
raw =
  base
+ distance
+ time
+ waiting
+ fees
+ zone charges
+ tolls
+ applicable modifiers

discounts/credits
→ subtotal

tax
→ final
```

Do not blindly multiply every component by surge. Each pricing component must define whether it is surge-applicable.

## Versioning

```text
pricing_profiles
pricing_profile_versions
```

Never edit an active version in place.

Every quote/ride stores:

```text
pricing_profile_id
pricing_version
rule_version
currency
route_snapshot
fare_breakdown
quoted_amount
expires_at
```

This makes disputes and historical recalculation possible.

## Quote

Quotes must be:

- short-lived
- signed/identified
- idempotent
- versioned
- auditable
- linked to routing result
- protected from replay
- explicitly expired

---

# 7. Dynamic Pricing / Surge

Inputs:

```text
active ride requests
available drivers
ETA
acceptance rate
cancellation rate
historical demand
forecast demand
zone
time
events
weather
airport demand
traffic
```

Use Redis/H3/grid cells for realtime metrics.

```text
supply
demand
ratio
 ↓
surge policy
 ↓
multiplier
```

Features:

- minimum/maximum multiplier
- zone-specific surge
- service-specific surge
- time windows
- event surge
- airport surge
- cooldown/hysteresis
- gradual ramp-up/down
- manual override
- admin kill switch
- audit trail
- simulation mode
- A/B testing

---

# 8. Driver Platform

## Onboarding

```text
registration
phone/email verification
profile
photo
DOB
address
emergency contact
terms/agreement
KYC
identity verification
background screening where legal
tax information
documents
```

## Documents

Examples:

```text
driving_license
government_id
vehicle_registration
insurance
permit
commercial_license
background_check
vehicle_inspection
tax_documents
```

Document states:

```text
PENDING
VERIFIED
REJECTED
EXPIRED
EXPIRING_SOON
```

Track issue/expiry date, verification actor, rejection reason and document version.

## Driver state

Do not use only `is_online`.

```text
OFFLINE
ONLINE
AVAILABLE
SEARCHING
RESERVED
OFFERED
ACCEPTED
ASSIGNED
ARRIVING
WAITING
TRIP_STARTED
TRIP_COMPLETED
ON_BREAK
SUSPENDED
BLOCKED
EMERGENCY
MAINTENANCE
```

## Driver eligibility

Check:

```text
account active
KYC valid
documents valid
vehicle active
service eligibility
city/service-area eligibility
location fresh
GPS quality
current ride
reservation conflict
fraud/risk status
subscription eligibility
```

---

# 9. Vehicle System

Drivers may have multiple vehicles.

Fields:

```text
driver_id
make
model
year
color
registration_number
VIN
vehicle_type
vehicle_category
seat_capacity
fuel_type
EV/hybrid
AC
accessibility
photos
documents
status
```

Vehicle states:

```text
PENDING
ACTIVE
INACTIVE
SUSPENDED
REJECTED
EXPIRED
```

Vehicle eligibility can map one vehicle to multiple services.

---

# 10. Driver Location System

## Redis is realtime; PostgreSQL is authoritative.

Store in Redis:

```text
driver location
heading
speed
accuracy
last_location_at
availability
service types
region
current ride
```

Use Redis GEO:

```text
geo:drivers:available:{region}
```

GPS validation:

- coordinate bounds
- timestamp freshness
- accuracy
- future timestamps
- impossible speed
- teleportation/jump detection
- spoofing confidence
- network/device health

Example freshness policy:

```text
0–5 sec     excellent
5–15 sec    good
15–30 sec   acceptable
30–60 sec   degraded
>60 sec     stale
>120 sec    unavailable
```

Make thresholds configurable.

---

# 11. Driver Matching / Dispatch

Matching is a dedicated domain.

## Pipeline

```text
RideRequested
 ↓
Resolve pickup region
 ↓
Geo candidate discovery
 ↓
Hard eligibility filtering
 ↓
Location freshness filtering
 ↓
Vehicle/service filtering
 ↓
Scheduled/reservation conflict check
 ↓
ETA calculation
 ↓
Candidate scoring
 ↓
Ranking
 ↓
Dispatch wave
 ↓
Offer timeout
 ↓
Accept / reject / expire
 ↓
Atomic assignment
```

## Never select by distance alone.

Scoring can consider:

```text
ETA
road distance
pickup accessibility
vehicle fit
service eligibility
driver state
location freshness
acceptance/rejection history
fairness/idle time
scheduled reservation
airport queue position
driver preferences
rider preferences
driver subscription benefit
risk/fraud confidence
```

Do not use protected characteristics or unlawful discriminatory signals.

## Dispatch waves

Example:

```text
Wave 1: best 1–3 drivers
wait
Wave 2: next candidates
expand radius
Wave 3: broader candidates
fallback policy
```

Never blindly broadcast every ride to every driver.

## Atomic assignment

Two drivers must never win the same ride.

Use DB transaction + row lock/conditional update/idempotency.

---

# 12. Matching Production Rules

- Redis = realtime location/availability.
- PostgreSQL = authoritative ride/driver state.
- Never trust stale GPS.
- Never use distance alone.
- Never call routing providers inside long DB transactions.
- Every dispatch command is idempotent.
- Dispatch in waves.
- Matching policy is versioned.
- Record why each candidate was included/excluded.
- Keep matching separate from pricing.
- Have reconciliation jobs.
- Build failure handling for Redis, routing, queue and WebSocket failures.
- Use feature flags and kill switches for algorithm changes.

---

# 13. Ride Lifecycle

```text
DRAFT
QUOTE_CREATED
REQUESTED
SEARCHING
DRIVER_OFFERED
DRIVER_ASSIGNED
DRIVER_EN_ROUTE
DRIVER_ARRIVED
WAITING
TRIP_STARTED
TRIP_PAUSED
STOP_ADDED
TRIP_COMPLETED
FARE_FINALIZED
PAYMENT_PENDING
PAYMENT_CAPTURED
SETTLED
CANCELLED
NO_DRIVER_FOUND
EXPIRED
DISPUTED
```

Do not allow arbitrary state transitions. Use a transition policy.

---

# 14. Ride Types / Missing Uber-Class Products

Design the ride engine to support:

### Standard
- Economy
- Premium
- XL/SUV
- Luxury
- EV
- Bike/Auto where legal

### Special
- Accessible/wheelchair service
- Pet-friendly
- Child-seat option
- Extra luggage
- Women-preference matching where legally appropriate
- Quiet/preference rides
- Multiple stops
- Round trips

### Scheduled
- Reserve/scheduled rides
- Driver reservation
- reminder notifications
- assignment window
- backup rematching
- no-show policy
- scheduled fare rules

### Hourly / Rental
- vehicle + driver by time
- package duration
- included distance
- overtime
- waiting

### Intercity / Outstation
- one-way
- round trip
- state/country restrictions
- tolls
- permits
- driver return rules

### Shared / Pool
- compatible route matching
- seat capacity
- pickup/dropoff sequencing
- detour limit
- per-seat pricing
- privacy/safety policy

### Business
- employee rides
- guest rides
- hotel/customer rides
- vouchers
- central booking
- recurring rides
- cost centers
- approvals
- budgets
- monthly invoices

Uber's current business offering includes centralized booking, scheduled/recurring rides, guest rides without requiring the rider to have the app, trip tracking, reporting, vouchers and configurable spending controls. Implement these as first-class capabilities. citeturn0search3turn0search6

---

# 15. Rider Platform

## Account

```text
registration
login
phone verification
email verification
profile
photo
saved places
home/work/favorites
preferences
accessibility
communication preferences
devices
sessions
account deletion
```

## Rider preferences

```text
quiet
temperature
pet
wheelchair
child seat
extra luggage
preferred vehicle
preferred payment
accessibility
language
```

## Ride creation

```text
pickup
dropoff
stops[]
service_type
scheduled_at
rider_count
preferences
payment_method
promo
corporate_profile
```

---

# 16. Scheduled Rides

State:

```text
SCHEDULED
SEARCHING
DRIVER_RESERVED
DRIVER_ASSIGNED
DRIVER_ARRIVING
STARTED
COMPLETED
CANCELLED
EXPIRED
```

Support:

- schedule/reschedule
- reminders
- early driver reservation
- driver cancellation/reassignment
- backup driver
- scheduled pricing
- no-show
- grace period
- recurring schedules
- airport scheduled pickups

---

# 17. Multi-Stop / Shared Trips

Support:

```text
pickup
stop 1
stop 2
...
dropoff
```

Each leg stores:

```text
ETA
distance
arrival/departure
fare allocation
```

Shared trips additionally require:

```text
seat inventory
candidate compatibility
detour threshold
pickup order
dropoff order
privacy rules
```

---

# 18. Rider Wallet / Credits

Use a ledger-based design.

Separate concepts where required:

```text
cash/prepaid balance
promo balance
refund credit
gift credit
corporate credit
loyalty credit
```

Wallet transaction types:

```text
TOPUP
RIDE_PAYMENT
REFUND
PROMO_CREDIT
CREDIT
DEBIT
ADJUSTMENT
EXPIRATION
REVERSAL
```

Never treat a mutable `balance` column as the financial source of truth.

---

# 19. Promotions

Support:

```text
percentage
fixed discount
max discount
minimum fare
first ride
new rider
city
zone
airport route
time window
service type
payment method
subscription
corporate
referral
campaign
usage limit
per-user limit
expiry
```

Entities:

```text
promo_campaign
promo_code
promo_rule
promo_redemption
promo_credit
promo_credit_transaction
```

---

# 20. Subscriptions

Generic subscription engine for riders and drivers.

Examples:

```text
RIDE_PASS
PREMIUM
MONTHLY_PASS
DRIVER_BASIC
DRIVER_PRO
DRIVER_PREMIUM
```

Benefits can include:

```text
discounted rides
free cancellation
reduced booking fee
priority support
priority matching
ride credits
airport benefits
reduced driver commission
lower payout fee
instant payout
analytics
incentive boosts
```

States:

```text
TRIALING
ACTIVE
PAST_DUE
PAUSED
CANCELLED
EXPIRED
PAYMENT_FAILED
```

---

# 21. Referral System

Rider referral:

```text
invite
signup
qualification
first ride
reward
```

Driver referral:

```text
invite driver
onboarding
KYC approval
minimum rides
reward
```

Must include:

- fraud checks
- self-referral detection
- device/IP/account linkage
- reward caps
- expiration
- reversal

---

# 22. Ratings / Feedback

Two-way ratings:

```text
rider → driver
driver → rider
```

Store every rating event, not only the aggregate.

Support:

```text
rating
comment
compliment
reason tags
safety report
```

Maintain aggregate summaries for fast reads.

---

# 23. Payment Architecture

## Principle

> PSPs move money; the ledger records economic ownership.

```text
Payment API
 ↓
Payment Orchestrator
 ↓
PSP Router
 ├─ Razorpay
 ├─ Cashfree
 ├─ Stripe
 ├─ Adyen/local PSP
 └─ other providers
 ↓
Payment
 ↓
Financial Transaction
 ↓
Double-entry Ledger
 ↓
Driver Payable / Revenue / Tax
 ↓
Payout
```

The app should not care which PSP processed the transaction.

## Payment modules

```text
payments
payment_providers
payment_methods
payment_intents
payment_attempts
payment_allocations
webhooks
refunds
reversals
chargebacks
disputes
ledger_accounts
ledger_transactions
ledger_entries
reconciliation
settlement
```

---

# 24. Double-Entry Ledger

Use:

```text
ledger_accounts
ledger_transactions
ledger_entries
```

Account types:

```text
ASSET
LIABILITY
EQUITY
REVENUE
EXPENSE
CLEARING
```

Subaccounts:

```text
RIDER_RECEIVABLE
DRIVER_PAYABLE
PLATFORM_REVENUE
PROMO_LIABILITY
WALLET_LIABILITY
CORPORATE_RECEIVABLE
TAX_PAYABLE
PSP_CLEARING
BANK_CLEARING
CASH_CLEARING
DRIVER_INCENTIVE_EXPENSE
PAYMENT_PROCESSING_EXPENSE
```

All money events eventually become balanced ledger entries.

---

# 25. Split Tender

Support:

```text
wallet ₹100
promo  ₹50
card   ₹350
ride   ₹500
```

Use:

```text
payment_sources
payment_allocations
```

No core ledger redesign is required for split payments.

---

# 26. Driver Earnings / Payouts

Driver earnings:

```text
trip earnings
surge
tips
waiting
cancellation
reservation
incentives
bonuses
referrals
adjustments
```

Deductions:

```text
commission
payment fees
tax/withholding
subscription
adjustments
refunds
chargebacks
cash commission
```

Balances:

```text
PENDING
AVAILABLE
LOCKED
```

Payout accounts:

```text
provider
provider_account_id
account_type
currency
country
status
default
```

Payout states:

```text
REQUESTED
PROCESSING
COMPLETED
FAILED
CANCELLED
REVERSED
```

Schedules:

```text
DAILY
WEEKLY
MANUAL
INSTANT
THRESHOLD
```

---

# 27. Cash Rides

Cash requires separate reconciliation.

Track:

```text
cash_collected
driver_cash
platform_commission
cash_settlement
cash_shortage
cash_overage
cash_adjustment
```

Do not simply mark a ride as "paid".

The financial ledger must explain who owes whom.

---

# 28. Refund / Chargeback / Dispute

Support:

```text
full refund
partial refund
failed refund
refund reversal
chargeback
chargeback evidence
dispute
manual adjustment
fare dispute
cash dispute
```

Every adjustment must be:

- idempotent
- auditable
- linked to the original transaction
- ledger-backed

---

# 29. Corporate / Business Platform

Entities:

```text
corporate_account
corporate_user
corporate_admin
corporate_payment_profile
corporate_policy
corporate_budget
corporate_credit_limit
corporate_invoice
corporate_invoice_item
corporate_voucher
cost_center
expense_code
```

Features:

- employee profiles
- guest rides
- Central-style booking
- no-app guest rides
- one-way/round-trip
- scheduled/recurring rides
- multi-stop
- ride-by-hour
- approved service types
- geographic restrictions
- day/time restrictions
- per-user budgets
- department budgets
- central payment
- monthly invoicing
- expense codes
- reporting
- voucher campaigns
- coordinator dashboard
- API integration
- live trip tracking

---

# 30. Safety / Trust & Security

Safety should be a first-class domain.

Uber currently exposes features including emergency assistance, emergency contacts, Share My Trip, GPS tracking, two-way ratings, anonymous communications, RideCheck, PIN verification and audio recording; its India safety materials also describe SOS integration and safety preferences. Implement these behind country/region feature flags because availability and legal requirements vary. citeturn0search0turn0search2turn0search12

## Rider safety

```text
SOS
emergency contacts
Share My Trip
Safety Center
PIN verification
GPS tracking
RideCheck
route deviation detection
unexpected stop detection
audio recording
incident reporting
24/7 safety escalation
anonymous calling/messaging
seat-belt reminder
trusted contacts
```

## Driver safety

```text
SOS
emergency contacts
trip sharing
PIN
audio recording
video recording where lawful
incident reporting
accident reporting
rider reporting
danger-area alerts
route deviation
safety center
```

## Important

- Encrypt evidence.
- Strict retention policy.
- Access-controlled incident evidence.
- Legal consent/notice for recording.
- Regional safety configuration.
- Immutable safety audit log.

---

# 31. Fraud / Risk

Create a dedicated risk engine.

Signals:

```text
device fingerprint
IP
velocity
payment failures
chargebacks
promo abuse
referral abuse
GPS spoofing
impossible travel
account sharing
multiple accounts
stolen payment instruments
driver/rider collusion
cash manipulation
rating manipulation
fake trips
location manipulation
```

Actions:

```text
ALLOW
CHALLENGE
REVIEW
LIMIT
HOLD
SUSPEND
BLOCK
```

Risk decisions must be explainable/auditable.

---

# 32. Driver/Rider Communication

Support:

```text
in-app chat
masked calling
masked SMS
push notifications
email
SMS
WhatsApp where legally/business appropriate
```

Messages should be associated with:

```text
ride_id
sender
recipient
message_type
delivery_status
read_at
```

Use moderation/reporting controls.

---

# 33. Notifications

Channels:

```text
PUSH
SMS
EMAIL
IN_APP
WEBHOOK
```

Events:

```text
OTP
ride_requested
driver_assigned
driver_arriving
driver_arrived
trip_started
trip_completed
payment_success
payment_failed
refund
scheduled_reminder
document_expiring
payout
incentive
subscription
safety
support
```

Use templates + localization + user preferences.

---

# 34. Support / Customer Service

Entities:

```text
support_ticket
support_message
support_attachment
support_event
support_assignment
support_macro
```

Categories:

```text
ride
payment
refund
driver
rider
vehicle
document
payout
subscription
promo
lost_item
safety
accident
fraud
account
```

Support features:

- ticket lifecycle
- SLA
- priority
- agent assignment
- escalation
- internal notes
- attachment evidence
- refund tools
- fare adjustment tools
- identity verification
- audit trail

---

# 35. Lost & Found

Support:

```text
lost_item_report
found_item
driver confirmation
rider-driver contact relay
handover tracking
return fee
support escalation
```

Never expose private phone numbers.

---

# 36. Accessibility & Inclusion

Support:

```text
wheelchair-accessible vehicles
service animals
pet rides
child seats
visual accessibility
screen-reader-friendly APIs
large text
language preferences
hearing-impaired communication
special assistance notes
```

Do not expose sensitive preference data unnecessarily to drivers.

---

# 37. Airport Operations

Airport is more than a pricing zone.

Entities:

```text
airport
terminal
pickup_zone
dropoff_zone
driver_queue
queue_entry
airport_geofence
```

Features:

```text
airport queue
virtual queue
driver staging
terminal detection
pickup instructions
geofenced arrival
flight-aware scheduled pickup
wait-time rules
airport fees
airport-specific matching
driver queue fairness
```

---

# 38. Driver Incentives

Support:

```text
quest
streak
guaranteed earnings
surge incentive
zone bonus
airport bonus
weekend bonus
hourly bonus
referral
new-driver bonus
retention bonus
```

Entities:

```text
incentive_campaign
incentive_rule
driver_incentive
driver_incentive_progress
driver_incentive_reward
```

Lifecycle:

```text
campaign
 → enrollment
 → progress
 → qualification
 → reward
 → driver payable
 → payout
```

---

# 39. Driver Subscription

Generic subscription engine.

Benefits:

```text
lower commission
priority matching
instant payout
lower payout fees
premium support
analytics
higher incentive eligibility
service access
```

Never embed subscription logic directly into matching/pricing. Resolve benefits as configuration.

---

# 40. Admin Portal

## Geography

- countries
- states
- cities
- service areas
- boundaries
- zones
- airports
- terminals
- geofences

## Pricing

- service pricing
- city profiles
- zone pricing
- time rules
- surge
- fees
- taxes
- promotions
- preview/simulation
- effective dates
- approval
- rollback

## Driver

- onboarding
- KYC
- documents
- vehicles
- suspensions
- payouts
- incentives
- subscriptions
- performance

## Rider

- account
- rides
- payments
- wallet
- refunds
- disputes
- risk
- support

## Operations

- live map
- active rides
- driver map
- dispatch debugger
- queues
- incident dashboard
- system health

## Finance

- payments
- refunds
- ledger
- payouts
- reconciliation
- settlements
- invoices
- tax reports

---

# 41. Pricing Admin Safety

Every pricing change should support:

```text
DRAFT
REVIEW
APPROVED
SCHEDULED
ACTIVE
ROLLED_BACK
EXPIRED
```

Require:

```text
who changed it
what changed
old value
new value
reason
approval
effective time
rollback version
```

Add a pricing simulator:

```text
pickup
dropoff
service
time
rider
promo
subscription
```

→ show complete fare breakdown before publishing.

---

# 42. Domain Events

Use events instead of direct table coupling.

Core ride events:

```text
RideRequested
QuoteCreated
FareCalculated
DispatchRequested
DriverOfferCreated
DriverOfferAccepted
DriverOfferRejected
DriverAssigned
DriverArrived
TripStarted
StopAdded
TripCompleted
FareRecalculated
PaymentAuthorized
PaymentCaptured
PaymentFailed
DriverEarningsCreated
PayoutRequested
PayoutCompleted
RideCancelled
```

Other events:

```text
DriverOnline
DriverOffline
DriverLocationUpdated
DriverDocumentExpired
VehicleActivated
PromotionRedeemed
SubscriptionActivated
WalletCredited
WalletDebited
RefundCreated
ChargebackCreated
SafetyIncidentCreated
SupportTicketCreated
```

Use:

```text
outbox_events
event_id
aggregate_type
aggregate_id
event_type
payload
version
created_at
published_at
```

---

# 43. WebSocket Design

Rooms:

```text
ride:{rideId}
driver:{driverId}
rider:{riderId}
support:{ticketId}
admin:operations
```

Realtime events:

```text
driver_location
ride_state
driver_assigned
driver_arrived
ETA
route_update
fare_update
chat_message
safety_event
```

Never trust WebSocket messages as authoritative state changes. Commands still go through authenticated APIs.

---

# 44. API Design

Example domains:

```text
/auth
/users
/riders
/drivers
/vehicles
/documents
/cities
/service-areas
/zones
/airports
/services
/quotes
/rides
/rides/:id/stops
/rides/:id/cancel
/drivers/location
/dispatch
/pricing
/promotions
/wallet
/payments
/refunds
/payouts
/subscriptions
/incentives
/corporate
/safety
/support
/ratings
/notifications
/admin
```

Use:

- request validation
- authorization
- idempotency
- pagination
- cursor pagination for high-volume lists
- rate limits
- API versioning
- consistent error codes
- correlation IDs

---

# 45. Database Rules

## Money

Use integer minor units:

```text
amount_minor BIGINT
currency CHAR(3)
```

Never use floating point for money.

## Timestamps

Use UTC in storage.

Resolve display/time rules using the city/ride timezone.

## Audit

Sensitive changes require audit records.

## Soft delete

Use only where business/legal requirements require it. Financial records should generally be immutable.

## Indexing

Index:

```text
foreign keys
status
created_at
updated_at
ride_id
driver_id
rider_id
city_id
service_type_id
effective_from/effective_to
idempotency_key
provider_reference
```

Use PostGIS indexes for geometry.

---

# 46. Concurrency / Idempotency

Every important command should have an idempotency strategy.

Examples:

```text
create ride
accept driver offer
assign driver
start trip
complete trip
capture payment
refund
payout
wallet debit
promo redemption
subscription renewal
```

Use:

```text
idempotency_keys
unique constraints
conditional UPDATE
SELECT ... FOR UPDATE
optimistic version columns
```

Never rely on frontend disabling a button.

---

# 47. Reliability

Handle:

```text
Redis down
PostgreSQL failover
routing provider timeout
PSP timeout
webhook duplicate
queue duplicate
worker crash
WebSocket disconnect
driver app offline
rider app offline
stale GPS
duplicate ride request
payment timeout
partial refund
failed payout
```

Use:

```text
timeouts
retries
exponential backoff
dead-letter queues
circuit breakers
fallback providers
outbox
idempotency
reconciliation
health checks
```

---

# 48. Routing Provider Abstraction

```ts
interface RoutingProvider {
  calculateRoute(input: RouteRequest): Promise<RouteResult>;
}
```

Result:

```text
distance_meters
duration_seconds
polyline
legs
tolls
provider
provider_version
```

Possible providers:

```text
OSRM
Google Maps
Mapbox
```

Pricing/matching must not depend on provider-specific APIs.

---

# 49. Reconciliation

Build reconciliation from day one.

## Financial

Compare:

```text
internal payment
PSP transaction
PSP settlement
bank settlement
ledger
driver payout
```

## Dispatch

Compare:

```text
ride state
driver state
dispatch offer state
Redis state
WebSocket state
```

## Jobs

Reconcile:

```text
stuck offers
stuck rides
stale drivers
unprocessed webhooks
unpublished outbox events
failed payouts
unbalanced ledger transactions
```

---

# 50. Observability

Every request/event should have:

```text
request_id
correlation_id
user_id
ride_id
driver_id
payment_id
trace_id
```

Metrics:

```text
ride request rate
quote latency
match latency
assignment success
no-driver rate
offer acceptance rate
driver cancellation
rider cancellation
ETA accuracy
payment success
PSP failure
refund rate
chargeback rate
payout failure
Redis latency
DB latency
queue lag
WebSocket connections
```

Alerts:

```text
no-driver spike
payment failure spike
dispatch latency spike
GPS stale spike
PSP outage
queue backlog
ledger imbalance
reconciliation mismatch
```

---

# 51. Security

Implement:

```text
JWT/session authentication
refresh token rotation
RBAC
ABAC where needed
MFA for admin
device/session management
rate limiting
request signing where required
secret management
encryption at rest
TLS
PII minimization
field-level access control
audit logging
fraud controls
webhook signature validation
file malware scanning
```

Never store raw:

```text
card numbers
CVV
bank credentials
provider secrets
```

Use provider tokens/references.

---

# 52. Privacy / Data Governance

Support:

```text
consent
privacy policy version
data export
data deletion workflow
retention policies
PII masking
location retention
audio/video retention
incident evidence access
legal hold
regional data rules
```

Location/audio/safety evidence needs stricter access and retention controls.

---

# 53. Analytics

Events should feed analytics separately from transactional tables.

Track:

```text
rides
conversion
quote-to-ride
match rate
ETA
driver utilization
supply/demand
surge
cancellations
revenue
commission
driver earnings
promotions
subscriptions
wallet usage
payment success
support
safety
fraud
```

Use an analytics pipeline/data warehouse rather than expensive reporting queries on the ride transaction tables.

---

# 54. Feature Flags

Everything risky should be feature-flagged:

```text
new matching algorithm
new pricing algorithm
surge
new PSP
cash
scheduled rides
shared rides
women preference
audio recording
new vehicle type
new city
new zone
new promotion
```

Support:

```text
global
country
city
zone
service
percentage rollout
user cohort
driver cohort
```

Include kill switches.

---

# 55. ML / Optimization — Later

Do not start with ML.

Once enough data exists, ML can improve:

```text
ETA prediction
driver acceptance prediction
demand forecasting
supply forecasting
fraud detection
cancellation prediction
dispatch scoring
repositioning
surge forecasting
driver incentive optimization
```

Keep ML as a replaceable scoring/risk provider.

---

# 56. Missing Uber-Class Features to Include in the Product Roadmap

## Rider

- Reserve/scheduled rides
- Multi-stop rides
- Shared/pool rides
- Hourly rentals
- Intercity/outstation
- Airport rides and terminal pickup
- Multiple service categories
- EV category
- Accessible rides
- Pet rides
- Child-seat option
- Ride preferences
- Rider-driver chat
- Masked calling
- Share My Trip
- SOS
- PIN verification
- RideCheck
- Audio recording where lawful
- Safety preferences
- Trusted contacts
- Lost & found
- Split payment
- Wallet/credits
- Promotions
- Referral
- Subscription/pass
- Gift credits
- Corporate profile
- Guest rides
- Vouchers
- Receipt/invoice
- Fare dispute
- Scheduled reminders
- Recurring rides
- Accessibility
- Localization
- account/device/session management

## Driver

- Complete onboarding/KYC
- Vehicle management
- Multiple vehicles
- Document expiry
- Online/offline
- Live GPS
- Navigation
- Trip offer/accept/reject
- Scheduled reservations
- Airport queues
- Earnings
- Wallet/ledger
- Payouts
- Instant payout where supported
- Subscription
- Incentives/quests
- Referral
- Ratings
- Rider feedback
- Driver safety
- SOS
- Trip recording where lawful
- Incident reporting
- Accident workflow
- Lost item workflow
- Support
- Tax documents
- Performance analytics
- Destination/area preferences
- break/availability controls

## Platform

- City activation/deactivation
- Polygon service areas
- Geofences
- Pricing zones
- Dynamic pricing
- Airport operations
- Dispatch waves
- ETA
- Fraud/risk
- PSP routing
- Ledger
- Reconciliation
- Corporate billing
- Subscriptions
- Incentives
- Support
- Safety operations
- Admin approvals
- Audit
- Feature flags
- Analytics
- Provider failover
- Disaster recovery

---

# 57. Recommended Core Tables

```text
countries
states
cities
city_service_areas
city_service_configs

service_types
service_categories
vehicle_categories

pricing_profiles
pricing_profile_versions
pricing_service_rules
pricing_zone_rules
pricing_time_rules
pricing_fee_rules
pricing_tax_rules
surge_policies

pricing_zones
airports
airport_terminals
airport_pickup_zones
geofences

users
roles
permissions
user_roles
sessions
devices
verifications

riders
rider_preferences
saved_places
emergency_contacts

drivers
driver_documents
driver_verifications
driver_status_history

vehicles
vehicle_documents
vehicle_service_types

rides
ride_stops
ride_quotes
ride_fare_snapshots
ride_routes
ride_tracking
ride_status_history
ride_cancellations

scheduled_rides
recurring_rides

dispatch_jobs
dispatch_candidates
dispatch_offers
driver_reservations
airport_queue_entries

ratings
rating_reasons
compliments

payment_methods
payment_providers
payment_intents
payment_attempts
payment_allocations
payment_sources
payment_webhooks

ledger_accounts
ledger_transactions
ledger_entries

wallets
wallet_transactions
wallet_balances

promo_campaigns
promo_codes
promo_rules
promo_redemptions
promo_credits
promo_credit_transactions

subscription_plans
subscriptions
subscription_items
subscription_cycles
subscription_payments
subscription_events

driver_earnings
driver_incentive_campaigns
driver_incentive_rules
driver_incentive_progress
driver_incentive_rewards

driver_payout_accounts
payouts
payout_attempts

refunds
chargebacks
disputes

corporate_accounts
corporate_users
corporate_policies
corporate_budgets
corporate_credit_limits
corporate_invoices
corporate_invoice_items
corporate_vouchers
cost_centers

support_tickets
support_messages
support_attachments

safety_incidents
safety_events
safety_evidence
safety_contacts

notifications
notification_templates
notification_deliveries

outbox_events
idempotency_keys
audit_logs
feature_flags
configuration_versions
```

---

# 58. Recommended Backend Module Structure

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── riders/
│   ├── drivers/
│   ├── vehicles/
│   ├── documents/
│   ├── geography/
│   ├── services/
│   ├── pricing/
│   ├── quotes/
│   ├── rides/
│   ├── dispatch/
│   ├── tracking/
│   ├── airports/
│   ├── payments/
│   ├── ledger/
│   ├── wallets/
│   ├── promotions/
│   ├── subscriptions/
│   ├── incentives/
│   ├── payouts/
│   ├── corporate/
│   ├── safety/
│   ├── support/
│   ├── ratings/
│   ├── notifications/
│   ├── risk/
│   └── admin/
│
├── infrastructure/
│   ├── postgres/
│   ├── redis/
│   ├── queue/
│   ├── websocket/
│   ├── storage/
│   └── providers/
│
├── shared/
│   ├── errors/
│   ├── events/
│   ├── idempotency/
│   ├── auth/
│   ├── validation/
│   ├── money/
│   ├── geo/
│   └── observability/
│
└── workers/
    ├── dispatch.worker.ts
    ├── notification.worker.ts
    ├── payment.worker.ts
    ├── payout.worker.ts
    ├── reconciliation.worker.ts
    ├── scheduled-ride.worker.ts
    └── analytics.worker.ts
```

---

# 59. Build Order

## Phase 1 — Foundation

```text
PostgreSQL/PostGIS
Redis
Node.js/TypeScript
auth/RBAC
users
cities
service areas
vehicles
drivers
riders
```

## Phase 2 — Geography

```text
service areas
zones
airports
geofences
geo resolver
```

## Phase 3 — Ride Core

```text
ride state machine
route provider
quotes
fare snapshots
ride lifecycle
tracking
```

## Phase 4 — Driver Matching

```text
driver state
location
Redis GEO
candidate filtering
ETA
scoring
dispatch waves
offers
atomic assignment
```

## Phase 5 — Pricing

```text
pricing profiles
versioning
service pricing
zone pricing
fees
tax
surge
promotions
```

## Phase 6 — Payments

```text
payment intent
PSP adapters
webhooks
ledger
wallet
refund
chargeback
reconciliation
```

## Phase 7 — Driver Finance

```text
earnings
incentives
payout accounts
payouts
scheduled payouts
```

## Phase 8 — Advanced Rider

```text
scheduled
recurring
multi-stop
shared
rental
outstation
airport
subscription
referral
```

## Phase 9 — Business

```text
corporate accounts
guest rides
vouchers
budgets
approval policies
invoices
reporting
```

## Phase 10 — Safety / Risk / Support

```text
SOS
RideCheck
PIN
trip sharing
incident management
fraud
support
lost & found
```

## Phase 11 — Production Hardening

```text
observability
reconciliation
failure recovery
load tests
security tests
financial invariant tests
DR
backups
feature flags
admin debugger
```

## Phase 12 — Optimization

```text
H3
dynamic radius
repositioning
demand forecasting
ML ETA
ML matching
ML fraud
A/B testing
```

---

# 60. Critical Architecture Rules

1. **PostgreSQL is authoritative. Redis is realtime/cache.**
2. **PostGIS owns service-area and zone geometry.**
3. **Pickup service-area eligibility is checked server-side.**
4. **Never trust a frontend city name.**
5. **Pricing, matching and payment are separate domains.**
6. **Never select a driver using distance alone.**
7. **Never trust stale GPS.**
8. **Every important command is idempotent.**
9. **Never allow two drivers to win the same ride.**
10. **Do not call external routing/PSP providers inside long DB transactions.**
11. **All money uses integer minor units + currency.**
12. **Ledger is the financial source of truth.**
13. **Wallet balances are projections, not the accounting source of truth.**
14. **Never modify active pricing versions in place.**
15. **Every ride stores fare/pricing snapshots.**
16. **All dispatch algorithms are versioned and auditable.**
17. **Every sensitive admin action is audited.**
18. **Use outbox for reliable event publication.**
19. **Use retries + idempotency for webhooks.**
20. **Build reconciliation before production, not after a financial incident.**
21. **Use feature flags and kill switches for pricing/matching changes.**
22. **Country/city differences must be configuration, not `if (city === ...)` code.**
23. **Safety and compliance features must be region-aware.**
24. **Do not expose private phone/payment/identity data between rider and driver.**
25. **Do not turn the first version into dozens of microservices; preserve domain boundaries first.**

---

# 61. Final Production Event Flow

```text
Rider selects pickup/dropoff
        ↓
Geo Resolver
        ↓
Service Area + City + Zone
        ↓
Service Eligibility
        ↓
Fare Engine
        ↓
Versioned Quote
        ↓
RideRequested
        ↓
Dispatch
        ↓
Candidate Filtering
        ↓
ETA + Scoring
        ↓
Dispatch Wave
        ↓
Driver Accepts
        ↓
Atomic Driver Assignment
        ↓
Driver En Route
        ↓
Driver Arrived
        ↓
PIN / Safety Checks
        ↓
Trip Started
        ↓
Realtime Tracking
        ↓
Stops / Waiting / Route Changes
        ↓
Trip Completed
        ↓
Final Route + Fare Recalculation
        ↓
Promotion / Wallet / Corporate Allocation
        ↓
Payment Authorization/Capture
        ↓
Ledger Transaction
        ↓
Driver Earnings
        ↓
Payout Availability
        ↓
Rating / Feedback
        ↓
Analytics / Reconciliation
```

---

# 62. Definition of Done for Production

A feature is not production-ready until it has:

```text
database schema
indexes
authorization
validation
state machine
idempotency
audit
events
notifications
failure handling
retry policy
observability
metrics
tests
migration
rollback
admin controls
feature flag
documentation
security review
reconciliation where financial
```

The target architecture is therefore a **configuration-driven, event-oriented, ledger-backed rideshare platform** where adding a city, zone, service type, pricing rule, PSP, promotion, driver program or corporate policy primarily means adding configuration/data rather than rewriting core business logic.
