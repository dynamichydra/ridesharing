Yes. If you want a **production-grade Uber-like rideshare application**, the rider side is much larger than just “create ride → match driver → pay.”

For a complete system, I would divide **Rider Features** into the following modules.

## 1. Rider Account & Authentication

### Registration

* Phone number registration
* Email registration
* OTP verification
* Email verification
* Login/logout
* Password/PIN where applicable
* Forgot password
* Change phone number
* Change email
* Account recovery
* Device registration
* Multiple logged-in devices
* Session management
* Force logout from all devices
* Suspicious-login detection
* Account lock/unlock
* Delete account
* Account deactivation/reactivation

### Rider Profile

* First name
* Last name
* Profile photo
* Phone
* Email
* Date of birth where required
* Preferred language
* Preferred currency
* Country
* Emergency contact
* Accessibility preferences
* Communication preferences

---

# 2. Rider Home Screen

The rider should be able to:

* Detect current location
* Select pickup location
* Select destination
* Search destination
* Map interaction
* Move pickup pin
* Confirm pickup
* Save current location
* Recent locations
* Home
* Work
* Favorites
* Saved places
* Search by:

  * Address
  * Place name
  * Business
  * Landmark
* Current location accuracy indicator
* GPS permission handling
* Location permission fallback
* Offline/no-GPS handling

---

# 3. Service/Ride Type Selection

Your backend should support configurable ride products.

Example:

* Economy
* Premium
* Comfort
* XL
* SUV
* Luxury
* Motorcycle
* Taxi
* Electric vehicle
* Accessible vehicle
* Women-preferred service where legally/operationally supported
* Pet-friendly
* Child-seat service
* Scheduled ride
* Airport ride

Each service should have configurable:

* Capacity
* Minimum fare
* Base fare
* Per-km fare
* Per-minute fare
* Booking fee
* Cancellation fee
* Waiting fee
* Surge multiplier
* Commission
* Taxes
* Toll handling
* Eligibility
* Vehicle requirements
* Driver requirements
* Availability by city/zone

---

# 4. Fare Estimation

Before booking, rider should see:

* Estimated fare
* Fare range where applicable
* Estimated distance
* Estimated duration
* Base fare
* Distance charge
* Time charge
* Booking/platform fee
* Taxes
* Toll estimate
* Surge/dynamic pricing
* Discounts
* Promo deduction
* Wallet/credit deduction
* Final estimated payable amount

Important:

**Fare estimation and final fare should be separate concepts.**

The final fare can change because of:

* Actual route
* Waiting
* Toll
* Route deviation
* Extra stops
* Cancellation
* Additional distance
* Additional time
* Pricing rules

---

# 5. Ride Booking

### Immediate Ride

Flow:

```text
Pickup
   ↓
Destination
   ↓
Ride Type
   ↓
Fare Estimate
   ↓
Payment Method
   ↓
Promo
   ↓
Confirm Ride
   ↓
Driver Matching
```

Features:

* Confirm ride
* Cancel before matching
* Driver matching status
* Matching timeout
* Retry matching
* No-driver handling
* Alternative ride types
* Price changes before confirmation
* Booking failure handling

---

# 6. Scheduled Rides

Very important for an Uber-like system.

Rider should be able to:

* Schedule ride
* Select date
* Select time
* Select pickup
* Select destination
* Select ride type
* Select payment method
* View scheduled rides
* Edit scheduled ride
* Cancel scheduled ride
* Reschedule
* Receive reminders
* Driver assignment before pickup where supported
* Driver reassignment
* Scheduled ride cancellation handling
* No-driver handling

You should distinguish:

```text
scheduled_ride
```

from:

```text
active_ride
```

rather than treating them as the same record.

---

# 7. Multiple Stops

Rider can:

* Add stop
* Remove stop
* Reorder stops
* Edit stops
* Add stop during ride
* Calculate updated fare
* Calculate updated ETA

Example:

```text
Home
 ↓
Airport
 ↓
Hotel
```

Backend should maintain the complete stop history.

