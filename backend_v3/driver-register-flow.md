# Prompt: Design a Complete Driver Registration Flow for a Multi-Language Ride Sharing Platform

I am building a ride-sharing platform similar to Uber or Lyft.

The platform consists of:

* Rider Mobile App
* Driver Mobile App
* Admin Web Portal

The entire platform must support multiple languages (i18n) and multiple countries.

## Goal

Design a complete, scalable, production-ready Driver Registration and Onboarding system.

The solution should include:

* UX/UI flow
* Backend API design
* Database schema
* Validation rules
* Dynamic form system
* Admin management
* Status flow
* Security
* Edge cases

---

# Driver Registration Flow

## Step 1: Login / Registration

Driver enters either:

* Mobile Number
* Email Address

The system must support both.

### Mobile Login

Requirements:

* Country Code selector
* Multiple country support
* OTP verification
* SMS OTP
* Resend OTP
* OTP expiration
* Maximum retry limit

Flow:

1. Driver enters mobile number.
2. Validate phone format.
3. Check if the number already exists.
4. If it exists:

   * Send OTP.
   * Verify OTP.
   * Log the driver in.
5. If it does not exist:

   * Create a new account with the phone number.
   * Send OTP.
   * Verify OTP.
   * Continue registration.

---

### Email Login

Requirements:

* Email validation
* Verification code or email verification link
* Existing account detection

Flow:

1. Enter email.
2. Validate email.
3. Check if it exists.
4. If it exists:

   * Verify email.
   * Login.
5. If it does not exist:

   * Create account.
   * Verify email.
   * Continue registration.

---

# Step 2: Personal Information

Collect:

* First Name
* Last Name
* Date of Birth (optional)
* Gender (optional)
* Referral Code (optional)

Validation:

* Required fields
* Character limits
* Unicode support for all languages

---

# Step 3: Privacy Policy & Terms

Display:

* Privacy Policy
* Terms & Conditions

Requirements:

* Scrollable content
* Version tracking
* Mandatory checkbox:

  * "I agree to the Terms & Conditions and Privacy Policy."

Registration cannot continue until accepted.

---

# Step 4: Driving City

Driver selects where they want to drive.

Requirements:

* Country
* State/Province
* City

Cities should be loaded dynamically from the backend.

Admin can:

* Add city
* Disable city
* Enable city

---

# Step 5: Dynamic Questionnaire

The driver answers onboarding questions.

Examples:

* Why do you want to drive?
* How many hours will you drive each week?
* Do you have previous driving experience?
* Have you worked with another ride-sharing company?
* Do you own a vehicle?
* Can you work nights?
* Can you work weekends?

Question types:

* Single Choice
* Multiple Choice
* Dropdown
* Yes/No
* Rating
* Text
* Number
* Date

Requirements:

* Questions are dynamic.
* Questions are configurable from the Admin Portal.
* Questions can be reordered.
* Questions can be enabled or disabled.
* Questions support multiple languages.
* Some questions can be marked as required.
* Conditional questions are supported (show questions based on previous answers).

---

# Step 6: Vehicle Information

Collect:

* Vehicle Type
* Brand
* Model
* Year
* Color
* Registration Number
* VIN (optional)
* Number of Seats
* Fuel Type
* Transmission
* Vehicle Category

Vehicle types should be managed by the Admin Portal.

---

# Step 7: Driver Documents

Driver uploads required documents.

Examples:

* Driver's License
* Vehicle Registration
* Insurance Certificate
* Road Worthiness Certificate
* Vehicle Permit
* National ID / Passport
* Tax Documents (optional)

Each document should support:

* Front image
* Back image
* PDF upload
* Expiration date
* Document number

Validation:

* File size limit
* Image quality
* Allowed formats
* Expired document detection

---

# Step 8: Profile Photo

Requirements:

* Camera
* Gallery
* Crop
* Compression
* Face visibility validation (optional)

---

# Step 9: Bank Details (Optional)

Collect:

* Bank Name
* Account Holder
* Account Number
* Routing / IFSC / SWIFT
* Mobile Wallet (country-specific)

---

# Step 10: Emergency Contact (Optional)

Collect:

* Name
* Relationship
* Phone Number

---

# Step 11: Review

Display a summary of all entered information.

Driver can edit any section before submission.

---

# Step 12: Submit

After submission:

Status becomes:

* Pending Review

Admin receives notification.

Driver sees:

"Your application is under review."

---

# Admin Portal Requirements

Admin should be able to:

* View all driver applications
* Search
* Filter
* Approve
* Reject
* Request additional documents
* Suspend driver
* Activate driver
* Manage cities
* Manage countries
* Manage vehicle categories
* Manage required documents
* Create dynamic onboarding questions
* Reorder onboarding questions
* Enable/disable questions
* Translate questions into multiple languages
* Configure required documents by country or city

---

# Dynamic Form System

Everything should be configurable.

Examples:

* Cities
* Countries
* Vehicle types
* Required documents
* Onboarding questions
* Agreement text
* Privacy Policy
* Terms & Conditions

No mobile app update should be required when forms change.

---

# Multi-Language Support

Every visible text should support localization, including:

* Labels
* Buttons
* Validation messages
* Questions
* Terms
* Policies
* Notifications
* Error messages

Language should be changeable at runtime.

---

# Security

Implement:

* JWT authentication
* Refresh tokens
* OTP expiration
* Rate limiting
* Device registration
* Duplicate account prevention
* Secure file uploads
* Encryption for sensitive data
* Audit logs
* Fraud detection

---

# Driver Status Flow

Account statuses:

* New
* Mobile Verified
* Email Verified
* Registration In Progress
* Documents Pending
* Pending Review
* Under Verification
* Approved
* Rejected
* Suspended
* Active
* Inactive

---

# Edge Cases

Handle scenarios such as:

* Duplicate phone numbers
* Duplicate emails
* Expired OTP
* Invalid OTP
* Expired documents
* Unsupported country codes
* Network interruptions during registration
* Upload failures
* Partially completed registrations
* Drivers returning later to continue registration
* Multiple devices logging into the same account

---

# Deliverables

Provide:

1. Complete user flow.
2. UX wireframes for every screen.
3. Database schema.
4. REST API or GraphQL API design.
5. Backend architecture.
6. Admin panel design.
7. Dynamic questionnaire system.
8. File upload architecture.
9. Validation rules.
10. Driver state machine.
11. Error handling.
12. Security best practices.
13. Localization strategy.
14. Sequence diagrams.
15. Recommended technology stack.
16. Production-ready implementation plan following scalable enterprise architecture and industry best practices.

