Yes. The right approach is to make the **ledger and financial transaction model country/provider agnostic**, while everything specific to Razorpay, Cashfree, Stripe, country regulations, wallets, promotions, subscriptions, corporate billing, etc. sits above or beside it.

I would extend the architecture like this:

```text
                         ┌──────────────────────────┐
                         │       RIDER / DRIVER      │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │      PAYMENT API          │
                         └────────────┬─────────────┘
                                      │
                  ┌───────────────────┼──────────────────┐
                  │                   │                  │
                  ▼                   ▼                  ▼
             Payment Intent       Wallet/Credit      Billing
                  │                   │                  │
                  └───────────────────┼──────────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │   PAYMENT ORCHESTRATOR   │
                         └────────────┬─────────────┘
                                      │
                     ┌────────────────┼─────────────────┐
                     │                │                 │
                     ▼                ▼                 ▼
                  PSP Router       Risk Engine      FX Engine
                     │
          ┌──────────┼──────────┬───────────┐
          ▼          ▼          ▼           ▼
       PSP-A       PSP-B      PSP-C       PSP-D
     Razorpay    Cashfree    Stripe      Other
          │          │          │           │
          └──────────┴──────────┴───────────┘
                         │
                         ▼
                ┌──────────────────┐
                │ DOUBLE-ENTRY     │
                │ LEDGER           │
                └────────┬─────────┘
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
 Driver Payable     Platform Revenue   Tax Payable
        │
        ▼
     Payout
        │
        ▼
   Driver Bank
```

The key architectural rule is:

> **PSPs move money. The ledger explains and records who economically owns the money.**

---

# 1. Expand the domain model

I would now divide the payment system into these modules:

```text
payments
payment-providers
payment-methods

ledger
ledger-accounts
ledger-transactions

wallets
credits
promotions
subscriptions

corporate-billing
invoices
corporate-wallets

driver-earnings
driver-incentives
driver-payouts

refunds
reversals
chargebacks
disputes

cash-payments

fx
multi-currency
country-rules
tax

settlements
reconciliation

risk
fraud

idempotency
webhooks
outbox
audit
```

This lets you add functionality without changing the ledger model.

---

# 2. The universal financial model

Everything eventually becomes:

```text
Financial Event
      │
      ▼
Financial Transaction
      │
      ▼
Ledger Entries
      │
      ├── Debit
      └── Credit
```

For example:

```text
Rider pays
Promo used
Wallet used
Corporate account pays
Cash collected
Driver incentive earned
Refund issued
Chargeback received
Subscription charged
```

All eventually produce ledger entries.

---

# 3. Universal account model

Instead of creating special balance tables everywhere, use:

```text
ledger_accounts
```

with:

```text
id
account_code
account_type

owner_type
owner_id

currency
country

status

created_at
updated_at
```

Account types could include:

```text
ASSET
LIABILITY
EQUITY
REVENUE
EXPENSE
CLEARING
```

And more specific subtypes:

```text
RIDER_RECEIVABLE
DRIVER_PAYABLE
PLATFORM_CASH
PLATFORM_REVENUE

PROMO_LIABILITY
WALLET_LIABILITY
CORPORATE_RECEIVABLE

TAX_PAYABLE
REFUND_LIABILITY

PAYMENT_PROCESSING_EXPENSE
DRIVER_INCENTIVE_EXPENSE

PSP_CLEARING
BANK_CLEARING
CASH_CLEARING
```

---

# 4. Example: normal ride

Fare:

```text
₹500
```

Ledger:

```text
DR PSP_CLEARING              ₹500
    CR DRIVER_PAYABLE        ₹400
    CR PLATFORM_REVENUE       ₹80
    CR TAX_PAYABLE             ₹20
```

---

# 5. Example: rider uses ₹100 wallet credit

Ride:

```text
₹500
```

Rider pays:

```text
₹400 card
₹100 wallet
```

Ledger:

```text
DR PSP_CLEARING              ₹400
DR RIDER_WALLET_LIABILITY    ₹100

    CR DRIVER_PAYABLE        ₹400
    CR PLATFORM_REVENUE       ₹80
    CR TAX_PAYABLE             ₹20
```

The wallet isn't a special payment flow.

It's another financial account.

---

# 6. Wallet architecture

This needs an important distinction.

Do **not** assume every "wallet" is legally equivalent to stored money.

Create:

