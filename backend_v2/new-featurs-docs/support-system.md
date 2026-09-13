# Support Ticket System

> **Priority:** P0 — CRITICAL  
> **Status:** MISSING from codebase  
> **Depends on:** rides, payments, wallet, ledger, drivers, riders, notifications, audit-logs

---

## Overview

A support agent must be able to trace the complete history of a single ride without querying 10 unrelated systems manually. The support ticket system provides a unified workspace for resolving rider/driver issues, initiating refunds, adjusting fares, and escalating to safety/fraud teams.

---

## Database Schema

### `support_tickets`

```sql
id                  UUID PRIMARY KEY
ticket_number       VARCHAR(32) NOT NULL UNIQUE   -- human-readable, e.g. TKT-2026-00123
category            ENUM('ride', 'payment', 'refund', 'driver', 'rider', 'vehicle',
                         'document', 'payout', 'subscription', 'promo', 'lost_item',
                         'safety', 'accident', 'fraud', 'account', 'other')
sub_category        VARCHAR(64)
status              ENUM('open', 'pending', 'in_progress', 'waiting_customer',
                         'escalated', 'resolved', 'closed', 'reopened')
priority            ENUM('low', 'medium', 'high', 'urgent')
created_by_user_id  UUID REFERENCES users(id)
created_by_role     ENUM('rider', 'driver', 'admin', 'system')
assignee_id         UUID REFERENCES users(id)     -- support agent
assigned_team       VARCHAR(64)
ride_id             UUID REFERENCES rides(id)
payment_id          UUID REFERENCES payments(id)
subject             TEXT NOT NULL
description         TEXT
resolution          TEXT
resolved_at         TIMESTAMPTZ
closed_at           TIMESTAMPTZ
sla_due_at          TIMESTAMPTZ
escalated_at        TIMESTAMPTZ
escalated_to        VARCHAR(64)
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `support_messages`

```sql
id               UUID PRIMARY KEY
ticket_id        UUID NOT NULL REFERENCES support_tickets(id)
sender_id        UUID NOT NULL REFERENCES users(id)
sender_role      ENUM('rider', 'driver', 'agent', 'system')
message          TEXT NOT NULL
is_internal_note BOOLEAN DEFAULT FALSE   -- agent-only notes, not visible to customer
created_at       TIMESTAMPTZ DEFAULT NOW()
```

---

### `support_attachments`

```sql
id               UUID PRIMARY KEY
ticket_id        UUID NOT NULL REFERENCES support_tickets(id)
message_id       UUID REFERENCES support_messages(id)
file_name        VARCHAR(255)
file_url         TEXT NOT NULL
file_type        VARCHAR(64)
file_size_bytes  INTEGER
uploaded_by      UUID REFERENCES users(id)
created_at       TIMESTAMPTZ DEFAULT NOW()
```

---

### `support_events`

Immutable audit trail of every status change, assignment, and action on a ticket.

```sql
id               UUID PRIMARY KEY
ticket_id        UUID NOT NULL REFERENCES support_tickets(id)
event_type       ENUM('created', 'assigned', 'status_changed', 'priority_changed',
                       'escalated', 'message_sent', 'refund_initiated', 'fare_adjusted',
                       'resolved', 'closed', 'reopened')
actor_id         UUID REFERENCES users(id)
actor_role       VARCHAR(32)
previous_value   JSONB
new_value        JSONB
note             TEXT
created_at       TIMESTAMPTZ DEFAULT NOW()
```

---

### `support_macros`

Predefined response templates for common issues.

```sql
id               UUID PRIMARY KEY
name             VARCHAR(128) NOT NULL
category         VARCHAR(64)
subject_template TEXT
body_template    TEXT
is_active        BOOLEAN DEFAULT TRUE
created_at       TIMESTAMPTZ DEFAULT NOW()
```

---

## SLA Configuration

SLA targets are configurable per priority:

| Priority | First Response | Resolution |
|---|---|---|
| urgent | 1 hour | 4 hours |
| high | 4 hours | 24 hours |
| medium | 12 hours | 72 hours |
| low | 48 hours | 7 days |

SLA timers pause when ticket is in `waiting_customer` state.

---

## API Endpoints

### POST `/support/tickets`

Create a new ticket (rider/driver).

**Body:**
```json
{
  "category": "payment",
  "sub_category": "overcharged",
  "subject": "I was charged twice",
  "description": "...",
  "ride_id": "..."
}
```

---

### GET `/support/tickets`

List caller's own tickets (paginated).

---

### GET `/support/tickets/:id`

Get ticket with messages, attachments, events.

---

### POST `/support/tickets/:id/messages`

Send a message on a ticket.

---

### POST `/support/tickets/:id/attachments`

Upload an attachment to a ticket.

---

### Admin: GET `/admin/support/tickets`

List all tickets with filtering (status, category, assignee, date range).

---

### Admin: PATCH `/admin/support/tickets/:id/assign`

Assign ticket to an agent or team.

---

### Admin: PATCH `/admin/support/tickets/:id/status`

Change ticket status (with reason).

---

### Admin: POST `/admin/support/tickets/:id/refund`

Initiate refund directly from support context (audited action, calls refund service).

---

### Admin: POST `/admin/support/tickets/:id/fare-adjustment`

Adjust fare for the linked ride (audited, creates ledger correction entry).

---

## Unified Ride View for Agents

When a ticket is linked to a ride, the support UI (or admin API) should show:

```
Ride → Driver → Fare → Payment → Wallet Debit → Ledger Entries → 
Notifications Sent → GPS Track → Status History → Incidents
```

Endpoint: `GET /admin/support/rides/:rideId/full-context`

Returns a denormalized snapshot of the entire ride lifecycle for agent use.

---

## Events

| Event | Producer | Consumer |
|---|---|---|
| `support.ticket_created` | Support Service | Notification (auto-reply to user), Assignment Worker |
| `support.ticket_assigned` | Admin Action | Notification (to agent) |
| `support.ticket_escalated` | Support Service | Escalation team notification |
| `support.ticket_resolved` | Agent Action | Notification (to customer), CSAT survey |
| `support.refund_initiated` | Agent via Support | Refund Service |
| `support.fare_adjusted` | Agent via Support | Ledger Service, Notification |

---

## Testing Requirements

- Ticket created with required fields
- Agent can send message not visible to customer (internal note)
- SLA breach detection fires before deadline
- Refund from support context creates correct ledger entry
- Fare adjustment creates reversal + new ledger entry, not a modification
- All agent actions are recorded in `support_events`
- Ticket cannot be re-opened after closing without an authorized role
