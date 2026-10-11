import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBack, pushBack } from './backStack.ts';

test('back closes the most recently opened overlay first', () => {
  const closed: string[] = [];
  const offA = pushBack(() => closed.push('a'));
  pushBack(() => closed.push('b'));
  assert.equal(handleBack(), true);
  assert.deepEqual(closed, ['b']);
  assert.equal(handleBack(), true);
  assert.deepEqual(closed, ['b', 'a']);
  assert.equal(handleBack(), false);
  offA();
});

test('an overlay that unmounts by itself is no longer closed by back', () => {
  const closed: string[] = [];
  const off = pushBack(() => closed.push('x'));
  off();
  assert.equal(handleBack(), false);
  assert.deepEqual(closed, []);
});
