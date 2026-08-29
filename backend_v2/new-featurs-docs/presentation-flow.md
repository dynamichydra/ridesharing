Listed directory schema
Listed directory geo

Here is the **exact, strictly sequential step-by-step master data to end-to-end trip execution checklist**. 

Every step lists **where to execute it (Portal vs. Postman)**, its **dependencies**, and the **exact data required**.

---

# 🗺️ Phase 1: Geographic & Location Master Data

### **Step 1: Create Currency**
* **Where:** **Portal** (`/geo/currencies`) or **Postman** (`POST /api/v1/geo/currencies`)
* **Dependencies:** None (Absolute root master).
* **Data to Enter:** `Code` (e.g. `USD`, `INR`), `Symbol` (`$`, `₹`), `Name` (US Dollar), `Exchange Rate`, `Is Active` = `true`.
* **Why:** All countries, fare pricing, wallets, and subscriptions require a valid currency reference.

---

### **Step 2: Create Country**
* **Where:** **Portal** (`/geo/countries`) or **Postman** (`POST /api/v1/geo/countries`)
* **Dependencies:** `currency_id` (from Step 1).
* **Data to Enter:** `Name` (e.g. United States), `ISO Code 2/3` (`US`/`USA`), `Phone Code` (`+1`), `Default Currency`, `Status` = `ACTIVE`.
* **Why:** Controls phone validation, regional compliance, and driver onboarding rules.

---

### **Step 3: Create State / Province**
* **Where:** **Portal** (`/geo/states`) or **Postman** (`POST /api/v1/geo/states`)
* **Dependencies:** `country_id` (from Step 2).
* **Data to Enter:** `Name` (e.g. California / Maharashtra), `State Code` (`CA` / `MH`), `Status` = `ACTIVE`.
* **Why:** Categorizes cities and regional legal regulations.

---

### **Step 4: Create City**
* **Where:** **Portal** (`/geo/cities`) or **Postman** (`POST /api/v1/geo/cities`)
* **Dependencies:** `country_id` (Step 2), `state_id` (Step 3).
* **Data to Enter:** `Name` (e.g. San Francisco / Mumbai), `Latitude`, `Longitude`, `Timezone` (`America/Los_Angeles`), `Status` = `ACTIVE`.
* **Why:** Cities are the operational hub for driver allocation and fare calculation.

---

### **Step 5: Create Service Area (Operational Boundary)**
* **Where:** **Portal** (`/geo/service-areas`) or **Postman** (`POST /api/v1/geo/service-areas`)
* **Dependencies:** `city_id` (from Step 4).
* **Data to Enter:** `Name` (e.g. "San Francisco Downtown & Metro"), `Coordinates/GeoJSON Polygon` (draw boundary on map), `Status` = `ACTIVE`.
* **Why:** Drivers can only receive bookings and go online inside defined service area polygons.

---

### **Step 6: Create Zones (Geofenced Surge / Airport Zones)**
* **Where:** **Portal** (`/zones`) or **Postman** (`POST /api/v1/zones`)
* **Dependencies:** `city_id` (Step 4), `service_area_id` (Step 5).
* **Data to Enter:** `Zone Name` (e.g. "SFO Airport Zone", "Tech Park Surge Zone"), `Zone Polygon`, `Surge Multiplier` (e.g. `1.2x`).
* **Why:** Applies automated surge pricing or airport pickup fees when pickup/drop falls within this polygon.

---

# 🚗 Phase 2: Fleet & Vehicle Master Data

### **Step 7: Create Vehicle Types (Categories)**
* **Where:** **Portal** (`/vehicle-types`) or **Postman** (`POST /api/v1/vehicle-types`)
* **Dependencies:** None.
* **Data to Enter:** 
  * `Bike / 2-Wheeler`: Capacity: `1`, Icon, `Status: ACTIVE`
  * `Auto / 3-Wheeler`: Capacity: `3`, Icon, `Status: ACTIVE`
  * `Sedan / 4-Wheeler`: Capacity: `4`, Luggage: `2`, `Status: ACTIVE`
  * `Premium SUV`: Capacity: `6`, Luggage: `4`, `Status: ACTIVE`
* **Why:** Used for rider vehicle selection, pricing tiers, and driver vehicle classification.

---

### **Step 8: Create Vehicle Makes & Models**
* **Where:** **Portal** (`/vehicle-models`) or **Postman** (`POST /api/v1/vehicle-models`)
* **Dependencies:** `vehicle_type_id` (from Step 7).
* **Data to Enter:** `Make` (e.g. Toyota, Hyundai, Honda), `Model` (Camry, Elantra, Civic), `Year`, `Vehicle Type ID`.
* **Why:** Standardizes vehicle selection during driver vehicle registration.