```text
wallets
```

with:

```text
id
user_id

wallet_type

currency
country

status

created_at
updated_at
```

Wallet types:

```text
PROMOTIONAL_CREDIT
REFUND_CREDIT
LOYALTY_CREDIT
PREPAID_BALANCE
```

The first three may have very different legal/accounting treatment from an actual stored-value wallet.

For regulated stored-value products, use the appropriate licensed/regulated structure rather than treating a PostgreSQL balance as a bank-like wallet.

---

# 7. Wallet transactions

Never do:

```sql
UPDATE wallets
SET balance = balance + 100;
```

as the financial source of truth.

Instead:

```text
wallet_transactions

id
wallet_id

transaction_type

amount_minor
currency

reference_type
reference_id

status

expires_at

created_at
```

And corresponding ledger entries.

---

# 8. Wallet balance

You can maintain:

```text
wallet_balances
```

as a projection:

```text
wallet_id
available_minor
reserved_minor
version
updated_at
```

But:

```text
Ledger
  ↓
authoritative

Wallet balance
  ↓
materialized view/cache
```

---

# 9. Promo credits

Promo credit should be separate from purchased money.

Example:

```text
Promo:
₹200 ride credit
Expires:
30 days
Maximum usage:
₹100 per ride
```

Create:

```text
promo_campaigns
promo_codes
promo_credits
promo_credit_transactions
```

`promo_credits`:

```text
id
user_id
campaign_id

original_amount_minor
remaining_amount_minor

currency

expires_at

status

created_at
```

---

# 10. Promo ledger

Suppose:

```text
Ride = ₹500
Promo = ₹100
Rider pays = ₹400
```

You might have:

```text
DR PSP_CLEARING              ₹400
DR PROMO_LIABILITY           ₹100

    CR DRIVER_PAYABLE        ₹400
    CR PLATFORM_REVENUE       ₹80
    CR TAX_PAYABLE             ₹20
```

Your actual accounting treatment depends on how the promotion is funded and your accounting/tax rules.

That is why the **promotion engine should calculate allocation**, while the ledger records it.

---

# 11. Promo rules engine

Don't hard-code:

```js
if (promo === "WELCOME100")
```

Build:

```text
promotion_rules
```

with:

```text
percentage_discount
fixed_discount
maximum_discount
minimum_fare
eligible_country
eligible_city
eligible_vehicle
eligible_user
first_ride_only
payment_method
start_at
end_at
usage_limit
per_user_limit
```

---

# 12. Driver incentives

Driver incentives should be treated separately from normal ride earnings.

Examples:

```text
Complete 20 rides → ₹500
Drive 5 hours → ₹300
Airport trip bonus → ₹100
Weekend bonus → ₹1,000
Surge incentive
Referral bonus
Quest
Guaranteed earnings
```

Create:

```text
driver_incentive_campaigns
driver_incentive_rules
driver_incentive_progress
driver_incentive_rewards
```

---

# 13. Incentive lifecycle

```text
Campaign created
       ↓
Driver enrolled
       ↓
Ride completed
       ↓
Progress updated
       ↓
Threshold reached
       ↓
Reward calculated
       ↓
Reward approved
       ↓
Driver earning created
       ↓
Available for payout
```

---

# 14. Incentive ledger

Example:

```text
Driver completes 20 rides
Bonus = ₹500
```

Ledger:

```text
DR DRIVER_INCENTIVE_EXPENSE     ₹500
    CR DRIVER_PAYABLE            ₹500
```

Then payout happens through the normal payout mechanism.

You don't need another payment system.

---

# 15. Subscriptions

Now add:

```text
subscription_plans
subscriptions
subscription_items
subscription_cycles
subscription_payments
subscription_events
```

Example:

```text
RidePass
₹299/month
```

Subscription:

```text
id
user_id
plan_id

provider
provider_subscription_id

status

current_period_start
current_period_end

cancel_at_period_end

created_at
updated_at
```

---

# 16. Subscription states

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

# 17. Subscription billing

Don't make the subscription service directly manipulate the ledger.

Flow:

```text
Subscription Scheduler
        ↓
Create Payment Intent
        ↓
PSP
        ↓
Payment Captured
        ↓
Ledger
        ↓
Subscription Cycle Paid
```

Therefore subscription billing uses the same payment infrastructure.

---

# 18. Corporate riders

This is another major extension.

Instead of:

