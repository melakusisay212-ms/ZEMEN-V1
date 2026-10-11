// Ge'ez (Ethiopic) numerals for 1-99, used for the big day number when calendar names are set to Amharic.
// Anything outside 1-99 falls back to ordinary digits.

const ONES = ['', '፩', '፪', '፫', '፬', '፭', '፮', '፯', '፰', '፱'];
const TENS = ['', '፲', '፳', '፴', '፵', '፶', '፷', '፸', '፹', '፺'];

export function geezNumeral(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n);
  return TENS[Math.floor(n / 10)] + ONES[n % 10];
}