---

# 📄 Phase 3: Compliance, Legal & Onboarding Engine

### **Step 9: Create Document Types**
* **Where:** **Portal** (`/onboarding-config/document-types`) or **Postman** (`POST /api/v1/documents/types`)
* **Dependencies:** None.
* **Data to Enter:**
  1. *Driving License* (Requires Expiry Date: `true`, Requires Back Side: `true`)
  2. *Vehicle Registration Certificate (RC)*
  3. *Vehicle Insurance* (Requires Expiry Date: `true`)
  4. *Commercial Permit / Police Clearance*
* **Why:** Master list of all possible verification documents.

---

### **Step 10: Configure Document Requirements per Region & Vehicle**
* **Where:** **Portal** (`/onboarding-config/requirements`) or **Postman** (`POST /api/v1/documents/requirements`)
* **Dependencies:** `document_type_id` (Step 9), `country_id` (Step 2), `vehicle_type_id` (Step 7).
* **Data to Enter:** Assign which documents are `MANDATORY` or `OPTIONAL` for Sedan vs. Bike in a specific country/city.
* **Why:** Dynamically prompts only the required documents during driver sign-up.

---

### **Step 11: Create Legal Documents & Terms**
* **Where:** **Portal** (`/onboarding-config/legal`) or **Postman** (`POST /api/v1/legal/documents`)
* **Dependencies:** `country_id` (Step 2).
* **Data to Enter:** `Type` (`DRIVER_TERMS`, `RIDER_PRIVACY`), `Version` (`1.0`), `Content/HTML`, `Is Mandatory` = `true`.
* **Why:** Drivers and riders must digitally accept these before activation.

---

### **Step 12: Create Onboarding Questions (Optional Survey)**
* **Where:** **Portal** (`/onboarding-config/questions`) or **Postman** (`POST /api/v1/onboarding/questions`)
* **Dependencies:** `country_id` (Step 2).
* **Data to Enter:** "How many years of driving experience do you have?", "Do you own the vehicle?", Question Type (Single Choice / Number).

---

# 💰 Phase 4: Pricing, Monetization & Subscriptions

### **Step 13: Create Fare Rules**
* **Where:** **Portal** (`/fare-rules`) or **Postman** (`POST /api/v1/fare-rules`)
* **Dependencies:** `city_id` (Step 4), `vehicle_type_id` (Step 7).
* **Data to Enter:** 
  * `Base Fare`: `$5.00`
  * `Base Distance Included`: `2.0 km`
  * `Rate Per Km`: `$1.50`
  * `Rate Per Minute`: `$0.25`
  * `Minimum Fare`: `$8.00`
  * `Cancellation Fee`: `$3.00`
  * `Peak Multiplier` (e.g., 08:00–11:00 AM -> `1.25x`)
* **Why:** The automated pricing calculation engine uses this to calculate ride estimates and final invoices.

---

### **Step 14: Create Driver Subscription Plans (Zero-Commission Model)**
* **Where:** **Portal** (`/subscriptions`) or **Postman** (`POST /api/v1/subscriptions/plans`)
* **Dependencies:** `city_id` (Step 4), `vehicle_type_id` (Step 7).
* **Data to Enter:**
  * **Daily Pass:** `$5.00` | Duration: `1 Day` | Max Rides: `Unlimited`
  * **Weekly Plan:** `$25.00` | Duration: `7 Days` | Max Rides: `Unlimited`
  * **Monthly Pro:** `$80.00` | Duration: `30 Days` | Max Rides: `Unlimited`
* **Why:** Drivers subscribe to these plans so the platform takes 0% commission on individual rides.

---

### **Step 15: Create Commission & Tax Rules (Alternative / Fallback Model)**
* **Where:** **Portal** (`/commission-rules`) & (`/tax-rules`)
* **Dependencies:** `city_id` (Step 4).
* **Data to Enter:** Flat `10%` platform fee, Tax/VAT rate `5%`.
* **Why:** Enables standard commission deduction for non-subscribed drivers.

---

### **Step 16: Create Promos & Discounts**
* **Where:** **Portal** (`/promos`) or **Postman** (`POST /api/v1/promos`)
* **Dependencies:** `city_id` (Step 4).
* **Data to Enter:** `Code` (`WELCOME50`), `Discount Percentage` (`50%`), `Max Discount` (`$10`), `Valid Until`.

---

# 👨‍✈️ Phase 5: Driver Registration, KYC & Activation