```text
rider → payment
```

you can have:

```text
employee
   ↓
corporate account
   ↓
company pays
```

Create:

```text
corporate_accounts
corporate_users
corporate_payment_profiles
corporate_billing_rules
corporate_invoices
corporate_invoice_items
corporate_credit_limits
```

---

# 19. Corporate account

```text
corporate_accounts

id
company_name

billing_email

currency
country

payment_terms

credit_limit_minor

status

created_at
updated_at
```

---

# 20. Corporate ride flow

Employee takes ride:

```text
Ride ₹500
```

Instead of immediately charging the employee:

```text
Corporate receivable
        ↓
₹500
```

At billing period:

```text
100 rides
₹50,000
        ↓
Corporate invoice
        ↓
Company payment
```

---

# 21. Corporate ledger

Ride:

```text
DR CORPORATE_RECEIVABLE      ₹500
    CR DRIVER_PAYABLE        ₹400
    CR PLATFORM_REVENUE       ₹80
    CR TAX_PAYABLE             ₹20
```

Company pays invoice:

```text
DR PSP_CLEARING            ₹50,000
    CR CORPORATE_RECEIVABLE ₹50,000
```

Very clean.

---

# 22. Corporate credit limit

Example:

```text
Credit limit = ₹1,00,000
Used         = ₹75,000
Available    = ₹25,000
```

Before allowing another corporate ride:

```text
remaining credit >= estimated exposure
```

This should be protected using a DB transaction/locking strategy.

---

# 23. Corporate invoices

Invoice:

```text
corporate_invoices

id
corporate_account_id

invoice_number

period_start
period_end

subtotal_minor
tax_minor
discount_minor
total_minor

status

due_at
paid_at

created_at
```

Items:

```text
corporate_invoice_items

invoice_id
ride_id
employee_id

amount_minor
tax_minor
total_minor
```

---

# 24. Cash rides

Cash requires a different accounting direction.

Example:

```text
Ride = ₹500
Driver collects ₹500
Platform commission = ₹80
```

Ledger:

```text
DR DRIVER_RECEIVABLE       ₹80
DR DRIVER_CASH_RECEIVED?   [depending on accounting model]

    CR DRIVER_PAYABLE      [appropriate allocation]
```

More simply at the business-obligation level:

```text
Driver owes platform ₹80
```

So driver account becomes:

```text
-₹80
```

Your exact accounting entries should be finalized with your accountant/payment provider because cash collection and tax treatment can vary by jurisdiction.

---

# 25. Cash collection tracking

Create:

```text
cash_collections

id
ride_id
driver_id

expected_amount_minor
collected_amount_minor

currency

status

reported_at
verified_at

created_at
```

Statuses:

```text
EXPECTED
REPORTED
VERIFIED
MISMATCH
DISPUTED
```

---

# 26. Cash mismatch

Suppose:

```text
Expected ₹500
Driver reports ₹400
```

Create:

```text
cash_disputes
```

and do **not** automatically alter the ledger without a verified financial event.

---

# 27. Scheduled payouts

Now:

```text
payout_schedules
```

Example:

```text
DAILY
WEEKLY
BIWEEKLY
MONTHLY
MANUAL
```

Fields:

```text
driver_id
schedule_type
day_of_week
minimum_amount_minor
enabled
next_run_at
```

---

# 28. Payout scheduler

Flow:

```text
Scheduler
   ↓
Find eligible drivers
   ↓
Check available balance
   ↓
Create payout
   ↓
Reserve amount
   ↓
Queue transfer
   ↓
PSP
```

Use a distributed lock so two scheduler instances don't create two payouts.

Redis can help, but the final reservation must be protected in PostgreSQL.

---

# 29. Minimum payout

Example:

```text
Minimum payout = ₹500
```

Driver has:

```text
₹350
```

Don't payout.

Next week:

```text
₹650
```

→ payout.

---

# 30. Multi-PSP architecture

This is where the provider abstraction becomes important.

```text
PaymentProvider
```

interface:

```ts
interface PaymentProvider {
  createPaymentIntent(input: CreatePaymentInput): Promise<ProviderPayment>;
  getPayment(id: string): Promise<ProviderPayment>;
  capturePayment(id: string): Promise<ProviderPayment>;
  refundPayment(input: RefundInput): Promise<ProviderRefund>;

  createTransfer(input: TransferInput): Promise<ProviderTransfer>;
  reverseTransfer(input: ReverseTransferInput): Promise<ProviderTransfer>;

  verifyWebhook(input: VerifyWebhookInput): Promise<ProviderWebhook>;
}
```