---

# 8. Driver Matching Experience

Rider needs a real-time experience while matching.

Statuses:

```text
REQUESTED
SEARCHING_DRIVER
DRIVER_OFFERED
DRIVER_ACCEPTED
DRIVER_ARRIVING
DRIVER_ARRIVED
TRIP_STARTED
TRIP_COMPLETED
CANCELLED
```

Rider sees:

* Searching animation
* Driver assigned
* Driver name
* Driver photo
* Driver rating
* Vehicle
* Vehicle color
* Vehicle model
* License plate
* Driver location
* Driver ETA
* Pickup ETA

---

# 9. Real-Time Driver Tracking

After driver accepts:

* Driver GPS location
* Driver movement on map
* ETA
* Distance from rider
* Route
* Driver arrival notification
* Driver arrived notification

Use:

```text
WebSocket / Socket.IO
```

for real-time updates rather than repeatedly polling the API.

Redis can be used for:

* Driver location state
* Active ride state
* Pub/Sub
* Socket scaling

---

# 10. Driver Contact

Rider should be able to:

* Call driver
* Chat with driver
* Send predefined messages
* Share pickup instructions
* Mask phone numbers
* Contact driver after trip for lost items

Examples:

```text
"I'm at the main entrance"
"I'm wearing a blue shirt"
"Please wait near Gate 2"
```

---

# 11. Ride PIN / OTP

Very important for ride security.

Example:

```text
Rider PIN: 4821
```

Driver must enter the PIN before starting the trip.

Backend validates:

```text
driver_id
ride_id
pickup
ride_status
ride_pin
```

Then:

```text
TRIP_STARTED
```

---

# 12. Pickup Experience

Rider should be able to:

* See driver approaching
* Modify pickup location before arrival
* Send pickup instructions
* Share exact pickup point
* Confirm driver identity
* Verify vehicle
* Verify license plate
* Verify driver photo
* Use pickup notes

Special pickup locations:

* Airport
* Mall
* Stadium
* Railway station
* Hotel
* Apartment
* University
* Business campus

These may require **pickup zones / geofences**.

---

# 13. Ride In Progress

During the trip:

* Live driver location
* Current route
* ETA
* Remaining distance
* Destination
* Stops
* Trip status
* Fare estimate
* Safety button
* Share trip
* Contact driver
* Emergency assistance
* Add/edit stop
* Report issue
* Cancel ride
* Route deviation detection

---

# 14. Ride Sharing / Trip Sharing

Rider can share live trip information with another person.

Shared information:

* Rider name
* Driver name
* Driver photo
* Vehicle
* License plate
* Pickup
* Destination
* Live location
* ETA
* Trip status

Example:

```text
Share trip → WhatsApp
Share trip → SMS
Share trip → Link
```

---

# 15. Safety Features

This should be treated as a separate major subsystem.

### Emergency

* SOS button
* Emergency contact
* Emergency call
* Safety center
* Location sharing
* Trip sharing
* Incident reporting

### Ride Safety

* Driver verification
* Vehicle verification
* PIN verification
* Route monitoring
* Unexpected route deviation detection
* Long-stop detection
* Trip anomaly detection
* Ride cancellation safety flow
* Suspicious behavior detection
* Post-trip safety report

### Privacy

* Masked phone number
* Limited driver/rider personal information
* Secure communication
* Location privacy

---

# 16. Payment Methods

Rider should support multiple payment methods.

Depending on country:

* Credit card
* Debit card
* UPI
* Wallet
* Bank account
* Apple Pay
* Google Pay
* Cash
* Corporate account
* Prepaid balance
* Ride credits

Payment methods:

```text
Add
Remove
Set default
Verify
Expire
Replace
```

---

# 17. Rider Wallet

Wallet should support:

* Current balance
* Add money
* Wallet transaction history
* Refunds
* Promotional credits
* Ride credits
* Gift credits
* Wallet expiration rules
* Wallet restrictions
* Partial wallet payment
* Wallet + card payment
* Wallet + cash where applicable

