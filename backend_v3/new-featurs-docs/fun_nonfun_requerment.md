Yes. Since you already have a rideshare platform, the best approach is to treat this as an **end-to-end production readiness audit** rather than checking only the `create ride → accept → complete` flow.

Below is a master checklist you can use to compare your existing implementation. I’ve also included a **copy-paste AI audit prompt** at the end that instructs an AI coding agent to inspect the entire codebase, identify missing functionality, and implement it.

# 1. Complete Ride Lifecycle

The ideal lifecycle is:

```text
RIDER
  │
  ├── Login / Authentication
  │
  ├── Set Pickup
  ├── Set Destination
  ├── Select Ride Type
  ├── Add Stops
  ├── Select Payment Method
  ├── Apply Promo / Credits
  ├── Fare Estimate
  │
  ▼
RIDE REQUEST CREATED
  │
  ├── Validate rider
  ├── Validate payment method
  ├── Validate service area
  ├── Validate vehicle availability
  ├── Calculate fare
  ├── Reserve/authorize payment if required
  ├── Create trip
  └── Publish ride-request event
  │
  ▼
DISPATCH / MATCHING
  │
  ├── Find eligible drivers
  ├── Rank drivers
  ├── Send offers
  ├── Driver accepts
  ├── Lock assignment
  └── Notify rider
  │
  ▼
DRIVER ASSIGNED
  │
  ├── Driver location tracking
  ├── ETA updates
  ├── Driver navigation
  └── Rider tracking
  │
  ▼
DRIVER ARRIVING
  │
  ├── Driver approaches pickup
  ├── Arrival detection
  ├── Notify rider
  └── Waiting timer
  │
  ▼
DRIVER ARRIVED
  │
  ├── Rider verification
  ├── OTP / trip PIN
  ├── Start-trip eligibility
  └── No-show handling
  │
  ▼
TRIP STARTED
  │
  ├── GPS tracking
  ├── Route tracking
  ├── Distance
  ├── Duration
  ├── Stops
  ├── Fare adjustments
  └── Safety monitoring
  │
  ▼
TRIP COMPLETED
  │
  ├── Final fare calculation
  ├── Payment capture
  ├── Promo settlement
  ├── Commission calculation
  ├── Driver earning calculation
  ├── Platform subsidy
  ├── Wallet/ledger entries
  ├── Receipt
  ├── Rating
  └── Settlement
```

---

# 2. HIGH-LEVEL FUNCTIONAL REQUIREMENTS

## A. Rider Account

### Authentication

* Phone OTP
* Email authentication if supported
* OTP expiry
* OTP retry limits
* OTP rate limiting
* Device registration
* Device/session management
* Logout
* Logout all devices
* Token refresh
* Token revocation
* Suspicious login detection
* Account lock
* Account suspension
* Account deletion/deactivation

### Rider profile

* Name
* Phone
* Email
* Profile image
* Country
* Currency
* Language
* Saved locations
* Home
* Work
* Favorite places
* Emergency contacts

### Rider status

```text
ACTIVE
SUSPENDED
BLOCKED
DEACTIVATED
UNDER_REVIEW
```

---

# 3. Ride Creation

Rider should be able to:

* Select pickup
* Select destination
* Search location
* Use current location
* Select saved location
* Choose ride type
* Choose vehicle type
* Ride immediately
* Ride for someone else
* Add passenger information
* Add notes
* Select payment method
* Apply promo
* Use wallet balance
* Use credits
* See estimated fare
* See estimated distance
* See estimated duration
* See ETA
* See surge/dynamic pricing
* See cancellation policy
* Confirm ride

### Important

Your "ride for someone else" functionality should be first-class.

You should distinguish:

```text
booked_by_user
passenger_user
driver
```

rather than assuming the booking user is always the passenger.

---

# 4. Service Area Validation

Before creating the ride:

* Pickup inside supported city
* Destination inside supported city
* Pickup allowed zone
* Destination allowed zone
* Airport rules
* Busy zone rules
* Restricted zone rules
* City operating hours
* Vehicle availability
* Ride type availability
* Country availability
* Currency availability

Since your platform uses PostgreSQL without PostGIS, your application should still have a robust **zone/boundary validation service** rather than simply trusting coordinates.

---

# 5. Fare Engine

This is one of the most important modules.

It should support:

### Base pricing

```text
base_fare
minimum_fare
booking_fee
service_fee
distance_rate
time_rate
```

### Dynamic pricing

* Surge
* Peak hours
* Night pricing
* Traffic pricing
* Airport pricing
* Busy zone pricing
* Event pricing
* City-specific pricing
* Vehicle-specific pricing

### Fare formula

Conceptually:

```text
gross_fare
=
base_fare
+ distance_charge
+ time_charge
+ booking_fee
+ service_fee
+ waiting_charge
+ tolls
+ airport_fee
+ dynamic_pricing
+ other_charges
```

Then:

```text
gross_fare
- rider_discount
- rider_wallet_credit
- platform_promo
= rider_payable
```

But **driver earnings should not automatically be based on rider payable**.

For example:

```text
Gross fare       = ₹500
Promo            = ₹100
Rider pays       = ₹400

Driver earnings  = based on agreed driver earning rules
Platform subsidy = ₹100
```

This distinction is extremely important for your platform.

---

# 6. Promo Engine

Support:

* Percentage promo
* Fixed amount promo
* Maximum discount
* Minimum fare
* First ride
* New rider
* Existing rider
* Driver-specific promo
* City-specific promo
* Vehicle-specific promo
* Time-based promo
* Campaign promo
* Expiry
* Usage limits
* Per-user limits
* Global limits
* Promo stacking rules
* Eligibility rules

### Promo settlement

Track separately:

```text
gross_fare
rider_discount
rider_payable
driver_gross_earning
driver_commission
platform_subsidy
platform_revenue
```

Never simply overwrite the original fare with the discounted fare.