### **Step 17: Register Driver Profile**
* **Where:** **Postman** (`POST /api/v1/auth/driver/send-otp` & `POST /api/v1/auth/driver/verify-otp`)
* **Data to Enter:** `phone_number: "+11234567890"`, `first_name: "John"`, `last_name: "Doe"`, `city_id` (Step 4).

---

### **Step 18: Register Driver Vehicle**
* **Where:** **Postman** (`POST /api/v1/driver/vehicles`)
* **Dependencies:** `driver_id` (Step 17), `vehicle_model_id` (Step 8), `vehicle_type_id` (Step 7).
* **Data to Enter:** `Plate Number`: `ABC-1234`, `Color`: `Silver`, `Year`: `2022`.

---

### **Step 19: Upload KYC Documents**
* **Where:** **Postman** (`POST /api/v1/driver/documents`)
* **Dependencies:** `driver_id` (Step 17), `document_type_id` (Step 9).
* **Data to Enter:** Upload file or provide S3 image URLs for Driving License, RC, and Insurance.

---

### **Step 20: Accept Legal Terms & Questionnaire**
* **Where:** **Postman** (`POST /api/v1/driver/legal/accept` & `POST /api/v1/driver/onboarding/answers`)
* **Dependencies:** `legal_document_id` (Step 11).

---

### **Step 21: Admin Approves Driver KYC (Verification Gate)**
* **Where:** **Portal** (`/drivers` -> Click Driver -> "Pending Approvals" Tab)
* **Action:**
  1. Inspect uploaded license and vehicle images.
  2. Click **Approve Document** on each item.
  3. Click **Approve Driver** -> Status changes to **`APPROVED`** / **`ACTIVE`**.

---

### **Step 22: Driver Buys Subscription**
* **Where:** **Postman** (`POST /api/v1/driver/subscriptions/purchase`) or **Portal**
* **Dependencies:** `driver_id` (Step 17), `plan_id` (Step 14).
* **Data to Enter:** Select `Weekly Plan` -> Mock Payment `SUCCESS`.
* **Why:** Unlocks driver eligibility in the dispatch matching queue.

---

### **Step 23: Driver Goes Online & Sends Live Location**
* **Where:** **Postman** / **Socket.IO** (Connect to `/driver` namespace)
* **Payload:** 
  ```json
  {
    "event": "DRIVER_LOCATION_UPDATE",
    "driver_id": "<driver_id>",
    "lat": 37.7749,
    "lng": -122.4194,
    "is_online": true
  }
  ```
* **Why:** Pushes driver's GPS location to the Redis Geospatial index.

---

# 📱 Phase 6: Rider Booking, Matching & Live Ride Lifecycle

### **Step 24: Register / Login Rider**
* **Where:** **Rider App** or **Postman** (`POST /api/v1/auth/rider/verify-otp`)
* **Data to Enter:** `phone_number: "+19876543210"`, `name: "Alice Rider"`.

---

### **Step 25: Get Fare Estimation**
* **Where:** **Postman** (`POST /api/v1/rides/estimate`) or **Rider App**
* **Payload:** 
  ```json
  {
    "pickup": { "lat": 37.7750, "lng": -122.4180, "address": "Market St" },
    "drop": { "lat": 37.7890, "lng": -122.4010, "address": "Union Square" },
    "city_id": "<city_id>"
  }
  ```
* **Result:** Returns prices for all Vehicle Types (e.g., Bike: $6, Sedan: $14, SUV: $22).

---

### **Step 26: Request Ride (Booking Created)**
* **Where:** **Postman** (`POST /api/v1/rides/request`) or **Rider App**
* **Payload:** Select `vehicle_type_id: <Sedan>`, `payment_method: "CASH"|"WALLET"`, `pickup`, `drop`.
* **System Action:** Status becomes **`SEARCHING`**; Kafka event dispatches to the nearest online driver (5km ring).

---

### **Step 27: Driver Accepts Ride Offer**
* **Where:** **Postman** (`POST /api/v1/driver/rides/<ride_id>/accept`) or **Socket.IO**
* **System Action:** Ride status changes to **`ACCEPTED`**. Rider receives driver details, vehicle plate number, and 4-digit pickup OTP (e.g. `4821`).

---

### **Step 28: Driver Arrives at Pickup**
* **Where:** **Postman** (`POST /api/v1/driver/rides/<ride_id>/arrived`)
* **System Action:** Ride status changes to **`ARRIVED`**. Rider receives "Driver has arrived" push notification.

---

### **Step 29: Start Trip with OTP**
* **Where:** **Postman** (`POST /api/v1/driver/rides/<ride_id>/start`)
* **Payload:** `{"otp": "4821"}`
* **System Action:** Ride status changes to **`IN_PROGRESS`**.