Don't treat promotional credits as normal cash.

For example:

```text
CASH_BALANCE
PROMO_CREDIT
REFUND_BALANCE
GIFT_CREDIT
```

should be logically separated.

---

# 18. Promotions

Rider features:

* Enter promo code
* Apply promo
* Remove promo
* Automatically apply best promotion
* Promo history
* Referral coupons
* New-user promotion
* City-specific promotion
* Ride-type promotion
* Time-based promotion
* Payment-method promotion
* First-ride promotion
* Campaign discounts

Backend should validate:

```text
promo
rider
city
zone
ride_type
payment_method
date
time
minimum_fare
maximum_discount
usage_limit
user_usage_limit
```

---

# 19. Subscription / Membership

Uber-like application should support rider membership.

Example:

```text
Rider Membership
```

Features:

* Browse plans
* Subscribe
* Upgrade
* Downgrade
* Cancel
* Renew
* Auto-renew
* Membership benefits
* Membership history

Benefits could include:

* Discounted rides
* Reduced booking fees
* Priority support
* Cancellation benefits
* Priority matching
* Special promotions

---

# 20. Receipts & Invoices

After every completed ride:

* Digital receipt
* Fare breakdown
* Payment information
* Driver information
* Trip information
* Tax information
* Invoice number
* Download invoice
* Email receipt

For business/corporate riders:

* GST/VAT information
* Company name
* Company address
* Tax ID
* Business invoice

---

# 21. Ride History

Rider should have:

```text
Past
Upcoming
Cancelled
```

Each ride contains:

* Ride ID
* Date/time
* Pickup
* Destination
* Stops
* Driver
* Vehicle
* Fare
* Payment method
* Discount
* Rating
* Receipt
* Invoice
* Trip route
* Status

---

# 22. Rating & Review

After ride:

### Rider rates driver

```text
1–5 stars
```

Additional:

* Compliment
* Comment
* Safety complaint
* Vehicle complaint
* Driving complaint
* Cleanliness
* Professionalism

Examples:

```text
Great driver
Clean car
Safe driving
Friendly
Good communication
```

Rating should be configurable by city/country/product.

---

# 23. Driver Tip

Depending on market/payment rules:

* Tip after ride
* Tip percentage
* Custom tip
* Skip tip
* Tip later
* Tip history

Important:

Tip should be a **separate financial transaction**, not simply part of the ride fare.

---

# 24. Cancellation

Rider can cancel:

### Before driver acceptance

Usually free.

### After driver acceptance

Potential cancellation fee.

### After driver arrival

Potential cancellation fee.

### During trip

Different cancellation rules.

System should capture:

```text
cancelled_by = RIDER
cancel_reason
cancelled_at
ride_status
fee
fee_rule
```

Cancellation reasons:

* Driver too far
* Driver asked me to cancel
* Changed plans
* Wrong pickup
* Long wait
* Wrong vehicle
* Safety concern
* Other

---

# 25. Refunds & Disputes

Rider should be able to request:

* Full refund
* Partial refund
* Wrong fare
* Duplicate charge
* Cancellation fee dispute
* Driver issue
* Payment failure
* Promo issue
* Missing item
* Safety issue

Support workflow:

```text
Ride
 ↓
Issue
 ↓
Support Ticket
 ↓
Investigation
 ↓
Adjustment
 ↓
Refund/Credit
```

---

# 26. Lost & Found

Very important.

After ride:

```text
I lost something
```

Rider selects:

* Phone
* Wallet
* Bag
* Documents
* Keys
* Other

Then:

```text
Ride → Driver → Contact → Recovery
```

Possible workflow:

```text
OPEN
DRIVER_CONTACTED
FOUND
RETURNING
RETURNED
CLOSED
```

---

# 27. Customer Support

Rider should have:

* Help center
* FAQ
* Ride-specific support
* Payment support
* Account support
* Safety support
* Lost & found
* Chat support
* Email support
* Phone support where applicable
* Ticket creation
* Ticket history
* Ticket status

Example:

```text
Help
 ├── My rides
 ├── Payment
 ├── Account
 ├── Safety
 ├── Lost item
 └── Other
```

---

# 28. Saved Places

Rider can save:

```text
Home
Work
Gym
School
Airport
Custom place
```

Each:

```text
name
latitude
longitude
address
place_id
pickup_instructions
```

---

# 29. Favorites

Rider can maintain:

* Favorite destinations
* Favorite drivers where supported
* Favorite ride types
* Favorite payment method

---

# 30. Notifications

Push notifications:

### Ride

* Ride requested
* Driver found
* Driver accepted
* Driver arriving
* Driver arrived
* Ride started
* Ride completed
* Ride cancelled

### Payment

* Payment successful
* Payment failed
* Refund issued
* Wallet credited
* Wallet debited

### Promotion

* New promotion
* Coupon expiring
* Membership benefits

### Safety

* Trip shared
* Emergency event
* Safety notification

Also:

* SMS
* Email
* Push
* In-app notifications

Notification preferences should be configurable.

---

# 31. Referral System

Rider can:

* Get referral code
* Share referral link
* Invite friends
* Track referrals
* Earn rewards
* View referral history

Backend should prevent:

* Self-referral
* Multiple fake accounts
* Device abuse
* Payment abuse
* Referral farming

---

# 32. Corporate Rider

For a production platform, don't ignore this.

Corporate rider features:

* Business profile
* Company account
* Employee account
* Business payment method
* Corporate wallet
* Cost center
* Department
* Expense code
* Business/private ride selection
* Corporate ride policy
* Monthly invoices
* Tax invoices
* Ride reports
* Employee ride history
* Spending limits

---

# 33. Family / Multiple Rider Profiles

Useful advanced feature.

A primary account could manage:

```text
Me
Family Member
Child
Parent
Employee
```

Features:

* Book for another person
* Add passenger
* Select passenger
* Pay for another passenger
* Share trip
* Notifications
* Family spending limits

---

# 34. Book for Someone Else

Rider should be able to enter:

```text
Passenger name
Passenger phone
Pickup
Destination
```

The passenger receives:

* Driver details
* Vehicle details
* Trip information
* Live tracking
* Safety information

---

# 35. Accessibility

Support:

* Wheelchair-accessible rides
* Accessibility preferences
* Visual accessibility
* Hearing accessibility
* Special pickup instructions
* Service animal requirements
* Large text
* Screen reader support

Exact features depend on your market and legal requirements.

---

# 36. Airport Features

Airport rides need specialized logic.

Rider should see:

* Airport
* Terminal
* Pickup zone
* Gate/door
* Flight number
* Arrival/departure
* Flight tracking
* Driver waiting rules
* Airport fees
* Airport pickup instructions

Example:

```text
Airport
 ↓
Terminal 2
 ↓
Door 5
 ↓
Pickup Zone B
```

---

# 37. Location & Geofence Features

Rider experience depends heavily on your service-area system.

Before ride creation:

```text
Pickup inside service area?
Destination supported?
Ride type available?
```

Possible restrictions:

```text
CITY
ZONE
AIRPORT
SERVICE_AREA
GEOFENCE
```

Rider should receive clear messages such as:

> Rides are not currently available in this area.

---

# 38. Rider Preferences

Examples:

* Preferred language
* Preferred temperature
* Quiet ride
* Music preference
* Accessibility
* Pet preference
* Child seat
* Communication preference

Not every preference needs to be supported in every ride product.

---

# 39. Privacy & Data Management

Rider should be able to:

* View personal data
* Download personal data
* Delete account
* Manage consent
* Manage marketing preferences
* Manage location permissions
* Manage notification permissions
* Manage connected devices
* View login sessions

---

# 40. Fraud & Abuse Protection

This is critical for a production application.

Rider-side fraud detection:

* Multiple accounts
* Device fingerprint
* IP risk
* Card fraud
* Promo abuse
* Referral abuse
* Chargeback abuse
* Fake GPS
* Suspicious booking patterns
* Excessive cancellations
* Account takeover
* Payment velocity checks