Implement:

```text
providers/

razorpay/
cashfree/
stripe/
adyen/
mock/
```

---

# 31. Provider routing

Create:

```text
payment_provider_routes
```

Example:

```text
country
currency
payment_method
transaction_type

provider
priority

min_amount
max_amount

enabled
```

Example:

```text
IN + INR + UPI
→ Razorpay

IN + INR + CARD
→ Cashfree

US + USD + CARD
→ Stripe
```

---

# 32. Don't hard-code provider selection

Bad:

```ts
if (country === "IN") {
  useRazorpay();
}
```

Better:

```ts
const provider =
  await paymentProviderRouter.select({
    country,
    currency,
    paymentMethod,
    transactionType,
  });
```

---

# 33. Provider health

Add:

```text
provider_health
```

with:

```text
provider
country
payment_method

success_rate
latency
error_rate

circuit_state
last_checked_at
```

Router can temporarily remove an unhealthy provider.

---

# 34. PSP fallback

Example:

```text
Razorpay
   ↓
timeout
   ↓
Can safely determine whether transaction was created?
```

If **unknown**, don't immediately send the same payment to another PSP.

First:

```text
query Razorpay
```

because otherwise you could charge twice.

Only route to another PSP when the transaction is definitively not created/processed.

---

# 35. Multi-country

Add:

```text
countries
currencies
country_payment_rules
tax_rules
provider_routes
```

Country:

```text
country_code
currency
timezone
tax_region
enabled
```

Currency:

```text
currency_code
minor_unit
```

This is important because not every currency has two decimal places.

---

# 36. Never assume INR-style money

Don't globally assume:

```text
100 = ₹1
```

Your money abstraction should know:

```text
currency
minor_unit
```

Example conceptually:

```text
INR → 2
USD → 2
JPY → 0
```

Your actual supported-currency table should be authoritative.

---

# 37. FX engine

If you support:

```text
rider pays USD
driver receives EUR
```

you need:

```text
fx_rates
fx_quotes
fx_conversions
```

Example:

```text
Ride price:
USD 20

FX rate:
1 USD = 0.92 EUR

Driver earning:
EUR 14
```

Store the exact rate used.

Never recalculate historical transactions using today's rate.

---

# 38. FX quote

Create:

```text
fx_quotes

id
base_currency
quote_currency

rate
provider

valid_from
valid_until

created_at
```

When payment is created:

```text
fx_quote_id
```

is attached to the transaction.

---

# 39. FX ledger

For multi-currency systems, don't try to force:

```text
one ledger account = multiple currencies
```

Instead:

```text
account + currency
```

is a distinct balance.

Example:

```text
PLATFORM_CASH / USD
PLATFORM_CASH / EUR
PLATFORM_CASH / INR
```

This makes accounting much safer.

---

# 40. Country-specific payment rules

Create:

```text
payment_country_rules

country
payment_method
min_amount
max_amount

capture_supported
refund_supported
transfer_supported

wallet_allowed
cash_allowed

payout_frequency
```

This lets the same core work across countries without changing the ledger.

---

# 41. Tax engine

Don't hard-code tax calculations into payment code.

Create:

```text
tax_rules
tax_calculations
```

Input:

```text
country
state
service
amount
customer_type
business_type
tax_category
```

Output:

```text
tax amount
tax jurisdiction
tax rule version
```

Store the calculation snapshot.

---

# 42. Pricing → Payment → Ledger separation

This becomes your clean architecture:

```text
                    RIDE
                     │
                     ▼
               Fare Engine
                     │
                     ▼
              Billing Engine
                     │
                     ├── Discounts
                     ├── Promo
                     ├── Tax
                     ├── Commission
                     └── FX
                     │
                     ▼
              Payment Intent
                     │
                     ▼
             PSP Orchestrator
                     │
                     ▼
                 Payment
                     │
                     ▼
                  Ledger
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Driver     Platform     Tax
       Payable    Revenue     Payable
          │
          ▼
       Payout
```

---

# 43. Financial transaction abstraction

I'd introduce a generic:

```text
financial_transactions
```

before the ledger.

```text
financial_transactions

id

transaction_type
reference_type
reference_id

currency
amount_minor

status

country

created_at
```

