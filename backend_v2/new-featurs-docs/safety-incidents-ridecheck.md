# Safety Incidents & RideCheck

> **Priority:** P0 — CRITICAL  
> **Status:** MISSING from codebase  
> **Depends on:** rides, drivers, riders, tracking, notifications, emergency, admin

---

## Overview

Safety must be a first-class domain. Beyond SOS, the platform needs:
- **RideCheck**: proactive monitoring for unexpected stops or route deviations during a trip.
- **Incident management**: structured workflow when something goes wrong.
- **Audio/video evidence**: optional recording where legally permitted.
- **Regional configuration**: features enabled/disabled per country/city via feature flags.

---

## Database Schema

### `safety_incidents`

```sql
id                  UUID PRIMARY KEY
incident_number     VARCHAR(32) NOT NULL UNIQUE   -- INC-2026-00123
ride_id             UUID REFERENCES rides(id)
reporter_id         UUID NOT NULL REFERENCES users(id)
reporter_role       ENUM('rider', 'driver', 'admin', 'system')
incident_type       ENUM('sos', 'route_deviation', 'unexpected_stop', 'ridecheck',
                         'accident', 'assault', 'harassment', 'unsafe_driving',
                         'vehicle_breakdown', 'lost_item', 'other')
severity            ENUM('low', 'medium', 'high', 'critical')
status              ENUM('open', 'acknowledged', 'under_review', 'escalated',
                         'resolved', 'closed', 'referred_to_police')
description         TEXT
location_lat        NUMERIC(9, 6)
location_lng        NUMERIC(9, 6)
occurred_at         TIMESTAMPTZ
resolved_at         TIMESTAMPTZ
resolved_by         UUID REFERENCES users(id)
resolution_notes    TEXT
emergency_services_contacted BOOLEAN DEFAULT FALSE
police_case_number  VARCHAR(128)
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `safety_events`

Timeline events during a trip or incident.

```sql
id                  UUID PRIMARY KEY
ride_id             UUID REFERENCES rides(id)
incident_id         UUID REFERENCES safety_incidents(id)
event_type          ENUM('sos_triggered', 'ridecheck_alert', 'route_deviation_detected',
                         'unexpected_stop_detected', 'trip_share_activated',
                         'emergency_contact_notified', 'audio_recording_started',
                         'audio_recording_stopped', 'pin_verified', 'pin_failed',
                         'driver_reported', 'rider_reported', 'admin_intervened')
actor_id            UUID REFERENCES users(id)
actor_role          VARCHAR(32)
payload             JSONB
location_lat        NUMERIC(9, 6)
location_lng        NUMERIC(9, 6)
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `safety_evidence`

```sql
id                  UUID PRIMARY KEY
incident_id         UUID NOT NULL REFERENCES safety_incidents(id)
evidence_type       ENUM('audio', 'video', 'photo', 'document', 'gps_track', 'screenshot')
file_url            TEXT NOT NULL    -- encrypted S3 URL
file_key            TEXT NOT NULL    -- encrypted storage key
file_size_bytes     INTEGER
duration_seconds    INTEGER          -- for audio/video
encrypted           BOOLEAN DEFAULT TRUE
encryption_key_ref  VARCHAR(256)     -- reference to key management service
uploaded_by         UUID REFERENCES users(id)
access_log          JSONB DEFAULT '[]'  -- who accessed when
retention_until     DATE             -- for legal retention policies
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

## RideCheck — Proactive Safety Monitoring

RideCheck automatically monitors active trips for safety anomalies and proactively checks in with riders/drivers.

### Triggers

| Signal | Threshold | Action |
|---|---|---|
| Unexpected stop | Stationary > 5 min, not at destination | Check-in prompt |
| Route deviation | > 500m from expected route | Check-in prompt |
| GPS signal lost | No ping > 120 sec | Check-in prompt |
| Trip duration exceeded | > 2× estimated duration | Check-in prompt |
| SOS button pressed | Immediate | Emergency escalation |

All thresholds are configurable per city.

### Check-in Flow

```text
Anomaly detected
        ↓
