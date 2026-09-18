Let me quickly look at the zone and city-type schemas to give an accurate explanation:

Viewed city-types.js:1-20
Listed directory stages
Viewed 02-zone-resolver.stage.js:1-73
Viewed 07-surge.stage.js:1-61
Viewed 08-fees.stage.js:1-54

Now I have the full picture. Here's a clear explanation:

---

## How City Types + Pricing Card + Zones Work Together

Your system has **two separate concepts** that are often confused but serve different roles:

### 🏙️ 1. City Type (`city_types.costIndex`) — The **Base Rate Multiplier**

The `costIndex` (e.g. `1.0` for TR-1, `0.8` for TR-2) is **not applied to the base price directly**. It is used as the **baseline multiplier inside the surge engine (Stage 7)**:

```
Stage 7 formula:
  baselineMultiplier = pickupZone.multiplier  ← if rider is in a special zone
                    OR cityType.costIndex      ← if no zone matched

  effectiveSurge = dynamicSurge × ruleMultiplier × baselineMultiplier
```

So a TR-1 city (costIndex `1.2`) makes **all rides naturally 20% more expensive** through the surge stack, even when demand is low. TR-2 at `0.8` means rides are cheaper.

---

### 🗺️ 2. Zone (`zones.multiplier`) — **Overrides the City Type baseline**

A zone like `airport` or `busy_area` has its own `multiplier`. When a pickup is **inside a zone**, the zone's multiplier **replaces** the city type's `costIndex` as the baseline:

```
pickupZone detected → use pickupZone.multiplier  (e.g. 1.5 for Airport)
  ↳ cityType.costIndex is IGNORED
```

Additionally, zones have **flat add-on fees** (added AFTER surge, never inflated):
- `airportFeeMinor` — charged when pickup or drop is an airport zone
- `pickupFeeMinor` / `dropoffFeeMinor` — zone-specific surcharges

---

### 📋 3. Pricing Card (`pricing_versions`) — The **Base Rate itself**

The pricing card sets the raw per-km, per-minute, and base fare numbers. It is resolved **before** the zone/cityType multipliers are applied. The cascade picks the most specific one:

```
Airport Cab pricing version     ← if admin created one for this zone
  → City-level Cab pricing      ← if admin created one for this city  
    → TR-1 tier Cab pricing     ← if admin created one for this city type
      → Country-level baseline  ← e.g. India Cab
        → Global fallback       ← catch-all
```

---

### 🔢 Full Fare Calculation Flow

```
STAGE 2  Zone Resolver
         ├── Detects pickup zone (airport, busy_area, etc.)
         └── Reads city → city type (TR-1, TR-2)

STAGE 4  Pricing Card
         └── Picks best pricing_version for:
             vehicleType + zone / city / cityType / country
             → gives: baseFare, perKm, perMin, minFare

STAGE 5  Metered Fare
         └── baseFare + (distanceKm × perKm) + (durationMin × perMin)

STAGE 7  Surge
         ├── baselineMultiplier = zone.multiplier OR cityType.costIndex
         ├── effectiveSurge = dynamicSurge × ruleMultiplier × baselineMultiplier
         └── surgeAmount = meteredSubtotal × (effectiveSurge - 1)

STAGE 8  Fees (NEVER surged)
         ├── airport fee (from zone, if type=airport)
         ├── pickup/dropoff zone fees
         └── booking fee (from pricing card)

STAGE 9  Tax → STAGE 10 Promo → STAGE 11 Round & finalize
```

---

### Practical Example

| Scenario | Pricing Card | Baseline Multiplier | Airport Fee |
|---|---|---|---|
| TR-1 city, no zone, low demand | City TR-1 card | `1.2` (costIndex) | ₹0 |
| TR-1 city, airport zone | Airport zone card (if exists) | `1.5` (zone.multiplier) | ₹150 |
| TR-2 city, busy area zone | City card | `1.3` (zone.multiplier) | ₹0 |
| TR-1 city, airport zone, peak hour | Airport zone card | `1.5 × 1.8 (surge) = 2.7x` | ₹150 (flat, not surged) |

> **Key insight:** Zone multiplier and cityType costIndex are **not added together** — the zone **wins** over the city type. And airport/toll fees are **always flat** — they are never multiplied by surge.