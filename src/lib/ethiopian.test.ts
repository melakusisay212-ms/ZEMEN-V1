import test from 'node:test';
import assert from 'node:assert/strict';
import {
  daysInEthMonth,
  ethToGregorian,
  ethToJdn,
  gregorianToEth,
  gregorianToJdn,
  isEthLeapYear,
  isValidEthDate,
  jdnToEth,
  weekdayOfJdn,
} from './ethiopian.ts';

test('Ethiopian new year 2016 E.C. is 12 Sep 2023 (year before a Gregorian leap year)', () => {
  assert.deepEqual(gregorianToEth({ year: 2023, month: 9, day: 12 }), { year: 2016, month: 1, day: 1 });
});

test('Ethiopian new year 2019 E.C. is 11 Sep 2026', () => {
  assert.deepEqual(gregorianToEth({ year: 2026, month: 9, day: 11 }), { year: 2019, month: 1, day: 1 });
});

test('9 Oct 2026 is Meskerem 29, 2019', () => {
  assert.deepEqual(gregorianToEth({ year: 2026, month: 10, day: 9 }), { year: 2019, month: 1, day: 29 });
});

test('leap year: the day before 2016 new year is Pagume 6, 2015', () => {
  assert.deepEqual(gregorianToEth({ year: 2023, month: 9, day: 11 }), { year: 2015, month: 13, day: 6 });
  assert.ok(isEthLeapYear(2015));
  assert.equal(daysInEthMonth(2015, 13), 6);
});

test('normal year: Pagume has 5 days and day 5 is 10 Sep', () => {
  assert.equal(daysInEthMonth(2018, 13), 5);
  assert.deepEqual(gregorianToEth({ year: 2026, month: 9, day: 10 }), { year: 2018, month: 13, day: 5 });
});

test('Tahsas 29, 2015 (a leap year) is 7 Jan 2023', () => {
  assert.deepEqual(ethToGregorian({ year: 2015, month: 4, day: 29 }), { year: 2023, month: 1, day: 7 });
});

test('Adwa Victory Day (Yekatit 23, 2016) is 2 Mar 2024', () => {
  assert.deepEqual(ethToGregorian({ year: 2016, month: 6, day: 23 }), { year: 2024, month: 3, day: 2 });
});

test('Gregorian <-> JDN known value', () => {
  assert.equal(gregorianToJdn({ year: 2000, month: 1, day: 1 }), 2451545);
});

test('weekday: 2000-01-01 was Saturday, 2026-10-09 is Friday', () => {
  assert.equal(weekdayOfJdn(gregorianToJdn({ year: 2000, month: 1, day: 1 })), 6);
  assert.equal(weekdayOfJdn(gregorianToJdn({ year: 2026, month: 10, day: 9 })), 5);
});

test('round trip over ~60 years, day by day', () => {
  const start = gregorianToJdn({ year: 1990, month: 1, day: 1 });
  for (let jdn = start; jdn < start + 365 * 60; jdn++) {
    const eth = jdnToEth(jdn);
    assert.ok(isValidEthDate(eth), `invalid ${JSON.stringify(eth)} for jdn ${jdn}`);
    assert.equal(ethToJdn(eth), jdn);
  }
});

test('consecutive days advance by exactly one Ethiopian day', () => {
  const start = gregorianToJdn({ year: 2020, month: 1, day: 1 });
  let prev = jdnToEth(start);
  for (let jdn = start + 1; jdn < start + 365 * 10; jdn++) {
    const cur = jdnToEth(jdn);
    const expected =
      prev.day < daysInEthMonth(prev.year, prev.month)
        ? { year: prev.year, month: prev.month, day: prev.day + 1 }
        : prev.month < 13
          ? { year: prev.year, month: prev.month + 1, day: 1 }
          : { year: prev.year + 1, month: 1, day: 1 };
    assert.deepEqual(cur, expected);
    prev = cur;
  }
});

test('isValidEthDate rejects impossible dates', () => {
  assert.equal(isValidEthDate({ year: 2018, month: 13, day: 6 }), false);
  assert.equal(isValidEthDate({ year: 2015, month: 13, day: 6 }), true);
  assert.equal(isValidEthDate({ year: 2019, month: 14, day: 1 }), false);
  assert.equal(isValidEthDate({ year: 2019, month: 1, day: 31 }), false);
});