---

### **Step 30: Safety Trigger Demo (SOS Alert)**
* **Where:** **Postman** (`POST /api/v1/rides/<ride_id>/sos`) or **App**
* **Show in Portal:** Navigate to **Portal** (`/sos-alerts`).
* **Effect:** Live high-priority alert pops up with real-time GPS coordinates and rider/driver emergency contact details.

---

### **Step 31: Complete Trip**
* **Where:** **Postman** (`POST /api/v1/driver/rides/<ride_id>/complete`)
* **Payload:** `{"final_lat": 37.7890, "final_lng": -122.4010, "toll_amount": 0}`
* **System Action:** Status changes to **`COMPLETED`**. Backend calculates final distance, duration, taxes, and generates final invoice.

---

# 💳 Phase 7: Payments, Ledger, Payouts & Back-Office Analytics

### **Step 32: Settle Payment & Wallet Deduction**
* **Where:** **Postman** (`POST /api/v1/payments/process`)
* **System Action:** If Cash -> Marked as collected. If Wallet -> Deducted from Rider balance and credited to Driver Wallet.

---

### **Step 33: Verify Financial Ledger**
* **Where:** **Portal** (`/ledger` & `/wallets`)
* **Show to Client:** Inspect balanced double-entry debit/credit ledger records generated for the completed ride.

---

### **Step 34: Inspect Driver Payouts**
* **Where:** **Portal** (`/payouts` -> "Create Payout Batch")
* **Show to Client:** Admin can review accumulated driver wallet balances and trigger batch bank payouts.

---

### **Step 35: Live Operations & Analytics Dashboard**
* **Where:** **Portal** (`/dashboard` & `/dispatch-ops`)
* **Show to Client:**
  1. **Dispatch Ops:** View live driver markers, ongoing trips, and zone heatmaps on the interactive map.
  2. **Analytics:** View total trips completed, revenue generated, driver subscription conversions, and audit logs (`/audit-logs`).

---

# 📊 Quick Reference Summary Table

| Step # | Entity / Action | Execution Tool | Prerequisite Dependency |
| :--- | :--- | :--- | :--- |
| **1** | Currency | Portal (`/geo/currencies`) | None |
| **2** | Country | Portal (`/geo/countries`) | Step 1 (Currency) |
| **3** | State | Portal (`/geo/states`) | Step 2 (Country) |
| **4** | City | Portal (`/geo/cities`) | Step 2, 3 (Country, State) |
| **5** | Service Area (Polygon) | Portal (`/geo/service-areas`) | Step 4 (City) |
| **6** | Zones (Surge/Airport) | Portal (`/zones`) | Step 4, 5 (City, Service Area) |
| **7** | Vehicle Types | Portal (`/vehicle-types`) | None |
| **8** | Vehicle Models | Portal (`/vehicle-models`) | Step 7 (Vehicle Type) |
| **9** | Document Types | Portal (`/onboarding-config`) | None |
| **10** | Document Requirements | Portal (`/onboarding-config`) | Step 2, 7, 9 (Country, Vehicle, Doc Type) |
| **11** | Legal Documents (Terms) | Portal (`/onboarding-config`) | Step 2 (Country) |
| **12** | Onboarding Questions | Portal (`/onboarding-config`) | Step 2 (Country) |
| **13** | Fare Rules (Pricing) | Portal (`/fare-rules`) | Step 4, 7 (City, Vehicle Type) |
| **14** | Driver Subscriptions | Portal (`/subscriptions`) | Step 4, 7 (City, Vehicle Type) |
| **15** | Commission & Tax Rules | Portal (`/commission-rules`) | Step 4 (City) |
| **16** | Promo Codes | Portal (`/promos`) | Step 4 (City) |
| **17–20** | Driver Sign-up & Docs | Postman | Steps 4, 7, 8, 9, 11 |
| **21** | Admin Approves Driver KYC | Portal (`/drivers`) | Step 17–20 |
| **22** | Driver Buys Subscription | Postman | Step 14, 21 |
| **23** | Driver Goes Online (GPS) | Postman / Socket.IO | Step 21, 22 |
| **24–26** | Rider Login & Book Ride | Postman / Rider App | Step 13, 23 |
| **27–29** | Accept, Arrive & Start (OTP) | Postman / Socket.IO | Step 26 |
| **30** | SOS Alert Demonstration | Postman -> Portal (`/sos-alerts`)| Step 29 |
| **31–32** | Complete Trip & Payment | Postman | Step 29 |
| **33–35** | Ledger, Payouts & Analytics | Portal (`/ledger`, `/dashboard`)| Step 31, 32 |