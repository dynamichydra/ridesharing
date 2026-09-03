Viewed corporate.routes.js:1-50
Viewed corporate.service.js:1-198

### 1. What is a Corporate Account & Why Use It?

A **Corporate Account (B2B / Enterprise Account)** allows companies (e.g., Google, TCS, Infosys) to partner with your rideshare platform so their employees can book rides for business trips, client meetings, airport shuttles, or daily commutes without paying out-of-pocket every time.

#### Key Benefits:

1. **For the Company (Client Business):**
   * **No Employee Reimbursement Hassles:** Employees don't need to pay upfront using personal credit cards, collect paper receipts, and file reimbursement claims.
   * **Monthly Consolidated Invoicing:** Instead of hundreds of individual micro-charges, the company gets a single consolidated itemized invoice at the end of the billing cycle (e.g., Net 30 terms).
   * **Spending Limits & Controls:** The company can assign roles (`manager`, `employee`) and set maximum spending limits per user.
   * **Corporate Credit Line:** Operates on a pre-approved credit limit (e.g., ₹5,00,000 monthly credit).

2. **For the Rider (Employee):**
   * Can switch payment method to **"Corporate Account"** when booking a business trip.
   * Instant cashless experience with automated corporate billing.

3. **For your Rideshare Platform:**
   * **High Volume & Predictable Revenue:** Enterprise contracts bring high-frequency, reliable ride volumes.
   * **Proper Double-Entry Accounting:** Rides are tracked as `CORPORATE_RECEIVABLE` (Asset) in the ledger, and when the company pays its invoice, it reconciles into platform cash and pays drivers without delays.

---

### 2. How the Corporate Flow Works in Our System

```text
┌─────────────────────────┐
│ 1. Create Corp Account  │  (Set company details, credit limit e.g. ₹2,00,000)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 2. Add Employees/Users  │  (Link rider user IDs to corporate account with limits)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 3. Ride & Credit Lock   │  (Exposure is reserved against credit limit; ride completed)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 4. Monthly Invoicing    │  (Consolidate all employee rides into INV-CORP-xxx)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 5. Corporate Settlement │  (Company pays via Bank Transfer/PSP; Ledger settled)
└─────────────────────────┘
```

---

### 3. Step-by-Step: How to Use Corporate Accounts (API Endpoints)

#### Step 1: Create a Corporate Account (Admin)
* **Endpoint:** `POST /api/v1/corporate/accounts`
* **Request Body:**
  ```json
  {
    "companyName": "Acme Technologies Pvt Ltd",
    "billingEmail": "finance@acme.com",
    "billingPhone": "+919876500000",
    "taxId": "29ABCDE1234F1Z5",
    "creditLimitMinor": 50000000,
    "currencyCode": "INR",
    "paymentTerms": "NET30",
    "status": "active"
  }
  ```
  *(Note: `creditLimitMinor: 50000000` = ₹500,000.00 credit limit)*

---

#### Step 2: Add Employees / Users to the Corporate Account
* **Endpoint:** `POST /api/v1/corporate/accounts/:corporateAccountId/users`
* **Request Body:**
  ```json
  {
    "userId": "rider-user-uuid-here",
    "role": "employee",
    "spendingLimitMinor": 1000000
  }
  ```
  *(Sets a spending limit of ₹10,000 for this specific employee)*

---

#### Step 3: Check Available Credit Before Booking
* **Endpoint:** `GET /api/v1/corporate/accounts/:corporateAccountId/credit-check?amountMinor=50000`
* **Response:**
  ```json
  {
    "success": true,
    "data": {
      "isAllowed": true,
      "availableMinor": 45000000
    }
  }
  ```
  *When a corporate ride starts, [reserveCorporateRideCredit](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/corporate/corporate.service.js#L42) safely increments the company's `currentExposureMinor`.*

---

#### Step 4: Generate Periodic / Monthly Invoices
At the end of the billing month, generate an invoice for the corporate account:
* **Endpoint:** `POST /api/v1/corporate/accounts/:corporateAccountId/invoices`
* **Request Body:**
  ```json
  {
    "periodStart": "2026-08-01",
    "periodEnd": "2026-08-31"
  }
  ```
* **Response:** Generates an invoice with invoice number `INV-CORP-xxx`, due in 30 days (Net 30).

---

#### Step 5: Settle / Pay Corporate Invoice
When the corporate client pays via Bank Wire / Gateway:
* **Endpoint:** `POST /api/v1/corporate/invoices/:invoiceId/pay`
* **Request Body:**
  ```json
  {
    "amountMinor": 5000000,
    "paymentMethod": "bank_transfer",
    "gatewayPaymentId": "UTR_BANK_REF_987654321"
  }
  ```
* **What happens in the Ledger:**
  Automatically posts balanced double-entry ledger transactions:
  * `DEBIT  processor_clearing:bank_transfer` (Money received in clearing account)
  * `CREDIT receivable:corporate` (Clears corporate receivable asset)
  * Updates invoice status to `"paid"` or `"partially_paid"`.

---

### 4. Code References in Your Project
* **Service Logic:** [corporate.service.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/corporate/corporate.service.js)
* **Routes:** [corporate.routes.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/src/modules/corporate/corporate.routes.js)
* **Database Schemas:**
  * [corporate-accounts.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/corporate-accounts.js)
  * [corporate-users.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/corporate-users.js)
  * [corporate-invoices.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/corporate-invoices.js)
  * [corporate-payments.js](file:///c:/Users/SUBRATA%20PRAMANIK/Documents/GitHub/ridesharing/backend_v2/drizzle/schema/corporate-payments.js)