Don't put all fraud logic inside the rider API.

Create a dedicated:

```text
Risk / Fraud Service
```

---

# 41. Rider State Machine

I strongly recommend implementing a proper state machine.

Example:

```text
IDLE
 ↓
RIDE_REQUESTED
 ↓
SEARCHING_DRIVER
 ↓
DRIVER_ASSIGNED
 ↓
DRIVER_ARRIVING
 ↓
DRIVER_ARRIVED
 ↓
TRIP_STARTED
 ↓
TRIP_IN_PROGRESS
 ↓
TRIP_COMPLETED
 ↓
PAYMENT_PENDING
 ↓
PAYMENT_COMPLETED
 ↓
RATING_PENDING
 ↓
COMPLETED
```

Cancellation paths should be explicitly defined from each valid state.

---

# 42. Rider Backend Modules

For your Node.js backend, I would structure rider functionality approximately like this:

```text
src/
├── modules/
│
├── auth/
├── users/
├── riders/
├── rider-profiles/
├── rider-preferences/
├── devices/
├── locations/
├── places/
├── saved-places/
│
├── service-types/
├── service-areas/
├── cities/
├── zones/
├── geofences/
│
├── rides/
├── scheduled-rides/
├── ride-stops/
├── ride-state/
├── ride-tracking/
├── driver-matching/
│
├── pricing/
├── surge/
├── promotions/
├── coupons/
│
├── payments/
├── payment-methods/
├── wallet/
├── credits/
├── refunds/
├── invoices/
│
├── subscriptions/
├── memberships/
├── referrals/
│
├── ratings/
├── tips/
│
├── safety/
├── emergency/
├── trip-sharing/
│
├── support/
├── complaints/
├── lost-found/
│
├── corporate/
├── family/
├── notifications/
│
└── fraud/
```

---

# 43. Rider Database Domain

At minimum, expect entities around:

```text
users
riders
rider_profiles
rider_preferences
rider_devices
rider_sessions

saved_places
favorite_places
recent_places

rides
ride_stops
ride_status_history
ride_locations
ride_events

scheduled_rides

service_types
service_areas
cities
zones
geofences

fare_quotes
fare_breakdowns
pricing_rules
surge_rules

payment_methods
payments
payment_transactions
wallets
wallet_transactions
credits
refunds
invoices

promos
promo_redemptions
referrals
referral_rewards

subscriptions
subscription_plans
subscription_transactions

ratings
rating_tags
tips

emergency_contacts
safety_events
trip_shares

support_tickets
support_messages
complaints
lost_items

corporate_accounts
corporate_riders
corporate_rides

notifications
notification_preferences

fraud_events
risk_scores
```

---

# 44. Most Important Architecture Point

Don't build the rider application as one giant `ride` module.

Think of the ride as the **central business object**, with other domains attached to it:

```text
                       ┌── Pricing
                       │
                       ├── Matching
                       │
RIDER ──────── RIDE ───┼── Tracking
                       │
                       ├── Payment
                       │
                       ├── Safety
                       │
                       ├── Support
                       │
                       ├── Rating
                       │
                       └── Notifications
```

And keep these concepts separate:

```text
Ride
Fare
Payment
Wallet
Promotion
Driver Matching
Tracking
Safety
Support
Rating
```

That separation will make your system much easier to scale and modify.

---

## Recommended Rider MVP → Production Roadmap

### Phase 1 — Core

* Authentication
* Rider profile
* Location
* Pickup/destination
* Service availability
* Fare estimation
* Ride request
* Driver matching
* Driver tracking
* Ride lifecycle
* Payment
* Ride history
* Rating
* Notifications

### Phase 2 — Production

* Scheduled rides
* Multiple stops
* Promo
* Wallet
* Refund
* Cancellation rules
* Support
* Safety
* Trip sharing
* Lost & found
* Multiple payment methods
* Invoice

### Phase 3 — Advanced

