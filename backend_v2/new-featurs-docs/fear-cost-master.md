Searched for "calculateFare"
Viewed fare.service.js:1-43
Viewed fare.engine.js:1-78
Searched for "commissionRules"
Viewed commission.service.js:1-60
Viewed pricing-versions.js:1-34
Viewed tax-rules.js:1-20

Below is the **Architecture, Entity Relationship, and Lifecycle Cost Flow** showing how `city`, `city_type`, `city_service_area`, `zone`, `fare_rules`, `tax_rules`, `commission_rules`, and `pricing_versions` interact.

---

### 1. Entity Relationship (ER) Diagram

```mermaid
erDiagram
    COUNTRY ||--o{ STATE : contains
    COUNTRY ||--o{ TAX_RULE : defines
    COUNTRY ||--o{ COMMISSION_RULE : defines
    COUNTRY ||--o{ ZONE : contains
    COUNTRY ||--o{ PRICING_VERSION : applies_to
    
    STATE ||--o{ CITY : contains
    STATE ||--o{ TAX_RULE : "optional override"
    
    CITY_TYPE ||--o{ CITY : classifies
    CITY_TYPE ||--o{ PRICING_VERSION : "baseline rates"
    
    CITY ||--o{ CITY_SERVICE_AREA : "operational boundary"
    CITY ||--o{ ZONE : "localized geofence"
    CITY ||--o{ PRICING_VERSION : "city-specific rates"
    
    VEHICLE_TYPE ||--o{ PRICING_VERSION : configures
    VEHICLE_TYPE ||--o{ FARE_RULE : targets
    VEHICLE_TYPE ||--o{ COMMISSION_RULE : targets
    
    ZONE ||--o{ FARE_RULE : triggers
    ZONE ||--o{ PRICING_VERSION : "hyper-local rates"
    
    PRICING_PROFILE ||--o{ PRICING_VERSION : versions
    
    RIDE ||--|| PRICING_VERSION : snapshots
    RIDE ||--o{ RIDE_FARE_SPLIT : distributes
```

---

### 2. The 11-Stage Fare Calculation Pipeline

When a rider searches for a cab or confirms a booking, the **`FareEngine`** executes in this exact sequence:

```mermaid
flowchart TD
    Start([Rider Coordinates: Pickup & Drop]) --> S1[Stage 1: Service Area Validation]
    S1 -->|H3 Hex Check in city_service_areas| S2[Stage 2: Geo & Zone Resolution]
    S2 -->|Match Pickup & Drop to zone + city + country| S3[Stage 3: Routing Engine]
    S3 -->|OSRM / Google: Distance km, Duration min, Traffic Delay| S4[Stage 4: Pricing Version Match]
    
    S4 -->|Hierarchy: Zone > City > CityType > VehicleType| S5[Stage 5: Base Metered Fare]
    S5 -->|BaseFare + Dist * Rate + Dur * Rate| S6[Stage 6: Fare Rules Evaluation]
    S6 -->|Night Multiplier + Traffic Delay + Flat Fare| S7[Stage 7: Surge Multiplier]
    S7 -->|Dynamic Supply/Demand capped by CityType SurgeCap| S8[Stage 8: Surcharges & Fees]
    S8 -->|Booking Fee + Platform Service Fee + Zone Airport/Pickup Fee| S9[Stage 9: Tax Calculation]
    S9 -->|TaxRule: Inclusive / Exclusive GST/VAT by Country & State| S10[Stage 10: Promo & Discount]
    S10 -->|Promo Code / Subscription credits applied| S11[Stage 11: Currency Rounding]
    S11 --> End([Final Locked Fare Quote])
```

---

### 3. Core Component Roles & Relationships

