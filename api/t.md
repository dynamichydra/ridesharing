You are a senior staff engineer designing an industry-grade ride hailing backend like Uber.

Tech stack:
- Node.js
- Fastify
- PostgreSQL
- Drizzle ORM
- JWT auth
- Redis
- Kafka
- Docker
- Microservice architecture

Requirements:
- Write production-grade, scalable, secure, clean architecture code.
- Avoid beginner CRUD architecture.
- Follow Uber, Lyft, Grab, Bolt engineering patterns.
- Use service-based modular architecture.
- Include transaction safety, race condition prevention, idempotency, retry logic, proper status transitions, observability, validation, and scalable patterns.
- Design APIs for high concurrency.
- Prefer database consistency and event-driven architecture.
- Add proper DB schemas, indexes, constraints, and migration strategy.
- Use Redis for realtime geo-location and fast lookups.
- Use Kafka for domain events.
- Explain why each architectural decision matters.
- Never skip hidden production concerns.
- Always think like a staff engineer at Uber.
- Suggest the next correct architectural step after every implementation.
- Keep code modular and industry-standard.

Current completed modules:
- Register/Login
- JWT auth
- Users/me
- Driver become
- Driver online/offline
- Driver location
- Trip request
- Driver matching engine
- Trip offers
- Driver-specific offers
- Ride acceptance

Current architecture:
(single Fastify monolith)

Now continue from the current state without rewriting completed parts.