---

# 7. Wallet

You already want rider and driver wallets, so this should be treated as a financial subsystem.

### Rider wallet

* Add money
* Payment gateway top-up
* Wallet balance
* Promotional credit
* Refund credit
* Wallet payment
* Wallet transaction history
* Wallet reversal
* Wallet expiration rules
* Wallet limits

### Driver wallet

* Ride earnings
* Bonuses
* Incentives
* Adjustments
* Penalties
* Subscription charges
* Commission
* Withdrawals
* Refund adjustments

---

# 8. Financial Ledger

This is more important than a simple `wallet_balance` column.

Use an immutable transaction/ledger model.

Example:

```text
Ledger
 ├── rider wallet debit
 ├── rider payment
 ├── promo subsidy
 ├── platform commission
 ├── driver earning
 ├── driver wallet credit
 ├── refund
 ├── chargeback
 ├── adjustment
 └── payout
```

Every financial event should have:

```text
transaction_id
reference_type
reference_id
account_id
amount
currency
direction
transaction_type
status
created_at
```

Prefer:

```text
ledger entries
+
derived/current balance
```

rather than trusting one mutable balance field.

---

# 9. Payment System

Your payment architecture should support multiple providers.

Example:

```text
Payment Service
      │
      ├── Razorpay
      ├── Stripe
      ├── Other PSP
      ├── Wallet
      ├── Cash
      └── Corporate billing
```

### Payment methods

* Card
* UPI
* Wallet
* Cash
* Saved payment method
* Payment gateway token
* Apple/Google payment methods where applicable

---

# 10. Payment Lifecycle

For card/online payment:

```text
PAYMENT_PENDING
      ↓
PAYMENT_AUTHORIZED
      ↓
RIDE COMPLETED
      ↓
PAYMENT_CAPTURED
      ↓
SETTLEMENT_PENDING
      ↓
SETTLED
```

Possible failures:

```text
PAYMENT_FAILED
PAYMENT_CANCELLED
PAYMENT_EXPIRED
PAYMENT_REVERSED
REFUND_PENDING
REFUNDED
PARTIALLY_REFUNDED
CHARGEBACK
```

---

# 11. Payment Idempotency

Every payment operation should be idempotent.

Example:

```text
payment:create
payment:authorize
payment:capture
payment:refund
payment:payout
```

should have an idempotency key.

Otherwise:

```text
network timeout
→ client retries
→ server receives request twice
→ customer gets charged twice
```

This is a critical production requirement.

---

# 12. Webhook Processing

Every PSP webhook should support:

* Signature verification
* Duplicate detection
* Idempotency
* Event persistence
* Retry
* Dead-letter handling
* Out-of-order events
* Unknown event handling
* Audit trail

Example:

```text
payment.captured
payment.failed
payment.refunded
payment.disputed
payout.processed
payout.failed
```

Never blindly trust the frontend's payment success response.

---

# 13. Driver Matching

Matching service should consider:

* Driver online status
* Driver availability
* Driver subscription entitlement
* Driver vehicle type
* Driver documents
* Driver service area
* Driver location
* Driver distance
* Driver ETA
* Driver rating
* Driver acceptance behavior
* Driver cancellation behavior
* Driver current trip
* Driver capacity
* Driver eligibility
* Airport rules
* Zone rules

---

# 14. Driver Dispatch

Example:

```text
Ride Created
      ↓
Find Candidates
      ↓
Rank Candidates
      ↓
Send Offer
      ↓
Offer Timeout
      ↓
Next Driver
      ↓
Accept
      ↓
Atomic Assignment
```

Must prevent:

```text
Driver A accepts
Driver B accepts
```

both getting the same trip.

Use an atomic assignment mechanism.

---

# 15. Trip State Machine

You should have a strict state machine.

Example:

```text
SEARCHING
    ↓
DRIVER_ASSIGNED
    ↓
DRIVER_ARRIVING
    ↓
DRIVER_ARRIVED
    ↓
STARTED
    ↓
COMPLETED
```

Alternative terminal states:

```text
CANCELLED
NO_DRIVER_FOUND
PAYMENT_FAILED
EXPIRED
```

Invalid transitions should be rejected.

Example:

```text
COMPLETED → STARTED
```

must never be allowed.

---

# 16. Trip Start

Before starting:

* Driver assigned
* Driver physically near pickup
* Passenger present
* Trip PIN/OTP verification
* Vehicle information displayed
* Safety information
* Start timestamp
* Start location
* Initial odometer/GPS if supported

Then:

```text
DRIVER_ARRIVED
      ↓
OTP verified
      ↓
TRIP_STARTED
```

---

# 17. Trip Tracking

During ride:

* Driver GPS
* Rider live location
* Trip location history
* Distance tracking
* Duration tracking
* ETA
* Route
* Route deviation
* Stop handling
* Waiting time
* Connection recovery
* Offline location buffering
* Socket reconnect
* Duplicate location handling

With your architecture:

```text
Driver App
   ↓
Socket.IO
   ↓
Ride Service
   ↓
Redis
   ↓
Kafka
   ↓
Location/Event consumers
```

---

# 18. Waiting Time

Support:

```text
Driver arrived
       ↓
Grace period
       ↓
Waiting starts
       ↓
Waiting fee
```

Must define:

* Grace period
* Waiting rate
* Maximum waiting
* Driver cancellation eligibility
* Rider notification

---

# 19. Trip Completion

On completion:

* Validate trip state
* Validate driver
* Validate location
* Capture end location
* Calculate distance
* Calculate duration
* Calculate waiting
* Calculate stops
* Calculate tolls
* Calculate final fare
* Apply pricing rules
* Apply promo
* Calculate rider payable
* Calculate driver earnings
* Calculate commission
* Calculate platform subsidy
* Process payment
* Create ledger entries
* Generate receipt
* Complete trip
* Notify rider
* Notify driver

---

