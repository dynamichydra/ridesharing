# Full-Stack Support System Architecture & Messaging Protocol Specification

## 1. Executive Summary & Architectural Overview

### 1.1 Scope & Purpose
This document provides the definitive implementation specification for an enterprise-grade, real-time **Support & Customer Operations System** across the entire ride-sharing platform:
- **Backend (`backend_v2`)**: Fastify REST API, Drizzle ORM (PostgreSQL), Socket.IO `/support` namespace, Redis session/state cache, Kafka event streaming, and BullMQ background jobs.
- **Customer Mobile App (`app/ride_sharing_customer`)**: Flutter application with Clean Architecture (`flutter_bloc`, `get_it`, `go_router`, `dio`) for riders to browse FAQs, open trip/account support tickets, and chat in real-time with agents/bots.
- **Driver Mobile App (`app/ride_share_driver`)**: Flutter application for drivers covering fare disputes, subscription/payout queries, vehicle/document appeals, and safety follow-ups.
- **Admin & Support Operations Portal (`portal`)**: Portal for support agents and ops leads to manage ticket queues, SLA timers, macro responses, and CSAT metrics.

---

### 1.2 System Context & Relationship Matrix

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT APPS                                     │
│  ┌───────────────────────────────┐                 ┌───────────────────────────┐  │
│  │ Customer App (Rider)          │                 │ Driver App (Driver)       │  │
│  │ lib/features/support/         │                 │ lib/features/support/     │  │
│  └──────────────┬────────────────┘                 └─────────────┬─────────────┘  │
└─────────────────┼────────────────────────────────────────────────┼────────────────┘
                  │ HTTPS REST / WebSocket (/support)              │ HTTPS REST / WebSocket (/support)
                  ▼                                                ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                 BACKEND (backend_v2)                              │
│                                                                                   │
│  ┌─────────────────────────────┐                    ┌──────────────────────────┐  │
│  │ REST APIs (/api/v1/support) │                    │ Socket.IO /support       │  │
│  └──────────────┬──────────────┘                    └────────────┬─────────────┘  │
│                 │                                                │                │
│                 ▼                                                ▼                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                             Support Domain Service                          │  │
│  └──────┬───────────────────────┬────────────────────────┬─────────────────────┘  │
│         │                       │                        │                        │
│         ▼                       ▼                        ▼                        │
│  ┌──────────────┐      ┌────────────────┐       ┌─────────────────┐               │
│  │ Postgres DB  │      │ Redis Cache    │       │ Kafka Topics    │               │
│  │ (Drizzle ORM)│      │ (State/Typing) │       │ (Event Bus)     │               │
│  └──────────────┘      └────────────────┘       └────────┬────────┘               │
└──────────────────────────────────────────────────────────┼────────────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ BullMQ Workers  │
                                                  │ (SLA Escalations│
                                                  │ CSAT Reminders) │
                                                  └─────────────────┘
```

---

## 2. Database Schemas (`backend_v2/drizzle/schema/`)

To support a multi-tenant, role-aware, and audited support system, the database layer consists of 7 dedicated tables.

### 2.1 `support_categories.js`
Defines hierarchical support topics (e.g., *Trip Issues -> Overcharged Fare* or *Driver Wallet -> Payout Delay*).

```javascript
import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const supportCategories = pgTable('support_categories', {
  id:           uuid('id').primaryKey().defaultRandom(),
  parentId:     uuid('parent_id'), // Self-reference for 2-tier hierarchy (Category -> Subcategory)
  targetRole:   varchar('target_role', { length: 20 }).notNull(), // 'rider' | 'driver' | 'both'
  name:         varchar('name', { length: 100 }).notNull(),
  slug:         varchar('slug', { length: 120 }).notNull().unique(),
  description:  text('description'),
  iconUrl:      text('icon_url'),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive:     boolean('is_active').default(true).notNull(),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});
```

---

### 2.2 `support_faqs.js`
Self-service knowledge base articles accessible before ticket creation.

```javascript
import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { supportCategories } from './support-categories.js';

export const supportFaqs = pgTable('support_faqs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  categoryId:   uuid('category_id').references(() => supportCategories.id).notNull(),
  targetRole:   varchar('target_role', { length: 20 }).notNull(), // 'rider' | 'driver' | 'both'
  question:     text('question').notNull(),
  answer:       text('answer').notNull(), // Supports Markdown formatting
  viewCount:    integer('view_count').default(0).notNull(),
  helpfulYes:   integer('helpful_yes').default(0).notNull(),
  helpfulNo:    integer('helpful_no').default(0).notNull(),
  isPublished:  boolean('is_published').default(true).notNull(),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});