Types:

```text
RIDE_PAYMENT
REFUND
PROMO
WALLET_TOPUP
WALLET_SPEND

SUBSCRIPTION
CORPORATE_INVOICE

DRIVER_INCENTIVE
DRIVER_PAYOUT

CASH_COLLECTION
CASH_SETTLEMENT

FX_CONVERSION
MANUAL_ADJUSTMENT

CHARGEBACK
REVERSAL
```

Then:

```text
financial_transaction
        ↓
ledger_transaction
        ↓
ledger_entries
```

---

# 44. This is the abstraction that future-proofs you

Your payment service doesn't care whether money originated from:

```text
Card
UPI
Wallet
Promo
Corporate account
Cash
Subscription
```

It creates a financial transaction.

Then the ledger records the accounting.

---

# 45. Payment source model

I would introduce:

```text
payment_sources

id
source_type
source_id

amount_minor
currency
priority
```

For a ₹500 ride:

```text
payment_sources

WALLET      ₹100
PROMO        ₹50
CARD        ₹350
```

The payment orchestrator creates the sources.

---

# 46. Payment allocation

Then:

```text
payment_allocations

payment_id
source_type
source_id
amount_minor
```

This makes split-tender payments possible.

Example:

```text
₹500 ride

Wallet     ₹100
Promo       ₹50
Card       ₹350
```

No core ledger redesign required.

---

# 47. Subscription + wallet

Example:

```text
RidePass ₹299
```

Rider could have:

```text
₹100 wallet
₹199 card
```

Payment orchestration:

```text
Wallet
 ↓
₹100

PSP
 ↓
₹199
```

Ledger handles both.

---

# 48. Corporate + promo

Corporate employee could receive:

```text
Corporate pays ₹450
Promo covers ₹50
Ride = ₹500
```

Again:

```text
Corporate receivable ₹450
Promo liability       ₹50
```

No special ledger design.

---

# 49. Driver incentives + payouts

Driver:

```text
Ride earnings       ₹10,000
Incentives            ₹1,000
Refund adjustment      -₹200
Cash commission        -₹300
--------------------------------
Available             ₹10,500
```

The payout system simply sees:

```text
driver available balance = ₹10,500
```

It doesn't care where it came from.

---

# 50. Complete driver financial account

Conceptually:

```text
Driver Account
│
├── Ride earnings
├── Incentives
├── Bonuses
├── Referral rewards
├── Adjustments
│
├── Refund reversals
├── Chargebacks
├── Cash commissions
├── Fees
│
└── Payouts
```

All ledger-based.

---

# 51. Important: don't create one giant `wallet` table

Avoid architecture like:

```text
driver_wallet
rider_wallet
corporate_wallet
promo_wallet
subscription_wallet
```

with each having custom balance logic.

Instead:

```text
ledger_accounts
```

plus specialized domain tables for their business rules.

This dramatically reduces financial bugs.

---

# 52. Event architecture

Your Kafka topics can evolve into:

```text
payments.events
ledger.events

wallet.events
promo.events

subscription.events
corporate.events

driver.earnings.events
driver.payouts.events
driver.incentives.events

refund.events
chargeback.events

settlement.events
reconciliation.events
```

Use event keys such as:

```text
riderId
driverId
paymentId
```

to preserve useful ordering.

---

# 53. Example complete ride event

```json
{
  "eventId": "evt_123",
  "eventType": "ride.payment.captured",
  "version": 1,
  "aggregate": {
    "type": "ride",
    "id": "ride_123"
  },
  "data": {
    "paymentId": "pay_123",
    "currency": "INR",
    "amountMinor": 50000,
    "sources": [
      {
        "type": "PROMO",
        "amountMinor": 5000
      },
      {
        "type": "PSP",
        "amountMinor": 45000
      }
    ],
    "driverEarningMinor": 40000,
    "platformRevenueMinor": 8000,
    "taxMinor": 2000
  }
}
```

---

# 54. Saga for complex payment flows

Some operations involve several systems.

For example:

```text
Corporate ride
   ↓
Corporate credit reservation
   ↓
Ride completes
   ↓
Invoice item
   ↓
Invoice generated
   ↓
Corporate payment
   ↓
Ledger settlement
```

Don't use distributed DB transactions.

Use a **Saga/state machine**.

Each step must be retryable and compensatable.

