Listed directory admin
Viewed admin.routes.js:1-48
Viewed server.js:1-100

To ensure the ridesharing platform functions properly and smoothly from end-to-end, an **Administrator** needs to configure and maintain several core operational pillars:

---

### 1. Geographic & Operational Zones Setup
Before riders and drivers can interact, the platform needs defined operational territories:
* **Countries, States & Cities** (`/api/v1/geo`): Create and activate the supported countries, states, and target cities.
* **Geofenced Service Zones** (`/api/v1/zones`): Define boundary polygons for:
  - **Operational Zones**: Where pickups and drop-offs are permitted.
  - **Restricted Zones / No-Go Areas**: Geofenced zones where pickups/drop-offs are blocked.
  - **Airport / Special Queues**: FIFO dispatch queue boundaries for airport hubs.

---

### 2. Fleet & Vehicle Categories
The booking engine and dispatch system require active vehicle types:
* **Vehicle Types** (`/api/v1/vehicle-types`): Define categories (e.g., *Bike, Auto, Economy / Hatchback, Sedan, XL / SUV, Wheelchair accessible*) along with their seating capacities.
* **Vehicle Models** (`/api/v1/vehicle-models`): Register supported vehicle makes and models linked to vehicle types.

---

### 3. Pricing, Fare & Tax Rules Configuration
The fare engine cannot compute ride estimates without active pricing rules:
* **Base Fare & Rates** (`/api/v1/fare`):
  - Base fare (flag drop).
  - Per-kilometer rate and per-minute rate (including traffic wait time).
  - Minimum trip fare and cancellation fees.
* **Taxes & Surcharges**: Configure applicable GST/VAT tax rules and airport/toll surcharges.
* **Commission Rules** (`/api/v1/commission-rules`): Set the platform's commission percentage (e.g., 15–20%) deducted from completed trips.
* **Promotions / Discounts** (`/api/v1/promos`): Create active coupon codes, referral bonuses, and maximum discount limits.

---

### 4. Driver Onboarding, Document Approval & Payout Verification
Drivers cannot go online or receive offers until an Admin approves their profiles:
1. **Document Types** (`/api/v1/documents`): Define mandatory requirements (Driver's License, Vehicle RC, Insurance, Background Check, ID/Aadhaar).
2. **Review & Approve Applications**:
   - Inspect uploaded documents and vehicle registration.
   - Change driver status to **`Approved`** (reject or request re-upload if documents are unclear or expired).
3. **Approve Bank / Payout Details** (`/api/v1/admin/payout-accounts`): Verify driver bank accounts (or Stripe Connect / RazorpayX linkage) so trip payouts can be processed.

---

### 5. Notification Templates & Comms
* **Notification Templates** (`/api/v1/notification-templates`): Ensure transactional SMS, Push (FCM), and Email templates are configured for:
  - OTP verification codes.
  - Ride matched / Driver arriving / Ride started.
  - Invoices and ride receipts.
  - Emergency SOS triggers.

---

### 6. Background Services & Infrastructure Health
Ensure backend workers and microservices are healthy:
* **Redis Instance**: Running and responsive for real-time driver geo-indexing (H3 / Geospatial), candidate locks, and surge caching.
* **Kafka Event Bus**: Message queues and consumer workers running for asynchronous events (audit logs, trip billing, notifications).
* **Scheduled Background Jobs**:
  - `matching-reconciliation.job.js`: Cleans up abandoned or stuck dispatch searches.
  - `finalize-trip.job.js`: Computes exact GPS routes and final distance.
  - Payout and wallet reconciliation jobs.

---

### 7. Day-to-Day Monitoring & Safety Operations
* **Live Heatmap & Matching Analytics** (`/api/v1/admin/analytics/supply-demand-heatmap`): Monitor real-time supply vs. demand in cities to spot driver shortages.
* **Dispute & Refund Management** (`/api/v1/disputes`, `/api/v1/refunds`): Review rider overcharge complaints, route deviation disputes, or driver cancellation penalties.
* **Emergency / SOS Alerts** (`/api/v1/emergency`): Monitor safety triggers and live trip sharing alerts from riders or drivers.