# 20. Final Financial Calculation

A good final settlement model should conceptually contain:

```text
gross_fare
rider_discount
wallet_credit
rider_payable
payment_fee
tax
driver_gross_earning
driver_commission
driver_net_earning
platform_subsidy
platform_revenue
```

Example:

```text
Gross Fare             ₹500
Promo                  ₹100
Rider Payable          ₹400

Driver Gross Earning   ₹350
Platform Commission    ₹150
Platform Subsidy       ₹100
```

The exact formulas depend on your commercial model, but the financial components should be explicitly represented.

---

# 21. Cash Ride

Cash rides require special handling.

Example:

```text
Gross fare = ₹500
Promo = ₹100
Rider pays driver = ₹400
```

But suppose:

```text
Driver entitlement = ₹350
Platform commission = ₹150
```

Then the platform still needs to account for the difference correctly.

You need:

```text
cash collection
platform receivable
driver payable
promo subsidy
commission
settlement
```

Otherwise your ledger will eventually become inconsistent.

---

# 22. Cancellation System

Cancellation should be available to both sides.

### Rider cancellation

* Before matching
* After driver assigned
* Driver arriving
* Driver arrived
* After waiting
* During trip if applicable

### Driver cancellation

* Vehicle issue
* Rider no-show
* Unsafe location
* Rider unavailable
* Emergency
* Other reason

Each cancellation should have:

```text
cancelled_by
reason
timestamp
trip_state
cancellation_fee
who_is_charged
```

---

# 23. No Driver Found

Flow:

```text
Ride requested
 ↓
Dispatch
 ↓
No drivers
 ↓
Retry strategy
 ↓
Expand search
 ↓
No driver
 ↓
NO_DRIVER_FOUND
```

If payment was authorized:

```text
authorization
→ release/void
```

---

# 24. Rider No-Show

Flow:

```text
Driver arrived
 ↓
Waiting timer
 ↓
Grace period
 ↓
Rider absent
 ↓
Driver cancellation
 ↓
No-show fee
```

---

# 25. Refund System

Support:

* Full refund
* Partial refund
* Wallet refund
* Original payment refund
* Promo refund rules
* Cancellation refund
* Failed ride refund
* Duplicate charge refund
* Admin adjustment
* Dispute refund

Never simply modify the original payment record.

Create a refund transaction.

---

# 26. Rating System

After completion:

### Rider rates driver

```text
1–5 stars
```

### Driver rates rider

```text
1–5 stars
```

Support:

* Rating
* Comment
* Rating categories
* Bad behavior reports
* Rating aggregation
* Rating exclusions
* Admin adjustment

---

# 27. Safety

Production rideshare absolutely needs:

* Emergency/SOS
* Emergency contacts
* Share trip
* Driver identity
* Vehicle identity
* License plate
* Safety center
* Trip sharing
* Report driver
* Report rider
* Incident reporting
* Lost & found
* Route deviation detection
* Suspicious behavior detection
* Support escalation

---

# 28. Notifications

Notification service should support:

```text
Push
SMS
Email
In-app
```

Events:

* Ride created
* Driver assigned
* Driver arriving
* Driver arrived
* Trip started
* Trip completed
* Payment successful
* Payment failed
* Refund
* Cancellation
* Promo
* Subscription
* Wallet
* Driver payout
* Safety event

---

# 29. Real-Time System

Socket events should cover:

### Rider

```text
ride:created
ride:searching
driver:assigned
driver:location
driver:arrived
ride:started
ride:updated
ride:completed
ride:cancelled
payment:updated
```

### Driver

```text
ride:offer
ride:cancelled
ride:updated
navigation:update
```

Need:

* Authentication
* Namespace authorization
* Room authorization
* Reconnect
* Heartbeat
* Duplicate connection handling
* Redis adapter if horizontally scaled
* Connection cleanup
* Event idempotency

---

# 30. Driver Subscription System

Since your platform supports subscription + non-subscription rides:

Driver entitlement should be calculated separately from ride pricing.

Example:

```text
Driver
   ↓
Subscription
   ↓
ACTIVE
   ↓
Eligible for subscription benefits
```

Plans:

```text
MONTHLY
YEARLY
HALF_MONTHLY
```

Potential benefits:

* Reduced commission
* Zero commission
* More ride access
* Priority dispatch
* Premium zones
* Higher earnings
* Special incentives

But don't hardcode these benefits.

Use:

```text
subscription_plan
subscription
subscription_entitlement
```

Then:

```text
Driver
 ↓
Entitlement Service
 ↓
Can accept ride?
 ↓
Commission rule?
 ↓
Dispatch priority?
```

---

# 31. Subscription Lifecycle

```text
TRIAL
ACTIVE
PAST_DUE
GRACE_PERIOD
EXPIRED
CANCELLED
SUSPENDED
```

Need:

* Start
* Renew
* Upgrade
* Downgrade
* Cancel
* Pause if supported
* Payment failure
* Retry
* Grace period
* Expiry
* Invoice
* Receipt
* Refund

---

# 32. Driver Eligibility

Before dispatch:

```text
Driver account active?
Documents valid?
Vehicle valid?
Insurance valid?
Subscription valid?
Vehicle type enabled?
City enabled?
Zone enabled?
Driver online?
Driver available?
```

All should be checked.

---

# 33. Driver Documents

Support:

* Driving license
* Vehicle registration
* Insurance
* Permit
* Identity document
* Background verification if required

States:

```text
PENDING
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
EXPIRED
SUSPENDED
```

---

# 34. Admin Operations

Admin should be able to:

### Ride

* Search trips
* View trip
* Cancel trip
* Force assign driver
* Reassign driver
* Refund
* Adjust fare
* Add/remove promo
* View payment
* View ledger
* View location history

### Driver

* Approve
* Reject
* Suspend
* Block
* Activate
* Change vehicle
* View documents
* View earnings
* View subscription

### Rider