---

# 55. Example payout saga

```text
Payout Requested
       ↓
Balance Reserved
       ↓
Provider Transfer Created
       ↓
Transfer Pending
       ↓
Provider Success
       ↓
Ledger Finalization
       ↓
Balance Released
```

Failure:

```text
Transfer Failed
       ↓
Release Reservation
       ↓
Payout FAILED
```

Unknown:

```text
Provider timeout
       ↓
DO NOT retry blindly
       ↓
Query provider
       ↓
Resolve state
```

---

# 56. Financial invariants

Write automated checks for:

```text
SUM(debits) = SUM(credits)
```

and:

```text
wallet balance = ledger-derived balance
```

and:

```text
driver available + reserved + paid/relevant movements
= expected ledger state
```

and:

```text
payout amount <= available amount
```

and:

```text
refund amount <= refundable amount
```

and:

```text
successful provider payment
has exactly one corresponding internal financial transaction
```

These tests are more important than many ordinary unit tests.

---

# 57. Automated reconciliation

Run:

```text
every few minutes
```

for recent PSP transactions.

And:

```text
daily
```

for full reconciliation.

And:

```text
monthly
```

for accounting close.

---

# 58. Financial close

Eventually you want:

```text
accounting_periods

period
status
opened_at
closed_at
closed_by
```

After a period is closed:

```text
no normal financial mutation
```

Corrections become:

```text
adjustment transaction
```

This becomes extremely useful for audits.

---

# 59. Multi-country account structure

I would make:

```text
legal_entities
```

a first-class concept.

Example:

```text
India entity
US entity
UK entity
```

Then:

```text
ledger_account
    ↓
legal_entity
    ↓
country
    ↓
currency
```

This becomes important when your rideshare company expands.

---

# 60. Country/payment-provider matrix

Eventually you can have configuration like:

```text
India
 ├── INR
 ├── Razorpay
 ├── Cashfree
 ├── UPI
 ├── Cards
 └── Cash

USA
 ├── USD
 ├── Stripe
 ├── Cards
 └── ACH

UK
 ├── GBP
 ├── Stripe
 ├── Cards
 └── Bank transfer
```

But your:

```text
ledger
financial transactions
refunds
payouts
reconciliation
```

remain conceptually unchanged.

---

# 61. Final database architecture

I would now target something like:

```text
CORE
────────────────────────────────────

legal_entities
countries
currencies

financial_transactions

ledger_accounts
ledger_transactions
ledger_entries

idempotency_keys
outbox_events
inbox_events
audit_logs


PAYMENTS
────────────────────────────────────

payment_customers
payment_methods

payment_intents
payment_attempts
payment_transactions

payment_sources
payment_allocations

payment_webhooks
payment_provider_routes
payment_provider_transactions


DRIVER
────────────────────────────────────

driver_payment_profiles
driver_earnings
driver_incentives
driver_incentive_progress

payout_schedules
payouts
payout_attempts
transfers


REFUNDS / DISPUTES
────────────────────────────────────

refunds
refund_items

disputes
chargebacks
reversals


WALLET / CREDIT
────────────────────────────────────

wallets
wallet_balances
wallet_transactions

credits
credit_transactions


PROMOTIONS
────────────────────────────────────

promotion_campaigns
promotion_rules
promo_codes
promo_credits
promo_redemptions


SUBSCRIPTIONS
────────────────────────────────────

subscription_plans
subscriptions
subscription_cycles
subscription_payments


CORPORATE
────────────────────────────────────

corporate_accounts
corporate_users

corporate_credit_limits
corporate_invoices
corporate_invoice_items
corporate_payments


CASH
────────────────────────────────────

cash_collections
cash_settlements
cash_disputes


FX
────────────────────────────────────

fx_quotes
fx_rates
fx_conversions


TAX
────────────────────────────────────

tax_rules
tax_calculations


SETTLEMENT
────────────────────────────────────

settlements
settlement_items

reconciliation_runs
reconciliation_items
```

---

# 62. The most important separation

I'd make these **four layers** non-negotiable:

```text
┌────────────────────────────────────────────┐
│  1. BUSINESS RULES                        │
│                                             │
│  Fare / Promo / Commission / Incentive     │
│  Subscription / Corporate / Tax / FX      │
└──────────────────────┬─────────────────────┘
                       ▼
┌────────────────────────────────────────────┐
│  2. PAYMENT ORCHESTRATION                 │
│                                             │
│  PSP selection / idempotency / retries     │
│  payment / refund / transfer               │
└──────────────────────┬─────────────────────┘
                       ▼
┌────────────────────────────────────────────┐
│  3. FINANCIAL TRANSACTION                  │
│                                             │
│  What financial event happened?            │
└──────────────────────┬─────────────────────┘
                       ▼
┌────────────────────────────────────────────┐
│  4. DOUBLE-ENTRY LEDGER                    │
│                                             │
│  Where does the money belong?              │
└────────────────────────────────────────────┘
```

This is what allows you to add future features **without rewriting the ledger**.

---

## 63. What I would build first in your actual Node.js project

Given your stack, I would **not jump directly into controllers**.

I'd implement the system in this order:

```text
PHASE A
────────────────────────
Money abstraction
Currency
Financial transaction
Ledger account
Ledger transaction
Ledger entry
Double-entry validator


PHASE B
────────────────────────
Payment provider interface
PSP router
Razorpay adapter
Cashfree adapter
Mock adapter
Idempotency
Webhook framework


PHASE C
────────────────────────
Payment intent
Payment attempt
Payment capture
Payment failure
Payment reconciliation


PHASE D
────────────────────────
Ride fare breakdown
Commission
Driver earning
Driver payable
Wallet/credit
Promo


PHASE E
────────────────────────
Refund
Reversal
Chargeback
Dispute


PHASE F
────────────────────────
Driver KYC/payment profile
Payout
Transfer
Scheduled payout
Negative balance


PHASE G
────────────────────────
Subscription
Corporate billing
Corporate invoice


PHASE H
────────────────────────
Cash
Incentives
FX
Tax
Multi-country


PHASE I
────────────────────────
Settlement
Reconciliation
Financial reporting
Audit
Risk/fraud


PHASE J
────────────────────────
Load testing
Failure testing
Disaster recovery
Security testing
Financial invariant testing
```

At the end, your **ride application doesn't actually need to know which PSP handled the payment**.

It can simply do:

```ts
const payment = await paymentService.createRidePayment({
  rideId,
  riderId,
  amount,
  currency,
});
```

And internally:

```text
PaymentService
     ↓
PaymentOrchestrator
     ↓
PSPRouter
     ↓
Razorpay / Cashfree / Stripe / ...
     ↓
Payment
     ↓
FinancialTransaction
     ↓
Ledger
     ↓
Driver Payable
     ↓
Payout
```

That is the architecture I would use if the goal is to build this as a **real payment platform inside the rideshare backend**, rather than just integrating a payment gateway.

The next practical step should be to turn this architecture into the **actual PostgreSQL/Drizzle schema**, including all primary keys, foreign keys, enums, indexes, unique constraints, monetary `BIGINT` fields, transaction isolation, and the exact relationships between `payments → financial_transactions → ledger → driver_earnings → payouts`.

Viewed payment.md:1-800
Viewed payment.md:801-1600
Viewed payment.md:1601-2309
Listed directory src
Listed directory modules
Listed directory ledger
Listed directory payment
Listed directory gateways
Listed directory adapters
Listed directory ride-payment
Listed directory wallet
Listed directory corporate
Listed directory payout
Listed directory reconciliation
Listed directory backend_v2
Listed directory drizzle
Listed directory schema
Viewed ledger.service.js:1-100
Viewed payment-orchestrator.service.js:1-100
Viewed payment-orchestrator.service.js:101-200
Viewed ride-payment.service.js:1-80
Viewed wallet.service.js:1-60
Viewed payout.service.js:1-60
Viewed corporate.service.js:1-60
Listed directory tax
Listed directory fx
Listed directory cash
Listed directory promo
Listed directory subscription
Listed directory driver
Listed directory refund
Listed directory dispute

Yes, the payment features described in [payment.md](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/new-featurs-docs/payment.md) are **implemented in your codebase**. The architecture follows the double-entry ledger, multi-source payment orchestration, and modular domain design specified in the document.

---

### Detailed Feature Availability & Code Mapping

