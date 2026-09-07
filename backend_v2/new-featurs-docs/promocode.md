Searched for "promos"
Viewed promos.js:1-22
Viewed promo-usages.js:1-14
Viewed referrals.js:1-16
Viewed promo.service.js:1-120
Viewed promo.service.js:121-200
Viewed 10-promo.stage.js:1-42
Searched for "promo"
Viewed fare.engine.js:60-78
Viewed 11-rounding.stage.js:1-106
Searched for "discountAmountMinor"
Searched for "recordPromoUsage"
Viewed ride.service.js:910-940
Listed directory promos
Viewed types.ts:1-57
Viewed dialog.tsx:1-70

### Executive Verdict: Is the Current Promo & Coupon Feature Good?

**Rating: 6.5 / 10**

Your application already has a **solid foundational base**: it supports percentage and flat discounts, usage caps (`perUserLimit`, `usageLimit`), minimum fare thresholds, date validity, audit tracking in `promo_usages`, and double-sided referral wallet credits.

However, compared to industrial rideshare applications (**Uber, Ola, Grab, Lyft**), there is **1 critical financial flaw** and **4 missing industry essentials** that will cause operational issues if launched in production.

---

### 1. 🚨 The #1 Critical Flaw: Who Pays for the Discount?

In [ride.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/ride/ride.service.js) and [ride-payment.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/ride-payment/ride-payment.service.js):

$$\text{Rider Final Fare} = \text{Gross Metered Fare} - \text{Promo Discount}$$

The application currently passes this discounted `finalFareMinor` into `computeCommission`:
* **Trip Metred Fare**: ₹500
* **Rider Promo Discount (50% off)**: -₹250
* **Rider Pays**: ₹250
* **Current Driver Payout**: $₹250 - 20\% \text{ Commission} = \mathbf{₹200}$

> [!CAUTION]
> **The Problem:** The driver just completed a 15 km ride worth ₹500, but only earned ₹200 because the rider used a coupon code.
> In real life, drivers will **refuse rides, cancel trips, or protest** if rider marketing discounts come out of their pockets.

#### How Uber & Ola Actually Handle This:
Promotions are **platform-subsidized marketing expenses**:
* **Gross Ride Fare**: ₹500
* **Driver Gross Base**: ₹500
* **Platform Commission (20%)**: +₹100
* **Driver Gets**: $\mathbf{₹400}$ *(driver gets paid the full fair value of the trip)*
* **Rider Pays**: ₹250
* **Platform Net**: Rider (₹250) - Driver (₹400) = **-₹150** *(debited to Platform Marketing/Promo Expense Ledger)*.

---

### 2. Missing Industry Dimensions (What Uber / Ola Have)

| Feature | Your App Currently | Uber / Ola / Grab Standard | Why It Matters |
| :--- | :--- | :--- | :--- |
| **City Scoping** | Only `countryId` (null = global) | `cityId` / City-specific (e.g. `BLR50`, `DELHI20`) | Marketing budgets are allocated per city. You don't want a promotion meant for a new launch city to be redeemed nationwide. |
| **Vehicle Type Scoping** | None (applies to all vehicles) | `vehicleTypeId` (e.g. Moto-only, Auto-only, Premier-only) | You often want to promote entry-level categories (Bikes/Autos) to acquire users without giving discounts on expensive SUVs. |
| **First-Time Rider Rule** | Only generic `perUserLimit: 1` | `isFirstRideOnly: true` or `maxRidesCount: 3` | The #1 rideshare promo strategy is **"50% off your first 3 rides"**. Right now, existing riders can use new codes anytime. |
| **Surge Protection** | Applies discount on post-tax total | Promo discount applies **only to base fare**, NOT to surge | In high-demand peak traffic, taking 50% off a $3\times$ surge fare wastes platform marketing dollars. |
| **Airport / Zone Scoping** | None | Geofence-specific (e.g. ₹100 off Airport pickups) | High-margin routes need targeted promotions. |

---

### 3. Performance & Fraud Vulnerabilities in the Code

#### A. $O(N)$ Database Scan in Referral Lookup
In [promo.service.js (Line 123-124)](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/promo/promo.service.js#L123-L124):
```javascript
const allUsers = await db.select({ id: users.id }).from(users);
const referrer = allUsers.find((u) => generateReferralCodeForUser(u.id) === cleanCode);
```
> [!WARNING]
> This loads **every single user in your database into Node.js memory** to match a referral code. Once you have 10,000+ users, this will freeze your server event loop or cause Out-of-Memory crashes.
> 
> **Fix:** Store `referralCode` directly on the `users` table or calculate the `userId` directly from the code prefix.

#### B. Promo Abuse & Device Multi-Accounting
Riders often create multiple accounts with different SIM cards on the same device to repeatedly claim first-ride coupons.
* **Industry Defense:** Real platforms record the device fingerprint (`deviceId` / Google Advertising ID) in `promo_usages` to limit 1 welcome coupon per physical smartphone, regardless of phone number or SIM card.

---

### 4. Recommended 4-Step Action Plan

To turn your promo system into an industrial-grade engine:

1. **Protect Driver Earnings (Financial Fix)**:
   Ensure `computeCommission` and driver payout use the **pre-discount gross fare**, while the promo discount is absorbed by the platform.
2. **Add `cityId` & `vehicleTypeId` to `promos`**:
   Allow coupons like `PUNE_MOTO` or `MUMBAI_SEDAN` targeted to specific cities and vehicle classes.
3. **Add `isFirstRideOnly` & `maxRidesPerUser`**:
   Support standard user-acquisition campaigns (e.g. Welcome coupon for new riders).
4. **Fix the Referral Query**:
   Index and query the referrer directly by code instead of loading all database users into memory.

Would you like me to prepare an implementation plan to update the promo system with these improvements?