* View account
* Suspend
* Block
* Refund
* Adjust wallet
* View trips
* View payments

---

# 35. Support System

Support agents need:

```text
Customer
 ↓
Trip
 ↓
Payment
 ↓
Driver
 ↓
Wallet
 ↓
Ledger
 ↓
Notifications
 ↓
Incident
```

A support agent should be able to understand the complete history of one ride without querying 10 unrelated systems manually.

---

# 36. Audit Logs

Record important operations:

```text
who
what
when
before
after
reason
IP/device where appropriate
reference
```

Examples:

```text
Admin changed fare
Admin refunded payment
Driver cancelled trip
Rider cancelled trip
Wallet adjusted
Subscription changed
Driver suspended
Promo created
Promo modified
```

---

# 37. Event Architecture

Your Kafka/RabbitMQ architecture should have domain events such as:

```text
ride.created
ride.searching
ride.driver_assigned
ride.driver_arrived
ride.started
ride.completed
ride.cancelled

payment.created
payment.authorized
payment.captured
payment.failed
payment.refunded

wallet.credited
wallet.debited

driver.earning_created
driver.payout_created

subscription.created
subscription.renewed
subscription.expired

promo.applied
promo.reversed
```

Consumers must be:

* Idempotent
* Retryable
* Observable
* Dead-letter capable

---

# 38. Redis Requirements

Redis can handle:

* Driver online state
* Driver location
* Active ride
* Dispatch candidates
* Ride locks
* Rate limits
* OTP temporary data
* Socket sessions
* Distributed locks
* Short-lived fare/cache data

But Redis should **not be your permanent financial source of truth**.

PostgreSQL should remain authoritative for financial records.

---

# 39. Database Requirements

Important entities include:

```text
users
rider_profiles
driver_profiles
driver_devices

trips
trip_stops
trip_status_history
trip_locations
trip_offers

cities
zones
service_areas

vehicle_types
vehicle_models
driver_vehicles

fare_rules
fare_components
surge_rules
commission_rules

payment_methods
payments
payment_attempts
payment_webhooks
refunds

wallets
wallet_transactions
ledger_accounts
ledger_entries

promocodes
promo_campaigns
promo_redemptions

subscriptions
subscription_plans
subscription_entitlements

driver_earnings
driver_payouts
payout_attempts

notifications
notification_deliveries

ratings
reviews

support_tickets
incidents

audit_logs
idempotency_keys
outbox_events
```

You don't necessarily need exactly these table names, but the **business concepts need to exist somewhere**.

---

# 40. Concurrency / Race Conditions

This is a major area AI audits often miss.

Test:

```text
Two drivers accept same ride
Two payments capture
Two refunds
Two cancellation requests
Two trip completion requests
Two promo redemptions
Two wallet deductions
Two subscription renewals
Two payout requests
```

Everything important needs:

* Database transaction
* Unique constraints
* Idempotency
* Atomic update
* Locking where appropriate

---

# 41. API Requirements

Every important API should have:

```text
authentication
authorization
validation
rate limiting
idempotency
transaction handling
consistent response
logging
error handling
```

Example:

```json
{
  "SUCCESS": true,
  "MESSAGE": "Ride created successfully",
  "DATA": {}
}
```

Maintain consistent response semantics across your API.

---

# 42. Security

Check:

* JWT validation
* Token expiration
* Refresh token security
* Role-based access
* Resource ownership
* Driver cannot access another driver's trip
* Rider cannot access another rider's payment
* Admin authorization
* Socket authorization
* Input validation
* SQL injection
* Rate limiting
* OTP abuse
* Payment webhook signature
* Sensitive data encryption
* Secrets management
* CORS
* Security headers
* Audit logging

---

# 43. Reliability

Production system should survive:

```text
Redis unavailable
Kafka unavailable
RabbitMQ unavailable
Payment provider unavailable
Socket disconnected
Driver app killed
Rider app killed
Network timeout
Database connection failure
Duplicate request
Duplicate event
Out-of-order event
Worker crash
Server restart
```

The ride itself must remain recoverable.

---

# 44. Recovery

Example:

```text
Driver accepts
 ↓
API crashes
 ↓
Server restarts
 ↓
Trip still DRIVER_ASSIGNED
 ↓
Driver reconnects
 ↓
Rider reconnects
 ↓
System restores current state
```

Do not depend on Socket.IO memory for the authoritative trip state.

---

# 45. Observability

Need:

* Structured logs
* Request ID
* Trip ID
* Payment ID
* User ID
* Driver ID
* Event ID
* Correlation ID

Metrics:

```text
ride creation success
ride creation failure
matching latency
driver acceptance rate
no-driver rate
trip cancellation rate
payment failure rate
payment latency
refund rate
socket connections
socket disconnects
Kafka consumer lag
Redis errors
DB latency
API latency
```

---

# 46. Important Edge Cases

Your AI audit should specifically test:

### Rider

* Creates ride and immediately cancels
* App crashes
* Internet disconnects
* Payment fails
* Payment succeeds but API times out
* Promo expires during booking
* Wallet balance changes during booking
* Driver unavailable

### Driver

* Accepts then loses internet
* Accepts then app crashes
* Goes offline
* Cancels
* GPS stops
* GPS jumps
* Reconnects
* Two devices logged in

### Trip

* Driver arrives before rider
* Rider no-show
* Driver no-show
* Trip started accidentally
* Trip completion duplicated
* Destination changed
* Additional stop
* Route deviation
* Toll added
* Waiting fee

### Payment

* Capture timeout
* Duplicate webhook
* Refund timeout
* Partial refund
* Chargeback
* Provider outage
* Currency mismatch
* Payment succeeds after ride cancellation

---

# 47. The Complete Financial Flow

This is the flow I would specifically audit in your platform:

```text
Rider
  │
  │ Create Ride
  ▼
Fare Engine
  │
  ├── Gross Fare
  ├── Taxes
  ├── Fees
  ├── Promo
  ├── Wallet
  └── Rider Payable
  │
  ▼
Payment Service
  │
  ├── Wallet
  ├── Card
  ├── UPI
  ├── Cash
  └── Corporate
  │
  ▼
Trip
  │
  ├── Driver assigned
  ├── Started
  └── Completed
  │
  ▼
Final Fare
  │
  ├── Gross Fare
  ├── Rider Discount
  ├── Rider Payable
  ├── Driver Earnings
  ├── Commission
  ├── Platform Subsidy
  ├── Tax
  └── Payment Fee
  │
  ▼
Ledger
  │
  ├── Rider debit
  ├── Platform revenue
  ├── Promo subsidy
  ├── Driver earning
  └── Fees
  │
  ▼
Driver Wallet
  │
  ▼
Payout
  │
  ▼
Bank / PSP
```

---

# 48. MASTER AI AUDIT PROMPT

This is the prompt I recommend giving to Claude Code, Cursor, Codex, or another coding agent **inside your existing rideshare repository**.

# ROLE

Act as a Principal Software Architect, Senior Backend Engineer, Senior Full-Stack Engineer, Payments Architect, Distributed Systems Engineer, Security Engineer, QA Engineer, and Production Reliability Engineer.

You are auditing an EXISTING production-oriented rideshare platform.

Do NOT assume the existing implementation is correct simply because the code compiles or basic APIs work.

Your job is to inspect the ENTIRE codebase, understand the existing architecture, identify missing functionality, identify incorrect business logic, identify race conditions and financial risks, and then implement the missing functionality in a production-grade way.

The platform supports:

* Rider
* Driver
* Admin
* Ride booking
* Driver dispatch/matching
* Trip lifecycle
* Fare calculation
* Dynamic pricing
* Promotions
* Rider wallet
* Driver wallet
* Payments
* Driver earnings
* Driver payouts
* Driver subscriptions
* Subscription and non-subscription rides
* Cash rides
* Multiple payment providers
* Redis
* Kafka
* RabbitMQ
* PostgreSQL
* Real-time Socket.IO communication

The existing project uses Node.js/Fastify/Drizzle/PostgreSQL/Redis/Kafka/RabbitMQ/Socket.IO and related services.

DO NOT rewrite the entire application blindly.

First understand what already exists.

---

# PRIMARY OBJECTIVE

Audit and harden the complete business lifecycle:

RIDER CREATES RIDE

→ fare estimate

→ payment validation

→ promo/wallet processing

→ ride creation

→ dispatch

→ driver offer

→ driver acceptance

→ driver assignment

→ driver arriving

→ driver arrived

→ trip verification

→ trip started

→ live trip tracking

→ waiting/stops/route changes

→ trip completed

→ final fare

→ payment capture

→ promo settlement

→ driver earning calculation

→ commission

→ platform subsidy

→ wallet/ledger settlement

→ driver payout

→ receipt

→ rating

→ support/audit

The final system must be financially correct, concurrency-safe, recoverable, observable, secure, and production-ready.

---

# IMPORTANT RULES

1. DO NOT assume existing code is correct.
2. DO NOT delete working functionality without a clear reason.
3. DO NOT introduce unnecessary architectural rewrites.
4. Reuse existing architecture where it is sound.
5. Fix root causes rather than adding superficial patches.
6. Do not duplicate business logic across controllers/services.
7. Do not put business logic directly inside route handlers.
8. Use explicit state machines for trip/payment/subscription lifecycles.
9. Use database transactions for financial operations.
10. Use idempotency for payment, wallet, ride completion, refund, payout, promo redemption and other critical operations.
11. Treat PostgreSQL as the authoritative source for financial records.
12. Redis must not be the source of truth for money.
13. Events must be idempotent.
14. Webhooks must be verified and persisted.
15. Do not trust frontend payment-success responses.
16. Do not allow invalid trip-state transitions.
17. Do not allow two drivers to successfully acquire the same ride.
18. Do not allow duplicate financial transactions.
19. Do not change public API contracts unnecessarily.
20. Maintain the existing response format where possible.
21. Preserve existing environment configuration conventions.
22. Do not hardcode business rules that belong in configuration/database.
23. Do not use TODO comments as a substitute for implementation.
24. Do not mark a feature complete unless its edge cases have been considered.
25. Do not merely report problems. Implement fixes where safe and appropriate.

---

# PHASE 1 — UNDERSTAND THE EXISTING SYSTEM

Before changing code, inspect:

* package.json
* environment/config
* application bootstrap
* routes
* controllers
* services
* repositories
* database schema
* migrations
* Redis configuration
* Kafka configuration
* RabbitMQ configuration
* Socket.IO implementation
* background workers
* cron jobs
* payment integrations
* wallet implementation
* promo implementation
* subscription implementation
* driver dispatch
* trip lifecycle
* fare engine
* notification system
* admin APIs
* authentication/authorization
* logging
* error handling
* tests

Create a mental map of:

```text
API
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
PostgreSQL

and

Domain Event
 ↓
Kafka/RabbitMQ
 ↓
Consumer
 ↓
Side Effect

and

Socket.IO
 ↓
Redis
 ↓
Real-time state
```

Identify where each business rule currently lives.

---

# PHASE 2 — CREATE A GAP ANALYSIS

Audit every domain and classify each feature as:

* IMPLEMENTED_CORRECT
* IMPLEMENTED_BUT_RISKY
* PARTIALLY_IMPLEMENTED
* MISSING
* INCORRECT
* DUPLICATED
* NOT_TESTED

Create a matrix:

| Domain | Feature | Status | Risk | Existing Code | Required Fix |
| ------ | ------- | ------ | ---- | ------------- | ------------ |

Do not stop after finding the first problem.

Inspect the entire repository.

---

# PHASE 3 — RIDER FLOW

Verify the complete rider flow:

1. Authentication
2. Rider profile
3. Location selection
4. Pickup validation
5. Destination validation
6. Multiple stops
7. Ride type
8. Vehicle type
9. Immediate ride
10. Scheduled ride
11. Ride for someone else
12. Payment method
13. Wallet
14. Promo
15. Fare estimate
16. Fare confirmation
17. Ride creation
18. Driver search
19. Driver assignment
20. Driver tracking
21. Driver arrival
22. Trip start
23. Trip progress
24. Trip completion
25. Final fare
26. Payment
27. Receipt
28. Rating
29. Support

Verify that every step has proper validation, authorization, error handling and state management.

---

# PHASE 4 — RIDE STATE MACHINE

Audit the trip state machine.

At minimum support concepts equivalent to:

```text
SEARCHING
DRIVER_ASSIGNED
DRIVER_ARRIVING
DRIVER_ARRIVED
STARTED
COMPLETED
CANCELLED
NO_DRIVER_FOUND
```

Verify:

* Valid transitions
* Invalid transitions rejected
* Atomic state updates
* Transition history
* Actor responsible for transition
* Timestamp
* Reason
* Idempotency
* Concurrency protection

Find every place where trip status can be changed.

Ensure there is ONE authoritative state transition mechanism.

---

# PHASE 5 — DRIVER DISPATCH

Audit:

* Candidate discovery
* Driver eligibility
* Online/offline state
* Driver availability
* Vehicle type
* Driver documents
* Driver subscription entitlement
* Service zones
* Distance
* ETA
* Driver ranking
* Offer creation
* Offer expiry
* Driver accept
* Driver reject
* Driver timeout
* Retry
* Candidate expansion
* Atomic assignment

Critical requirement:

Two drivers must NEVER successfully acquire the same trip.

Implement database constraints/transactions/locking or another reliable concurrency mechanism.

---

# PHASE 6 — FARE ENGINE

Audit the fare engine.

Separate:

```text
gross_fare
discount
wallet_credit
rider_payable
driver_gross_earning
driver_commission
driver_net_earning
platform_subsidy
platform_revenue
tax
payment_fee
```

Verify support for:

* Base fare
* Minimum fare
* Distance
* Time
* Booking fee
* Service fee
* Waiting
* Stops
* Tolls
* Airport fee
* Dynamic pricing
* Surge
* Night pricing
* Traffic pricing
* Busy zones
* City-specific pricing
* Vehicle-specific pricing

Do NOT make driver earnings equal to rider payable unless that is explicitly the commercial rule.

---

# PHASE 7 — PROMOTION ENGINE

Audit:

* Fixed discounts
* Percentage discounts
* Maximum discount
* Minimum fare
* New rider
* Existing rider
* First ride
* Campaigns
* City
* Vehicle
* Time windows
* Expiration
* Usage limits
* Per-user limits
* Global limits
* Stacking
* Eligibility
* Redemption
* Reversal

Ensure promo accounting is separate from fare accounting.

A discounted rider payment must NOT silently reduce the driver's contractual earnings unless that is explicitly configured.

---

# PHASE 8 — WALLET

Audit both rider and driver wallets.

Rider:

* Top-up
* Payment
* Promo credit
* Refund
* Debit
* Credit
* Reversal

Driver:

* Ride earning
* Bonus
* Incentive
* Commission
* Penalty
* Subscription charge
* Adjustment
* Withdrawal
* Payout

Do not rely solely on a mutable balance.

Verify ledger-backed accounting.

---

# PHASE 9 — FINANCIAL LEDGER

Implement or strengthen an immutable ledger if necessary.

Each financial transaction should have concepts equivalent to:

```text
transaction_id
reference_type
reference_id
account_id
amount
currency
direction
transaction_type
status
created_at
```

Verify double-entry/accounting consistency where appropriate.

Every money movement must be traceable back to:

```text
ride
payment
promo
wallet
commission
driver earning
refund
payout
subscription
adjustment
```

Never silently modify historical financial records.

Use reversal/adjustment entries.

---

# PHASE 10 — PAYMENT SYSTEM

Audit:

* Payment creation
* Payment authorization
* Payment capture
* Payment failure
* Payment cancellation
* Payment expiry
* Refund
* Partial refund
* Chargeback
* Multiple PSPs
* Wallet payment
* Cash
* Corporate payment
* Payment retry

Required states should be explicit.

Implement idempotency.

Example:

```text
payment:create
payment:authorize
payment:capture
payment:refund
payment:payout
```

must not create duplicate financial operations when retried.

---

# PHASE 11 — PAYMENT WEBHOOKS

Audit every payment webhook.

Verify:

* Signature
* Event persistence
* Duplicate detection
* Idempotency
* Retry
* Out-of-order events
* Unknown events
* Failed processing
* Dead-letter handling
* Reconciliation

Never trust frontend payment status as the final source of truth.

---

# PHASE 12 — CASH RIDES

Explicitly audit cash rides.

Example:

```text
Gross fare = 500
Promo = 100
Rider pays driver = 400
```

Determine:

* Driver cash collection
* Driver contractual earning
* Platform commission
* Platform subsidy
* Platform receivable
* Driver payable
* Ledger entries

Ensure the system does not create accounting gaps when the rider pays cash directly to the driver.

---

# PHASE 13 — DRIVER SUBSCRIPTIONS

Audit subscription and non-subscription driver flows.

Support concepts equivalent to:

```text
TRIAL
ACTIVE
PAST_DUE
GRACE_PERIOD
EXPIRED
CANCELLED
SUSPENDED
```

Plans may include:

```text
MONTHLY
HALF_MONTHLY
YEARLY
```

Benefits must be configurable rather than hardcoded.

Examples:

* Commission rules
* Dispatch priority
* Ride eligibility
* Premium zones
* Incentives
* Special pricing

Determine entitlement at runtime.

Never duplicate subscription logic inside ride controllers.

---

