import test from 'node:test';
import assert from 'node:assert/strict';
import { getSocketStats } from '../src/sockets/index.js';

test('Socket.IO test helpers and stats', async (t) => {
  await t.test('getSocketStats returns initialized structure', () => {
    const stats = getSocketStats();
    assert.ok(typeof stats === 'object');
    assert.ok('initialized' in stats);
    assert.ok('totalClients' in stats);
  });
});