| # | Feature / Module in [payment.md](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/new-featurs-docs/payment.md) | Status | Implemented In Backend Codebase |
|---|---|---|---|
| **1** | **Universal Double-Entry Ledger** (Debit/Credit balance invariants, chart of accounts, system accounts) | Available | - [ledger.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/ledger/ledger.service.js)<br>- [ledger-accounts.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/ledger-accounts.js)<br>- [ledger-transactions.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/ledger-transactions.js)<br>- [ledger-entries.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/ledger-entries.js) |
| **2** | **Financial Transactions Abstraction** (`RIDE_PAYMENT`, `WALLET_TOPUP`, `REFUND`, `CORPORATE_INVOICE`, etc.) | Available | - [financial-transaction.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/ledger/financial-transaction.service.js)<br>- [financial-transactions.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/financial-transactions.js) |
| **3** | **Payment Orchestrator & Split-Tender Allocation** (Wallet + Promo + PSP + Corporate split payments) | Available | - [payment-orchestrator.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/payment/payment-orchestrator.service.js)<br>- [payment-sources.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/payment-sources.js)<br>- [payment-allocations.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/payment-allocations.js) |
| **4** | **Payment Gateway Adapters & Routing** (Razorpay, Stripe, fallback router) | Available | - [razorpay.gateway.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/payment/gateways/razorpay.gateway.js)<br>- [stripe.gateway.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/payment/gateways/stripe.gateway.js)<br>- [payment-provider-routes.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/payment-provider-routes.js) |
| **5** | **Wallets & Credits** (Rider/driver wallets, balances, transactions, withdrawals) | Available | - [wallet.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/wallet/wallet.service.js)<br>- [wallets.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/wallets.js)<br>- [wallet-transactions.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/wallet-transactions.js) |
| **6** | **Promotions & Promo Credits** (Rules engine, percentage/fixed discounts, credits) | Available | - [promo.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/promo/promo.service.js)<br>- [promos.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/promos.js)<br>- [promotion-rules.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/promotion-rules.js) |
| **7** | **Driver Incentives & Earnings** (Target rides, milestone progress, bonus payouts) | Available | - [driver-incentive.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/driver/driver-incentive.service.js)<br>- [driver-incentives.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/driver-incentives.js)<br>- [driver-earnings.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/driver-earnings.js) |
| **8** | **Corporate Billing & Invoicing** (Corporate accounts, user limits, exposure check, invoice generation, post-ride settlement) | Available | - [corporate.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/corporate/corporate.service.js)<br>- [corporate-accounts.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/corporate-accounts.js)<br>- [corporate-invoices.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/corporate-invoices.js) |
| **9** | **Cash Ride Flow & Disputes** (Cash collection tracking, mismatch handling, driver ledger offset) | Available | - [cash.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/cash/cash.service.js)<br>- [cash-collections.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/cash-collections.js)<br>- [cash-disputes.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/cash-disputes.js) |
| **10** | **Scheduled & Batch Driver Payouts** (Eligibility validation, batch processing, bank transfers, payout schedules) | Available | - [payout.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/payout/payout.service.js)<br>- [payout-schedules.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/payout-schedules.js)<br>- [payouts.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/payouts.js) |
| **11** | **Subscriptions** (Driver & Rider subscription plans, cycles, recurring status) | Available | - [subscription.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/subscription/subscription.service.js)<br>- [subscriptions.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/subscriptions.js)<br>- [rider-subscriptions.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/rider-subscriptions.js) |
| **12** | **Multi-Country, Currencies, Tax & FX** (Legal entities, countries, minor-unit money handling, tax calculations, FX rate quotes) | Available | - [tax-engine.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/tax/tax-engine.service.js)<br>- [fx.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/fx/fx.service.js)<br>- [countries.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/countries.js)<br>- [currencies.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/currencies.js) |
| **13** | **Refunds, Reversals & Disputes** (Ride payment refunds, dispute resolutions, chargebacks) | Available | - [refund.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/refund/refund.service.js)<br>- [dispute.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/dispute/dispute.service.js)<br>- [refunds.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/refunds.js) |
| **14** | **Reconciliation & Accounting Periods** (Gateway settlement comparison, mismatch resolution, financial close) | Available | - [reconciliation.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/reconciliation/reconciliation.service.js)<br>- [reconciliation-runs.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/reconciliation-runs.js)<br>- [accounting-periods.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/accounting-periods.js) |

---

### Summary
The system has all 14 core sub-domains and database schemas matching the architecture designed in [payment.md](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/new-featurs-docs/payment.md). All monetary amounts are handled in minor units (e.g. integer paise/cents) and balanced through `ledger.service.js`.