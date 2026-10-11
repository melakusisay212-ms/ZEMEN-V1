import { daysInEthMonth } from '../lib/ethiopian.ts';

interface YearBarProps {
  year: number;
  month: number;
}

/** The Ethiopian year as 13 segments sized by days (twelve of 30, Pagume of 5 or 6). */
export function YearBar({ year, month }: YearBarProps) {
  return (
    <div className="yearbar" role="img" aria-label={`Month ${month} of 13`}>
      {Array.from({ length: 13 }, (_, i) => {
        const m = i + 1;
        const state = m < month ? 'past' : m === month ? 'now' : 'next';
        return <span key={m} className={state} style={{ flexGrow: daysInEthMonth(year, m) }} />;
      })}
    </div>
  );
}
