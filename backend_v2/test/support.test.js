import { test } from 'node:test';
import assert from 'node:assert/strict';

function calculateSlaDueAt(priority, now = new Date()) {
  let hours = 12;
  if (priority === 'urgent') hours = 2;
  else if (priority === 'high') hours = 4;
  else if (priority === 'medium') hours = 12;
  else if (priority === 'low') hours = 24;

  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

function generateTicketNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `TCK-${year}-${random}`;
}

function maskSensitiveData(content) {
  if (!content || typeof content !== 'string') return content;
  const ccRegex = /\b(?:\d[ -]*?){13,19}\b/g;
  const tokenRegex = /Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi;
  return content
    .replace(ccRegex, '[REDACTED_CARD]')
    .replace(tokenRegex, 'Bearer [REDACTED_TOKEN]');
}

test('SLA due date calculation assigns accurate hours based on priority', () => {
  const baseTime = new Date('2026-10-01T12:00:00.000Z');

  const urgentDue = calculateSlaDueAt('urgent', baseTime);
  assert.equal(urgentDue.toISOString(), '2026-10-01T14:00:00.000Z');

  const highDue = calculateSlaDueAt('high', baseTime);
  assert.equal(highDue.toISOString(), '2026-10-01T16:00:00.000Z');

  const mediumDue = calculateSlaDueAt('medium', baseTime);
  assert.equal(mediumDue.toISOString(), '2026-10-02T00:00:00.000Z');

  const lowDue = calculateSlaDueAt('low', baseTime);
  assert.equal(lowDue.toISOString(), '2026-10-02T12:00:00.000Z');
});

test('Ticket number generator adheres to TCK-YYYY-XXXXXX format', () => {
  const ticketNumber = generateTicketNumber();
  const currentYear = new Date().getFullYear();
  const regex = new RegExp(`^TCK-${currentYear}-\\d{6}$`);
  assert.match(ticketNumber, regex);
});

test('Data masking redacts credit card numbers and Bearer tokens', () => {
  const rawText = 'My card 4532-0123-4567-8901 was charged extra. Token Bearer eyJhbGciOiJIUzI1NiJ9.test';
  const cleanText = maskSensitiveData(rawText);

  assert.equal(cleanText.includes('4532-0123-4567-8901'), false);
  assert.equal(cleanText.includes('[REDACTED_CARD]'), true);
  assert.equal(cleanText.includes('[REDACTED_TOKEN]'), true);
});
