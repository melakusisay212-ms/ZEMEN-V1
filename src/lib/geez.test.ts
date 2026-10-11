import test from 'node:test';
import assert from 'node:assert/strict';
import { geezNumeral } from './geez.ts';

test('Ge\'ez numerals for ones, tens and combinations', () => {
  assert.equal(geezNumeral(1), '፩');
  assert.equal(geezNumeral(9), '፱');
  assert.equal(geezNumeral(10), '፲');
  assert.equal(geezNumeral(29), '፳፱');
  assert.equal(geezNumeral(30), '፴');
  assert.equal(geezNumeral(99), '፺፱');
});

test('falls back to digits outside 1-99', () => {
  assert.equal(geezNumeral(0), '0');
  assert.equal(geezNumeral(100), '100');
  assert.equal(geezNumeral(2019), '2019');
});