```

---

### 2.3 `support_tickets.js`
The main ticket lifecycle entity representing customer/driver support requests.

```javascript
import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { supportCategories } from './support-categories.js';
import { rides } from './rides.js';
import { admins } from './admins.js';

export const supportTickets = pgTable('support_tickets', {
  id:             uuid('id').primaryKey().defaultRandom(),
  ticketNumber:   varchar('ticket_number', { length: 30 }).notNull().unique(), // e.g. TCK-2026-894012
  userType:       varchar('user_type', { length: 10 }).notNull(), // 'rider' | 'driver'
  userId:         uuid('user_id').notNull(),
  categoryId:     uuid('category_id').references(() => supportCategories.id).notNull(),
  rideId:         uuid('ride_id').references(() => rides.id), // Nullable for account/wallet tickets
  
  subject:        varchar('subject', { length: 200 }).notNull(),
  status:         varchar('status', { length: 20 }).default('open').notNull(), 
                  // 'open' | 'assigned' | 'pending_user' | 'resolved' | 'closed'
  priority:       varchar('priority', { length: 15 }).default('medium').notNull(), 
                  // 'low' | 'medium' | 'high' | 'urgent'
  
  assignedAdminId: uuid('assigned_admin_id').references(() => admins.id),
  assignedAt:     timestamp('assigned_at'),
  
  firstRespondedAt: timestamp('first_responded_at'),
  slaDueAt:       timestamp('sla_due_at').notNull(), // Targeted resolution deadline
  slaBreached:    boolean('sla_breached').default(false).notNull(),
  
  resolvedAt:     timestamp('resolved_at'),
  closedAt:       timestamp('closed_at'),
  
  createdAt:      timestamp('created_at').defaultNow(),
  updatedAt:      timestamp('updated_at').defaultNow(),
});
```

---

### 2.4 `support_ticket_messages.js`
Audit trail of real-time multi-party conversation thread messages.

```javascript
import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { supportTickets } from './support-tickets.js';

export const supportTicketMessages = pgTable('support_ticket_messages', {
  id:           uuid('id').primaryKey().defaultRandom(),
  ticketId:     uuid('ticket_id').references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
  senderType:   varchar('sender_type', { length: 15 }).notNull(), 
                // 'rider' | 'driver' | 'agent' | 'bot' | 'system'
  senderId:     uuid('sender_id'), // Nullable for 'bot' and 'system'
  
  messageType:  varchar('message_type', { length: 20 }).default('text').notNull(), 
                // 'text' | 'image' | 'audio' | 'location' | 'action_card' | 'system_event'
  content:      text('content').notNull(),
  metadata:     jsonb('metadata'), // e.g. location pings, refund action previews, attachment arrays
  
  isInternalNote: boolean('is_internal_note').default(false).notNull(), // Visible only to support agents
  isReadByUser: boolean('is_read_by_user').default(false).notNull(),
  isReadByAgent: boolean('is_read_by_agent').default(false).notNull(),
  
  createdAt:    timestamp('created_at').defaultNow(),
});
```

---

### 2.5 `support_ticket_attachments.js`
Media files uploaded by users or agents during ticket processing.

```javascript
import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { supportTicketMessages } from './support-ticket-messages.js';

