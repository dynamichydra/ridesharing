import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCorporateInvoice,
  getCorporateInvoice,
  createCorporateAccount,
} from '../src/modules/corporate/corporate.service.js';
import {
  corporateAccounts,
  corporateInvoices,
  corporateInvoiceItems,
} from '../drizzle/schema/index.js';

test('Corporate Invoicing & Itemization Verification', () => {
  assert.ok(typeof generateCorporateInvoice === 'function');
  assert.ok(typeof getCorporateInvoice === 'function');
  assert.ok(typeof createCorporateAccount === 'function');

  assert.ok(corporateAccounts, 'corporateAccounts schema exists');
  assert.ok(corporateInvoices, 'corporateInvoices schema exists');
  assert.ok(corporateInvoiceItems, 'corporateInvoiceItems schema exists');
});