# PHASE 14 — DRIVER ELIGIBILITY

Before accepting/dispatching a ride verify:

```text
account active
driver approved
documents valid
vehicle valid
vehicle type enabled
city enabled
zone enabled
subscription entitlement
driver online
driver available
```

Centralize eligibility rules.

---

# PHASE 15 — TRIP START

Audit:

* Driver arrived
* Rider presence
* OTP/PIN
* Vehicle verification
* Start location
* Start timestamp
* Start state
* Duplicate start request
* Unauthorized start

Prevent drivers from starting trips they are not assigned to.

---

# PHASE 16 — LIVE LOCATION

Audit Socket.IO.

Verify:

* Authentication
* Authorization
* Rider namespace
* Driver namespace
* Admin namespace
* Rooms
* Trip ownership
* Reconnect
* Duplicate connections
* Heartbeats
* Redis adapter/state
* Location validation
* Rate limiting
* GPS jumps
* Offline buffering
* Cleanup after trip completion

Do not treat Socket.IO memory as the authoritative trip state.

---

# PHASE 17 — TRIP COMPLETION

Completion must be idempotent.

Audit:

* End location
* End timestamp
* Distance
* Duration
* Waiting
* Stops
* Tolls
* Dynamic pricing
* Final fare
* Promo
* Rider payable
* Payment capture
* Driver earning
* Commission
* Subsidy
* Ledger
* Receipt
* Rating
* Events

Calling complete twice must not create:

* Two payments
* Two earnings
* Two ledger entries
* Two receipts
* Two payout obligations

---

# PHASE 18 — CANCELLATION

Audit rider and driver cancellation.

Support:

* Before matching
* After assignment
* Driver arriving
* Driver arrived
* Waiting
* Trip started if allowed

Every cancellation needs:

```text
cancelled_by
reason
timestamp
previous_state
cancellation_fee
financial_effect
```

Verify payment authorization reversal/refund where required.

---

# PHASE 19 — NO DRIVER FOUND

Verify:

```text
search
→ candidate retry
→ search expansion
→ timeout
→ NO_DRIVER_FOUND
```

If payment was authorized:

```text
release/void/refund
```

must happen safely and idempotently.

---

# PHASE 20 — REFUNDS

Support:

* Full refund
* Partial refund
* Payment refund
* Wallet refund
* Promo reversal rules
* Admin refund
* Cancellation refund
* Failed ride refund
* Duplicate payment refund

Refunds must create separate financial records.

---

# PHASE 21 — RATINGS

Audit:

* Rider → Driver
* Driver → Rider
* One rating per trip
* Rating modification rules
* Rating comments
* Rating aggregation
* Invalid rating protection

---

# PHASE 22 — ADMIN

Audit admin functionality for:

* Riders
* Drivers
* Vehicles
* Documents
* Trips
* Payments
* Refunds
* Wallet
* Ledger
* Promo
* Subscription
* Fare rules
* Commission
* Zones
* Cities
* Service areas
* Support
* Incidents
* Audit logs

Admin operations must be permission-controlled.

---

# PHASE 23 — SUPPORT / INCIDENTS

Verify support can trace:

```text
rider
→ trip
→ driver
→ fare
→ payment
→ wallet
→ ledger
→ notifications
→ incident
```

Support actions must be audited.

---

# PHASE 24 — EVENTS

Audit Kafka/RabbitMQ events.

Verify:

* Event schema
* Event version
* Event ID
* Correlation ID
* Aggregate ID
* Timestamp
* Producer
* Consumer
* Idempotency
* Retry
* Dead letter
* Consumer failure
* Ordering requirements

Important events include:

```text
ride.created
ride.driver_assigned
ride.started
ride.completed
ride.cancelled

payment.created
payment.authorized
payment.captured
payment.failed
payment.refunded

wallet.credited
wallet.debited

driver.earning_created
driver.payout_created

subscription.created
subscription.renewed
subscription.expired

promo.applied
promo.reversed
```

---

# PHASE 25 — OUTBOX / EVENT RELIABILITY

Check for the dual-write problem:

```text
DB transaction succeeds
BUT
Kafka publish fails
```

or:

```text
Kafka publish succeeds
BUT
DB transaction fails
```

Implement an outbox pattern or equivalent reliable mechanism where appropriate.

---

# PHASE 26 — DATABASE

Audit schema for:

* Foreign keys
* Unique constraints
* Check constraints
* Indexes
* Enum/state integrity
* Currency precision
* Decimal money types
* Timestamps
* Soft deletion where appropriate
* Audit history
* Transaction boundaries
* Referential integrity

Never use floating-point numbers for monetary values.

Use appropriate decimal/numeric representation.

---

# PHASE 27 — CONCURRENCY

Explicitly test:

```text
Two drivers accept one ride
Two riders cancel
Rider cancels while driver accepts
Payment capture twice
Webhook delivered twice
Refund requested twice
Trip completion twice
Promo redeemed twice
Wallet deducted twice
Payout requested twice
Subscription renewed twice
```

Fix every race condition discovered.

---

# PHASE 28 — IDEMPOTENCY

Critical APIs should support idempotency where required:

```text
create ride
accept ride
start ride
complete ride
cancel ride
payment
refund
wallet transaction
promo redemption
subscription payment
payout
```

---

# PHASE 29 — SECURITY

Audit:

* JWT
* Refresh tokens
* RBAC
* Ownership checks
* Driver authorization
* Rider authorization
* Admin authorization
* Socket authorization
* Rate limiting
* OTP protection
* Input validation
* SQL injection
* Payment webhook signatures
* CORS
* Security headers
* Secrets
* Sensitive logging
* Data exposure
* IDOR vulnerabilities

Attempt to access another user's:

* trip
* payment
* wallet
* profile
* driver data

and ensure authorization prevents it.

---

# PHASE 30 — FAILURE RECOVERY

Simulate:

