import test from 'node:test';
import assert from 'node:assert/strict';
import { greeting } from './greeting.ts';

test('greeting by hour', () => {
  assert.equal(greeting(0), 'Good morning');
  assert.equal(greeting(11), 'Good morning');
  assert.equal(greeting(12), 'Good afternoon');
  assert.equal(greeting(16), 'Good afternoon');
  assert.equal(greeting(17), 'Good evening');
  assert.equal(greeting(23), 'Good evening');
});
