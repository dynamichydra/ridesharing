import 'dotenv/config';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCondition, resolveVisibleQuestionIds } from '../src/modules/onboarding/condition.js';

describe('Dynamic Onboarding Condition & Evaluation Engine', () => {

  test('Condition Evaluation: equals operator matches boolean, string, numbers', () => {
    assert.equal(evaluateCondition('equals', true, true), true);
    assert.equal(evaluateCondition('equals', true, false), false);
    assert.equal(evaluateCondition('equals', 'yes', 'yes'), true);
    assert.equal(evaluateCondition('equals', 5, 5), true);
    assert.equal(evaluateCondition('equals', 'any', null), false);
  });

  test('Condition Evaluation: not_equals operator', () => {
    assert.equal(evaluateCondition('not_equals', true, false), true);
    assert.equal(evaluateCondition('not_equals', true, true), false);
  });

  test('Condition Evaluation: in operator matches array membership', () => {
    assert.equal(evaluateCondition('in', ['car', 'bike'], 'car'), true);
    assert.equal(evaluateCondition('in', ['car', 'bike'], 'truck'), false);
  });

  test('Condition Evaluation: gt and lt numerical operators', () => {
    assert.equal(evaluateCondition('gt', 3, 5), true);
    assert.equal(evaluateCondition('gt', 3, 2), false);
    assert.equal(evaluateCondition('lt', 3, 2), true);
  });

  test('Resolve Visible Question IDs: Unconditional questions always visible, dependent questions resolve conditionally', () => {
    const questions = [
      { id: 'q1', dependsOnQuestionId: null },
      { id: 'q2', dependsOnQuestionId: 'q1', dependsOnOperator: 'equals', dependsOnValue: true },
      { id: 'q3', dependsOnQuestionId: 'q1', dependsOnOperator: 'equals', dependsOnValue: false },
    ];

    // Case 1: q1 answer is true -> q1 and q2 visible, q3 hidden
    const visibleWhenTrue = resolveVisibleQuestionIds(questions, { q1: true });
    assert.ok(visibleWhenTrue.has('q1'));
    assert.ok(visibleWhenTrue.has('q2'));
    assert.ok(!visibleWhenTrue.has('q3'));

    // Case 2: q1 answer is false -> q1 and q3 visible, q2 hidden
    const visibleWhenFalse = resolveVisibleQuestionIds(questions, { q1: false });
    assert.ok(visibleWhenFalse.has('q1'));
    assert.ok(!visibleWhenFalse.has('q2'));
    assert.ok(visibleWhenFalse.has('q3'));

    // Case 3: q1 unanswered -> only q1 visible
    const visibleWhenEmpty = resolveVisibleQuestionIds(questions, {});
    assert.ok(visibleWhenEmpty.has('q1'));
    assert.ok(!visibleWhenEmpty.has('q2'));
    assert.ok(!visibleWhenEmpty.has('q3'));
  });

});
