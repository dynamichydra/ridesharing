Searched for "findDrivers"
Listed directory matching
Viewed candidate-filter.service.js:1-100
Viewed candidate-filter.service.js:101-200
Viewed candidate-discovery.service.js:1-80
Listed directory driver
Viewed driver.service.js:1-120
Viewed driver.service.js:121-260

To receive your first ride offer as a new driver on the platform, your account and app need to complete a few onboarding and operational steps so the dispatch engine can match you with nearby riders:

---

### Step 1: Complete Registration & Onboarding
Make sure all required registration steps are completed and submitted:
1. **Personal Profile**: Fill in your basic details (Full Name, Date of Birth, Gender, and Profile Photo).
2. **Driving Location**: Select your operating Country, State, and City.
3. **Vehicle Registration**: Add your vehicle details (Make, Model, Year, License Plate Number, and Vehicle Type e.g., Sedan, Hatchback, Auto, XL). Ensure at least one vehicle is marked **Active**.
4. **Document Verification**: Upload all required documents (Driver's License, Vehicle Registration/RC, Insurance, Identity Proof) and accept legal terms.
5. **Submit Application**: Submit your profile for administrator review.

---

### Step 2: Ensure Account & Payout Approval
Before the system allows you to go online:
- **Admin Approval**: Your driver account status must be **`Approved`** (not `pending_review` or `suspended`).
- **Payout / Bank Account**: Link and verify your bank payout details (Stripe Connect / RazorpayX / Bank Transfer). The platform requires an approved payout method so earnings can be disbursed.

---

### Step 3: Go Online with Active GPS Location
1. **Toggle "Go Online"**: In the Driver App, switch your status toggle to **Online**.
2. **Enable GPS / Location Permissions**: Keep precise location services set to *"Always Allow"* or *"While using the app"*. The dispatch engine requires fresh GPS updates (under 60 seconds old); stale GPS signals are automatically excluded from dispatch.
3. **Keep Push Notifications & App Open**: Ensure device notifications (FCM) are enabled and battery optimization is disabled for the app so you do not miss incoming trip invites.

---

### Step 4: Position Yourself for Matching
- **High-Demand / Service Areas**: Move toward busy areas, city centers, transit hubs, or highlighted heatmap zones within your registered city.
- **Destination Mode**: If you have "Destination Mode" enabled, ensure your set destination is not overly restrictive, or disable it to receive ride requests in any direction.
- **Vehicle Match**: You will be eligible for ride requests matching your vehicle category and passenger capacity.

---

### Step 5: Accept the Ride Offer
- When a nearby rider requests a ride, the dispatch system ranks eligible drivers based on distance, ETA, and rating.
- A **Ride Offer** card will pop up on your screen with the pickup location, fare estimate, and a countdown timer (typically 15–30 seconds).
- Tap **"Accept"** before the timer runs out to confirm and begin your first trip!