* Subscription
* Referral
* Corporate
* Family
* Book for someone else
* Airport
* Accessibility
* Advanced promotions
* Rider credits
* Advanced fraud detection
* Dynamic pricing
* Loyalty

### Phase 4 — Uber-level

* Multi-city
* Multi-country
* Multi-currency
* Multi-PSP
* Tax engine
* Corporate billing
* Advanced risk engine
* Real-time pricing
* Demand/supply analytics
* Experiment/A-B testing
* ML-based fraud
* ML-based matching
* ML-based ETA
* ML-based demand prediction
* Driver incentives
* Rider loyalty
* Marketplace optimization

**For your Node.js + PostgreSQL + Redis architecture, I would design the rider system around these core bounded contexts first: `Rider → Location → Service Area → Ride → Pricing → Matching → Tracking → Payment → Safety → Support`.** That gives you a solid foundation for adding the driver, admin, pricing, and payment systems without having to redesign the ride lifecycle later.

Yes. You need a **“Book a Ride for Someone Else” / “Guest Passenger”** feature.

This is an important rider feature and should be designed as a first-class capability, not just a note field.

### Rider flow

```text
Rider
  ↓
Choose Pickup
  ↓
Choose Destination
  ↓
Choose "Someone else"
  ↓
Enter Passenger Details
  ├── Name
  ├── Phone number
  └── Optional: country code
  ↓
Choose Ride Type
  ↓
Choose Payment Method
  ↓
Confirm Ride
  ↓
Driver Matching
  ↓
Driver Assigned
  ↓
Passenger receives ride details
```

### Passenger types

You can support:

* **Myself**
* **Someone else**
* Saved contacts
* Family member
* Guest
* Employee/corporate passenger

### Passenger information

Create a separate ride passenger concept:

```text
ride_passenger
----------------
id
ride_id
rider_id
passenger_type       // SELF | OTHER
name
phone_country_code
phone_number
email
is_primary
created_at
updated_at
```

Don't overwrite the actual `rider` record when somebody else is traveling.

For example:

```text
Rider:
Subrata

Passenger:
Rahul

Payment:
Subrata's card

Driver:
Assigned driver
```

The ride therefore has **three different roles**:

```text
BOOKED_BY  → Subrata
PASSENGER  → Rahul
DRIVER     → Assigned driver
```

### What the passenger should receive

If the passenger has your app:

* Push notification
* Driver assigned
* Driver name
* Driver photo
* Vehicle
* License plate
* Driver ETA
* Pickup location
* Destination
* Live trip tracking
* Driver contact
* Safety/SOS options

If the passenger does **not** have your app:

* SMS with ride information
* Secure tracking link
* Driver information
* Vehicle information
* Pickup information
* ETA
* Support/contact option

### Important backend distinction

I recommend modeling this as:

```text
ride
├── booked_by_rider_id
├── passenger_id
├── driver_id
├── pickup
├── destination
├── payment
└── status
```

Where:

```text
booked_by_rider_id = person who requested/paid
passenger_id       = person actually taking the ride
driver_id          = person driving
```

This also makes future features much easier:

```text
Book for myself
Book for family
Book for friend
Book for employee
Book for customer
Book for child
Book for guest
```

### Very important security consideration

For a ride booked for someone else, the **passenger should receive a secure ride token/link**, but you should not expose internal `ride_id` directly in a public URL.

Use something like:

```text
GET /public/trips/{secure_token}
```

The token should be:

* Random
* Non-sequential
* Expirable
* Revocable
* Limited to that trip
* Rate-limited

### Also add "Book for Someone Else" to your rider feature list

I would categorize it as:

**Rider → Ride Booking → Book for Someone Else**

with:

* Book for myself
* Book for someone else
* Passenger profile
* Saved passengers
* Passenger notification
* Passenger live tracking
* Passenger driver contact
* Passenger safety
* Passenger ride history
* Passenger cancellation handling
* Passenger support
* Payment by booking rider
* Receipt/invoice sent to booking rider

This is the correct foundation if you want the feature to work like a real production rideshare platform.
