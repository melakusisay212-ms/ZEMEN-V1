// Pure Ethiopian (Amete Mihret) calendar math. No DOM, no React, no storage.
// Everything is converted through the Julian Day Number (JDN).

export interface GregDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export interface EthDate {
  year: number;
  month: number; // 1-13 (13 = Pagume)
  day: number; // 1-30 (Pagume: 1-5, or 1-6 in a leap year)
}

export const ETH_MONTHS_EN = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit',
  'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume',
] as const;

export const ETH_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት',
  'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን',
] as const;

// Index 0 = Sunday, to match JS Date#getDay and weekdayOfJdn below.
export const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAYS_EN_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'] as const;
export const WEEKDAYS_AM_SHORT = ['እሑ', 'ሰኞ', 'ማክ', 'ረቡ', 'ሐሙ', 'ዓር', 'ቅዳ'] as const;

const ETH_EPOCH_JDN = 1723856;

function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

/** Ethiopian leap years are the years where year % 4 === 3. */
export function isEthLeapYear(year: number): boolean {
  return mod(year, 4) === 3;
}

export function daysInEthMonth(year: number, month: number): number {
  if (month < 13) return 30;
  return isEthLeapYear(year) ? 6 : 5;
}

export function gregorianToJdn({ year, month, day }: GregDate): number {
  const a = floorDiv(14 - month, 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    floorDiv(153 * m + 2, 5) +
    365 * y +
    floorDiv(y, 4) -
    floorDiv(y, 100) +
    floorDiv(y, 400) -
    32045
  );
}

export function jdnToGregorian(jdn: number): GregDate {
  const a = jdn + 32044;
  const b = floorDiv(4 * a + 3, 146097);
  const c = a - floorDiv(146097 * b, 4);
  const d = floorDiv(4 * c + 3, 1461);
  const e = c - floorDiv(1461 * d, 4);
  const m = floorDiv(5 * e + 2, 153);
  return {
    day: e - floorDiv(153 * m + 2, 5) + 1,
    month: m + 3 - 12 * floorDiv(m, 10),
    year: 100 * b + d - 4800 + floorDiv(m, 10),
  };
}

export function ethToJdn({ year, month, day }: EthDate): number {
  return (
    ETH_EPOCH_JDN +
    365 +
    365 * (year - 1) +
    floorDiv(year, 4) +
    30 * month +
    day -
    31
  );
}

export function jdnToEth(jdn: number): EthDate {
  const days = jdn - ETH_EPOCH_JDN;
  const r = mod(days, 1461);
  const n = (r % 365) + 365 * floorDiv(r, 1460);
  return {
    year: 4 * floorDiv(days, 1461) + floorDiv(r, 365) - floorDiv(r, 1460),
    month: floorDiv(n, 30) + 1,
    day: (n % 30) + 1,
  };
}

export function gregorianToEth(g: GregDate): EthDate {
  return jdnToEth(gregorianToJdn(g));
}

export function ethToGregorian(e: EthDate): GregDate {
  return jdnToGregorian(ethToJdn(e));
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekdayOfJdn(jdn: number): number {
  return mod(jdn + 1, 7);
}

export function isValidEthDate({ year, month, day }: EthDate): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 13) return false;
  return day >= 1 && day <= daysInEthMonth(year, month);
}
