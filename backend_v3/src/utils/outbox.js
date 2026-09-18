import { outboxEvents } from '../../drizzle/schema/index.js';

// `tx` is required — never falls back to a bare `db` insert — because the whole point of the
// outbox is that this row commits atomically with the domain write it accompanies. A caller
// with no transaction handle has nothing to be atomic with, so this throws instead of quietly
// reintroducing the dual-write bug (DB commits, event insert fails/skipped, event lost).
export async function enqueueEvent(tx, { aggregateType, aggregateId, topic, payload, key }) {
  if (!tx) throw new Error('enqueueEvent requires a transaction handle (tx) — see backend/docs or outbox-relay.job.js');
  if (!aggregateType) throw new Error('enqueueEvent requires aggregateType');
  if (!topic) throw new Error('enqueueEvent requires topic');

  await tx.insert(outboxEvents).values({
    aggregateType,
    aggregateId: aggregateId != null ? String(aggregateId) : null,
    topic,
    eventKey: key != null ? String(key) : null,
    payload,
  });
}