Push notification: "Are you OK? Tap to confirm"
        ↓
[User responds OK] → resolved, log safety_event
        ↓
[No response in 60 sec] → repeat notification + SMS
        ↓
[No response in 2 min] → alert emergency contacts + escalate to safety team
        ↓
[Emergency contact responds] → coordinate resolution
```

---

### Route Deviation Detection

- Calculate expected route polyline at trip start (or from GPS breadcrumbs).
- At each GPS ping, check distance from expected corridor.
- If distance > `route_deviation_threshold_meters` for `route_deviation_duration_seconds`:
  - Create `safety_event` of type `route_deviation_detected`.
  - Trigger RideCheck check-in.

---

## Incident Workflow

```text
Incident reported (SOS / report / system detection)
        ↓
Create safety_incident record
        ↓
Notify safety team (on-call agent)
        ↓
Agent acknowledges
        ↓
Evidence collected (GPS track, audio if available)
        ↓
Assessment: accident? assault? breakdown?
        ↓
Action: driver suspended? police? resolved?
        ↓
Resolution recorded
        ↓
Follow-up notification to reporter
```

---

## Audio/Video Recording (Region Feature-Flagged)

- Enabled only where legally permitted (check `audio_recording_enabled` feature flag).
- Legal consent notice shown to both parties at trip start.
- Recording starts only after consent accepted.
- Audio stored encrypted in object storage.
- Access requires elevated admin role + audit log entry.
- Auto-deleted after retention period (configurable, e.g. 30 days unless flagged for incident).

---

## Emergency Contacts

When SOS is triggered:
1. All emergency contacts of the user receive SMS + email with:
   - User's name
   - Current GPS location
   - Ride details (driver name, vehicle plate, ride ID)
   - Platform emergency phone number
2. Platform safety team is also alerted.
3. `safety_event` of type `emergency_contact_notified` is recorded.

---

## API Endpoints

### POST `/rides/:rideId/sos`

Trigger SOS for an active ride.

**Auth:** Rider or Driver JWT (must be assigned to the ride).

---

### POST `/rides/:rideId/report`

Report driver or rider behaviour.

**Body:**
```json
{
  "incident_type": "unsafe_driving",
  "description": "Driver ran a red light at high speed"
}
```

---

### POST `/rides/:rideId/ridecheck/respond`

Respond to a RideCheck check-in prompt.

**Body:** `{ "status": "ok" }` or `{ "status": "need_help", "description": "..." }`

---

### Admin: GET `/admin/safety/incidents`

List incidents with filtering.

---

### Admin: GET `/admin/safety/incidents/:id`

View full incident with events, evidence access log, resolution history.

---

### Admin: PATCH `/admin/safety/incidents/:id/status`

Update incident status (audited).

---

### Admin: GET `/admin/safety/evidence/:evidenceId`

Access evidence (creates access log entry, requires elevated permission).

---

## Events

| Event | Producer | Consumer |
|---|---|---|
| `safety.sos_triggered` | Safety Service | Emergency contacts, Safety team, Audit |
| `safety.ridecheck_alert` | Trip Monitor Worker | Push notification to user |
| `safety.incident_created` | Safety Service | Safety agent notification |
| `safety.incident_escalated` | Safety Service | On-call team page |
| `safety.route_deviation` | GPS Worker | RideCheck service |

---

## Regional Configuration

All safety features respect country/city feature flags:

| Flag | Default | Notes |
|---|---|---|
| `audio_recording_enabled` | false | Legal requirement varies |
| `ridecheck_enabled` | false | Requires GPS infra |
| `trip_sharing_enabled` | true | Generally available |
| `emergency_services_integration` | false | Varies by country |
| `sos_in_app_enabled` | true | Always available |

---

## Testing Requirements

- SOS triggers emergency contact notification within 10 seconds
- Route deviation detected when GPS leaves corridor
- RideCheck check-in sent when unexpected stop > threshold
- No response escalation fires after defined timeout
- Audio recording only starts after consent accepted
- Evidence access creates audit log entry
- Incident cannot be closed without resolution notes
