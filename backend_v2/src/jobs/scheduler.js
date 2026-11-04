/**
 * Idempotent repeat-job registration. Every instance calls this on boot; BullMQ keeps exactly
 * one scheduler per id, so there is no need to `obliterate()` the queue first — which used to
 * wipe in-flight and waiting jobs of *other* instances on every rolling deploy.
 *
 * `repeat` is `{ every: ms }` or `{ pattern: 'cron' }`.
 */
export async function scheduleRepeating(queue, schedulerId, repeat, { name = schedulerId, data = {} } = {}) {
  // Remove repeat entries left by the old `queue.add(name, data, { repeat })` registration so
  // the job doesn't run twice after upgrading.
  const existing = await queue.getJobSchedulers().catch(() => []);
  for (const entry of existing) {
    const id = entry.id ?? entry.key;
    if (id && id !== schedulerId && entry.name === name) {
      await queue.removeJobScheduler(id).catch(() => {});
    }
  }
  await queue.upsertJobScheduler(schedulerId, repeat, { name, data });
}