```text
Redis unavailable
Kafka unavailable
RabbitMQ unavailable
Database connection lost
Payment provider unavailable
Socket disconnected
Driver app killed
Rider app killed
Server restarted
Worker crashes
Network timeout
Duplicate request
Duplicate event
Out-of-order webhook
```

The system must recover without corrupting ride or financial state.

---

# PHASE 31 — OBSERVABILITY

Ensure important operations contain:

```text
request_id
correlation_id
trip_id
payment_id
user_id
driver_id
event_id
```

Add structured logging.

Identify missing metrics for:

* Ride creation
* Dispatch latency
* Driver acceptance
* No-driver rate
* Cancellation
* Payment failure
* Refund
* Socket connections
* Kafka lag
* Redis errors
* DB latency
* API latency

---

# PHASE 32 — API QUALITY

Audit every endpoint for:

* Authentication
* Authorization
* Validation
* Rate limiting
* Idempotency
* Error handling
* Transaction handling
* Response consistency
* Logging
* Correct HTTP status
* Ownership

Do not expose internal database errors to clients.

---

# PHASE 33 — TESTING

Create/strengthen tests for:

## Unit

* Fare
* Promo
* Commission
* Subscription
* Eligibility
* Cancellation
* Payment
* Wallet
* Ledger

## Integration

* Ride creation
* Dispatch
* Driver accept
* Trip start
* Trip completion
* Payment
* Refund
* Wallet
* Promo

## Concurrency

* Double accept
* Double payment
* Double completion
* Double refund
* Double promo redemption

## Failure

* Redis down
* Kafka failure
* PSP timeout
* Webhook duplicate
* Network retry

---

# PHASE 34 — DO NOT JUST FIND PROBLEMS

For every discovered issue:

1. Explain the problem.
2. Explain why it is dangerous.
3. Identify affected files.
4. Identify affected database tables.
5. Identify affected APIs/events.
6. Implement the safest fix.
7. Add/update tests.
8. Check for side effects.
9. Check related modules for the same bug.
10. Re-run validation.

---

# PHASE 35 — AVOID PARTIAL FIXES

When fixing a feature, inspect all related layers.

For example, if fixing promo:

```text
database
→ promo service
→ fare service
→ ride creation
→ driver offer
→ payment
→ wallet
→ ledger
→ driver earnings
→ admin
→ receipt
→ refund
→ reporting
```

Do not fix only one controller.

---

# PHASE 36 — FINAL AUDIT REPORT

At the end produce:

## A. Executive Summary

* Overall readiness
* Critical problems
* High-risk problems
* Medium problems
* Low-risk improvements

## B. Feature Matrix

```text
Feature
Status
Risk
Files
Fix
Tests
```

## C. Financial Integrity Report

Explain:

```text
gross fare
discount
rider payable
driver earning
commission
platform subsidy
tax
payment fee
wallet
ledger
payout
```

and verify that money never disappears or gets duplicated.

## D. State Machine Report

Show all valid and invalid transitions.

## E. Event Architecture Report

Show:

```text
producer
event
consumer
retry
DLQ
idempotency
```

## F. Database Report

List:

* Missing tables
* Missing columns
* Missing indexes
* Missing constraints
* Missing foreign keys

## G. Security Report

List vulnerabilities and fixes.

## H. Reliability Report

List failure scenarios and recovery behavior.

## I. Test Report

Show what was tested and the result.

---

# PRIORITY ORDER

Implement fixes in this order:

P0 — CRITICAL

* Money duplication/loss
* Duplicate payment
* Duplicate payout
* Incorrect driver earnings
* Incorrect promo accounting
* Double ride assignment
* Unauthorized access
* Broken trip state transitions
* Data corruption

P1 — HIGH

* Payment reliability
* Wallet/ledger
* Dispatch reliability
* Subscription entitlement
* Refunds
* Webhooks
* Idempotency
* Event reliability
* Socket authorization

P2 — MEDIUM

* Notifications
* Admin tooling
* Support
* Analytics
* Operational improvements

P3 — LOW

* UX improvements
* Refactoring
* Performance optimization
* Code cleanup

---

# FINAL REQUIREMENT

Do not tell me:

"Everything looks good."

unless you have actually inspected the relevant implementation.

Do not assume that a feature exists because a route exists.

Verify the complete path:

```text
API
→ validation
→ service
→ database
→ event
→ consumer
→ side effects
→ payment
→ ledger
→ notification
```

A feature is considered COMPLETE only when its:

* database model
* business logic
* API
* authorization
* state machine
* financial effect
* event behavior
* failure handling
* idempotency
* concurrency behavior
* tests
* observability

have all been considered.

Start by auditing the existing codebase.

DO NOT make a giant rewrite.

First produce the gap analysis.

Then implement the highest-priority fixes incrementally.

After each major change, verify that existing functionality still works.

### One important recommendation

Don't give the AI agent only the requirement list and say **"make it production ready."** That often causes it to rewrite working modules or add superficial tables.

Use this sequence:

```text
1. FULL CODEBASE SCAN
        ↓
2. ARCHITECTURE MAP
        ↓
3. GAP ANALYSIS
        ↓
4. P0 FINANCIAL / DATA / SECURITY FIXES
        ↓
5. P1 CORE RIDE / DISPATCH / PAYMENT FIXES
        ↓
6. P2 OPERATIONAL FEATURES
        ↓
7. TESTS
        ↓
8. CONCURRENCY TEST
        ↓
9. FAILURE/RECOVERY TEST
        ↓
10. FINAL PRODUCTION READINESS AUDIT
```

**For your particular platform, I would pay extra attention to five areas:** **fare vs promo vs driver earnings**, **cash-ride subsidy accounting**, **driver subscription entitlements**, **double-driver acceptance/concurrency**, and **payment → ledger → payout consistency**. Those are the areas where an otherwise functional Uber-like clone can become financially or operationally incorrect at scale.