| Entity | Purpose & Core Responsibility | Relation to Fare & Cost |
| :--- | :--- | :--- |
| **`country`** | Global root setting currency code, dial code, and default `roundingIncrementMinor`. | Determines monetary precision and default pricing fallback. |
| **`state`** | Provincial division between country and cities. | Allows state-level tax stacking (e.g. SGST + CGST, HST/PST). |
| **`city_type`** | Economic tiers (e.g. `TIER_1_METRO`, `TIER_2`, `RURAL`). | Sets **`costIndex` multiplier**, **`defaultSurgeCap`** (e.g. max 3.0x), and whether waiting fees apply. |
| **`city_service_area`** | GeoJSON polygon + H3 hex cells defining where the app legally operates. | **Gatekeeper**: If pickup or drop is outside active service boundaries, rides are blocked before calculation. |
| **`zone`** | High-demand/special geofences (e.g. *Airport*, *Tech Park*, *Downtown*). | Injects localized **`multiplier`** and fixed surcharges (**`airportFeeMinor`**, **`pickupFeeMinor`**, **`dropoffFeeMinor`**). |
| **`pricing_version`** | Versioned rate card containing `baseFareMinor`, `perKmRateMinor`, `perMinRateMinor`, `minFareMinor`, `bookingFeeMinor`, `serviceFeeMinor`. | Defines the foundational distance/time pricing curve for any combination of Vehicle + City + Zone. |
| **`fare_rules`** | Dynamic contextual multipliers (`time`, `traffic`, `zone`). | Handles night-time surcharges (e.g. 1.25x between 23:00–05:00) and traffic congestion delays. |
| **`tax_rules`** | Government tax rates (`rate`, `isInclusive`, `appliesTo`). | Computes GST/VAT on the fare or booking fee, stacked by Country and State. |
| **`commission_rules`** | Revenue sharing split (`subscriberRate`, `nonSubscriberRate`, `bookingFeeMinor`). | Splits the completed ride payment between **Platform Revenue** and **Driver Wallet Payout**. |

---

### 4. Mathematical Cost Flow Equation

$$\text{Metered Fare} = \max\Big(\text{BaseFare} + (\text{Distance}_{\text{km}} \times \text{PerKmRate}) + (\text{Duration}_{\text{min}} \times \text{PerMinRate}),\; \text{MinFare}\Big)$$

$$\text{Subtotal} = \text{Metered Fare} \times \text{ZoneMultiplier} \times \text{FareRuleMultiplier} \times \min(\text{Surge}, \text{CityTypeSurgeCap})$$

$$\text{Pre-Tax Fare} = \text{Subtotal} + \text{BookingFee} + \text{ServiceFee} + \text{AirportFee} + \text{PickupFee} + \text{DropoffFee}$$

$$\text{Gross Fare} = \text{Pre-Tax Fare} + \sum \text{Taxes} - \text{PromoDiscount}$$

$$\text{Final Fare} = \text{Round}(\text{Gross Fare}, \text{CountryRoundingIncrement})$$

---

### 5. Post-Trip Commission & Driver Earnings Split

When the trip ends and payment is settled:

```mermaid
flowchart LR
    RiderPay["Rider Paid (₹500.00)"] --> Taxes["Govt Tax (GST 5% = ₹23.81)"]
    RiderPay --> PlatformFee["Booking Fee (₹25.00)"]
    RiderPay --> NetCommissionable["Net Fare (₹451.19)"]
    
    NetCommissionable --> PlatformShare["Platform Commission (15% = ₹67.68)"]
    NetCommissionable --> DriverShare["Driver Payout (85% = ₹383.51)"]
    
    PlatformFee --> TotalPlatform["Total Platform Revenue = ₹92.68"]
    PlatformShare --> TotalPlatform
    DriverShare --> DriverWallet["Driver Wallet Balance"]
```

1. **Booking Fee** is deducted off the top to the platform.
2. **Commission Rate** (e.g. `15%` for regular drivers, `0%` or `5%` for subscribed drivers) applies to the remaining balance.
3. **Driver Wallet** is credited immediately with Driver Net Earnings.