export const supportTicketAttachments = pgTable('support_ticket_attachments', {
  id:           uuid('id').primaryKey().defaultRandom(),
  messageId:    uuid('message_id').references(() => supportTicketMessages.id, { onDelete: 'cascade' }).notNull(),
  fileUrl:      varchar('file_url', { length: 500 }).notNull(),
  fileType:     varchar('file_type', { length: 50 }).notNull(), // 'image/jpeg', 'image/png', 'audio/aac', 'application/pdf'
  fileSize:     integer('file_size').notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  createdAt:    timestamp('created_at').defaultNow(),
});
```

---

### 2.6 `support_csat_ratings.js`
Post-ticket resolution Customer Satisfaction (CSAT) evaluations.

```javascript
import { pgTable, uuid, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { supportTickets } from './support-tickets.js';

export const supportCsatRatings = pgTable('support_csat_ratings', {
  id:         uuid('id').primaryKey().defaultRandom(),
  ticketId:   uuid('ticket_id').references(() => supportTickets.id).notNull().unique(),
  rating:     integer('rating').notNull(), // 1 to 5 stars
  feedback:   text('feedback'),
  tags:       text('tags'), // Comma-separated feedback tags (e.g. 'Fast response', 'Polite', 'Unresolved')
  createdAt:  timestamp('created_at').defaultNow(),
});
```

---

## 3. Real-Time Socket.IO Messaging Protocol Specification

To enable instantaneous, low-latency communication between users (riders/drivers) and support agents without polling, Socket.IO is configured with a dedicated `/support` namespace.

### 3.1 Namespace & Handshake Protocol

- **Namespace**: `/support`
- **Connection Handshake**:

```javascript
// Client connection initialization (Flutter / Web)
const socket = io('https://api.rideshare.com/support', {
  transports: ['websocket'],
  auth: {
    token: 'Bearer <JWT_ACCESS_TOKEN>',
    clientRole: 'rider' // 'rider' | 'driver' | 'admin'
  }
});
```

---

### 3.2 WebSocket Event Contract Matrix

| Event Name | Direction | Payload Schema | Purpose / Behavior |
| :--- | :--- | :--- | :--- |
| `ticket:subscribe` | Client -> Server | `{ ticketId: string }` | Joins room `ticket:<ticketId>`. Server verifies user ownership or agent scope. |
| `ticket:unsubscribe` | Client -> Server | `{ ticketId: string }` | Leaves room `ticket:<ticketId>`. |
| `ticket:message_send` | Client -> Server | `{ ticketId: string, clientMsgId: string, messageType: string, content: string, attachments?: string[] }` | Emits message. Server persists to DB, triggers Kafka, broadcasts to room. |
| `ticket:message_ack` | Server -> Client | `{ clientMsgId: string, messageId: string, timestamp: string }` | Acknowledges server receipt and DB persistence. |
| `ticket:message_receive`| Server -> Client | `SupportMessageObject` | Emitted to room members when a new message is posted. |
| `ticket:typing_start` | Client -> Server | `{ ticketId: string }` | Broadcasts typing state to room via Redis cache. |
| `ticket:typing_stop` | Client -> Server | `{ ticketId: string }` | Clears typing state in room. |
| `ticket:read_receipt` | Client -> Server | `{ ticketId: string, messageIds: string[] }` | Marks messages read by current user/agent and notifies opposing party. |
| `ticket:status_changed` | Server -> Client | `{ ticketId: string, oldStatus: string, newStatus: string, updatedBy: string }` | Emitted when ticket is resolved, re-opened, or assigned. |
| `ticket:agent_assigned` | Server -> Client | `{ ticketId: string, agent: { id: string, name: string, avatarUrl: string } }` | Notifies user that a live agent joined the chat. |
| `ticket:csat_prompt` | Server -> Client | `{ ticketId: string, ticketNumber: string }` | Prompts user app to present CSAT rating modal upon resolution. |

---

### 3.3 Protocol Flow Diagram

```
Customer App                         Backend (/support NS)                    Support Agent Portal
    │                                         │                                        │
    │ ─── 1. ticket:subscribe {ticketId} ───> │                                        │
    │ <── 2. ticket:subscribed ────────────── │                                        │
    │                                         │                                        │
    │ ─── 3. ticket:typing_start ───────────> │ ─── 4. ticket:typing_start ──────────> │
    │                                         │                                        │
    │ ─── 5. ticket:message_send ───────────> │                                        │
    │                                         │ ─── 6. Save to DB & Kafka Event ─────> │
    │ <── 7. ticket:message_ack ───────────── │                                        │
    │                                         │ ─── 8. ticket:message_receive ───────> │
    │                                         │                                        │
    │                                         │ <── 9. ticket:message_send (Agent) ─── │
    │ <── 10. ticket:message_receive ──────── │                                        │
    │                                         │                                        │
```

---

## 4. REST API Specifications (`backend_v2`)

All endpoints adhere to the load-bearing Fastify response envelope (`sendSuccess`, `sendList`, `sendError`).

### 4.1 Help Center & FAQ Endpoints

#### `GET /api/v1/support/categories`
Retrieves support category hierarchy filtered by target user role.
- **Headers**: `Authorization: Bearer <token>`
- **Query Params**: `targetRole` (optional, defaults to auth token role)
- **Response**:
```json
{
  "SUCCESS": true,
  "MESSAGE": "Support categories retrieved",
  "DATA": [
    {
      "id": "c1a2b3c4-...",
      "name": "Trip & Fare Issues",
      "slug": "trip-fare-issues",
      "iconUrl": "https://cdn.rideshare.com/icons/fare.png",
      "subcategories": [
        {
          "id": "s1s2s3s4-...",
          "name": "Overcharged for Ride",
          "slug": "overcharged-for-ride"
        }
      ]
    }
  ]
}
```

#### `GET /api/v1/support/faqs`
Search or browse knowledge base articles.
- **Query Params**: `categoryId`, `query`, `page`, `limit`
- **Response**: Returns standard list envelope with pagination metadata.

#### `POST /api/v1/support/faqs/:id/vote`
Records user feedback on article helpfulness.
- **Body**: `{ "wasHelpful": true }`

---

### 4.2 Ticket Lifecycle Endpoints

#### `POST /api/v1/support/tickets`
Submits a new support ticket.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "categoryId": "s1s2s3s4-...",
  "rideId": "r9a8b7c6-...",
  "subject": "Fare discrepancy on pickup location",
  "description": "I was charged $24.50 instead of the quoted $18.00.",
  "attachments": [
    "https://storage.rideshare.com/uploads/support/proof-123.jpg"
  ]
}
```
- **Response**:
```json
{
  "SUCCESS": true,
  "MESSAGE": "Ticket created successfully",
  "DATA": {
    "ticketId": "t1k2t3k4-...",
    "ticketNumber": "TCK-2026-981240",
    "status": "open",
    "priority": "medium",
    "slaDueAt": "2026-09-30T22:41:45.000Z"
  }
}
```

#### `GET /api/v1/support/tickets`
Fetches ticket history for logged-in rider or driver.
- **Query Params**: `status` (`open` | `resolved` | `all`), `page`, `limit`

#### `GET /api/v1/support/tickets/:id`
Retrieves ticket detail, message history, agent assignment status, and attachment links.

#### `POST /api/v1/support/attachments/presigned-url`
Generates S3 presigned PUT URL for media attachments.
- **Request Body**: `{ "fileType": "image/jpeg", "fileSize": 1048576 }`
- **Response**: `{ "uploadUrl": "https://s3.amazonaws.com/...", "fileUrl": "https://cdn.rideshare.com/..." }`

#### `POST /api/v1/support/tickets/:id/csat`
Submits CSAT rating after ticket resolution.
- **Request Body**: `{ "rating": 5, "feedback": "Super fast resolution!", "tags": "Fast response,Polite" }`

---

## 5. Background Jobs, Kafka Events & Escalation Engine

### 5.1 Kafka Event Topics

The support module publishes and subscribes to standard Kafka topics via `src/config/kafka.js`:

1. **`support.ticket.created`**: Broadcast when a new ticket is submitted. Triggers auto-assignment rules and agent notifications.
2. **`support.ticket.updated`**: Broadcast when ticket status or priority changes.
3. **`support.message.sent`**: Triggers Firebase Cloud Messaging (FCM) push notifications if the recipient is disconnected from Socket.IO.
4. **`support.sla.breached`**: Published when SLA threshold passes without resolution. Triggers escalation to support supervisor dashboard.

---

### 5.2 BullMQ Background Workers (`backend_v2/src/jobs/`)

- **`supportSlaWorker.js`**: Checks tickets approaching or exceeding `slaDueAt`. Updates `slaBreached = true` and emits alerts.
- **`supportAutoCloseWorker.js`**: Automatically closes tickets in `pending_user` state after 48 hours of user inactivity.
- **`supportCsatReminderWorker.js`**: Sends a push notification reminder 2 hours after ticket resolution if CSAT has not been submitted.

---

## 6. Customer App Implementation (`app/ride_sharing_customer`)

### 6.1 Feature Directory Structure

```
lib/features/support/
├── data/
│   ├── datasources/
│   │   ├── support_remote_data_source.dart
│   │   └── support_socket_client.dart
│   ├── models/
│   │   ├── support_category_model.dart
│   │   ├── support_faq_model.dart
│   │   ├── support_ticket_model.dart
│   │   └── support_message_model.dart
│   └── repositories/
│       └── support_repository_impl.dart
├── domain/
│   ├── entities/
│   │   ├── support_ticket.dart
│   │   └── support_message.dart
│   ├── repositories/
│   │   └── support_repository.dart
│   └── usecases/
│       ├── get_support_categories.dart
│       ├── create_support_ticket.dart
│       ├── get_ticket_messages.dart
│       └── send_ticket_message.dart
└── presentation/
    ├── bloc/
    │   ├── help_center/
    │   │   ├── help_center_bloc.dart
    │   │   ├── help_center_event.dart
    │   │   └── help_center_state.dart
    │   └── support_chat/
    │       ├── support_chat_bloc.dart
    │       ├── support_chat_event.dart
    │       └── support_chat_state.dart
    ├── pages/
    │   ├── help_center_page.dart
    │   ├── faq_detail_page.dart
    │   ├── create_ticket_page.dart
    │   ├── ticket_history_page.dart
    │   └── support_chat_page.dart
    └── widgets/
        ├── category_card.dart
        ├── chat_bubble.dart
        ├── csat_rating_dialog.dart
        └── ride_selection_picker.dart
```

---

### 6.2 Customer App Support Flow & Clean Architecture Integration

1. **Dependency Injection Registration (`lib/core/services/injection_container.dart`)**:
   Register `SupportRemoteDataSource`, `SupportSocketClient`, `SupportRepository`, and `SupportChatBloc` in `get_it`.

2. **Routing Setup (`lib/core/routing/app_router.dart`)**:
   - `/support` -> `HelpCenterPage`
   - `/support/create` -> `CreateTicketPage(rideId: state.extra)`
   - `/support/tickets` -> `TicketHistoryPage`
   - `/support/chat/:ticketId` -> `SupportChatPage(ticketId: params['ticketId'])`

3. **Socket Client Lifecycle**:
   `SupportSocketClient` listens for real-time events (`ticket:message_receive`, `ticket:agent_assigned`, `ticket:status_changed`) and emits events directly to `SupportChatBloc`.

---

## 7. Driver App Implementation (`app/ride_share_driver`)

### 7.1 Driver Support Specifics

Drivers face unique operational challenges requiring specialized support flows:
- **Trip Fare Adjustments**: Toll fee reimbursement, route detour dispute, cash collection discrepancy.
- **Earnings & Subscription**: Weekly payout delay, subscription plan renewal issue, incentive bonus query.
- **Account & Verification**: Vehicle registration document rejection appeal, background check inquiry.
- **Safety & Incident Report**: Rider misconduct, property damage report.

---

### 7.2 Driver Feature Directory Structure

```
lib/features/support/
├── data/
│   ├── datasources/driver_support_remote_data_source.dart
│   └── repositories/driver_support_repository_impl.dart
├── domain/
│   ├── usecases/submit_fare_dispute_ticket.dart
│   └── usecases/appeal_document_rejection.dart
└── presentation/
    ├── bloc/
    │   ├── driver_support_hub_bloc.dart
    │   └── driver_support_chat_bloc.dart
    └── pages/
        ├── driver_support_hub_page.dart
        ├── trip_dispute_selection_page.dart
        ├── driver_create_ticket_page.dart
        └── driver_support_chat_page.dart
```

---

## 8. Security, RBAC & Data Privacy

1. **Role-Based Access Control**:
   - Riders can only access ticket threads where `userId == riderId` and `userType == 'rider'`.
   - Drivers can only access ticket threads where `userId == driverId` and `userType == 'driver'`.
   - Support Agents/Admins can access tickets assigned to their queue or role level (`admin`, `super_admin`).
2. **Media Storage Security**:
   - Attachment uploads go to isolated S3 path `/support/{ticketId}/{fileId}`.
   - S3 bucket access is strictly private; read access is granted only via presigned GET URLs with a 15-minute expiration time.
3. **Data Masking**:
   - Credit card numbers, bank routing details, and raw auth tokens are stripped automatically via regex filters before persisting message content.

---

## 9. Phased Rollout Roadmap

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Backend Database & Core REST APIs (Week 1)                               │
│ • Create Drizzle schema files and execute migration.                              │
│ • Implement support categories, FAQs, and ticket CRUD services.                   │
│ • Seed standard Support Categories for Rider & Driver apps.                       │
├───────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Socket.IO /support Namespace & Messaging Engine (Week 2)                 │
│ • Implement Socket.IO /support namespace handlers and JWT authentication.        │
│ • Configure Kafka event producers and FCM background worker for offline chat.     │
├───────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Customer Mobile App (`ride_sharing_customer`) Integration (Week 3)        │
│ • Implement Help Center, FAQ viewer, Ticket Creation, and Live Chat UI.           │
│ • Connect Flutter Bloc with Socket.IO client and test offline optimistic chat.   │
├───────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Driver Mobile App (`ride_share_driver`) Integration (Week 4)              │
│ • Implement Driver Support Hub, Fare Dispute Wizard, and Document Appeal UI.      │
│ • Integrate with Driver Ride History for one-tap trip issue ticket creation.      │
├───────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: Support Operations Portal (`portal`) & Analytics (Week 5)                │
│ • Build Agent Queue Dashboard, SLA breach indicators, and canned responses.       │
│ • Add CSAT performance report cards for support agents.                          │
└───────────────────────────────────────────────────────────────────────────────────┘
```
