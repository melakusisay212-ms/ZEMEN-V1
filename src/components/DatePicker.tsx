import { useState } from 'react';
import { Sheet } from './Sheet.tsx';
import {
  addDays,
  formatGregorian,
  isoToEth,
  monthGrid,
  monthName,
  shiftEthMonth,
  weekdayName,
  weekdayOrder,
} from '../lib/dates.ts';
import type { ISODate } from '../lib/dates.ts';
import { useSettings } from '../lib/settings.ts';

interface DatePickerProps {
  value: ISODate | null;
  today: ISODate;
  allowClear?: boolean;
  onPick: (iso: ISODate | null) => void;
  onClose: () => void;
}

/** Month grid in the Ethiopian calendar (13 months). Picks and returns ISO Gregorian dates. */
export function DatePicker({ value, today, allowClear = true, onPick, onClose }: DatePickerProps) {
  const { lang, weekStart } = useSettings();
  const start = isoToEth(value ?? today);
  const [view, setView] = useState({ year: start.year, month: start.month });

  const cells = monthGrid(view.year, view.month, weekStart);
  const days = cells.filter((c): c is ISODate => c !== null);
  const range = days.length > 0 ? `${formatGregorian(days[0])} to ${formatGregorian(days[days.length - 1])}` : '';

  const pick = (iso: ISODate | null) => {
    onPick(iso);
    onClose();
  };

  return (
    <Sheet
      title="Pick a date"
      onClose={onClose}
      footer={
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => pick(today)}>
            Today
          </button>
          <button type="button" className="btn" onClick={() => pick(addDays(today, 1))}>
            Tomorrow
          </button>
          {allowClear ? (
            <button type="button" className="btn ghost" onClick={() => pick(null)}>
              No date
            </button>
          ) : null}
        </div>
      }
    >
      <div className="cal-head">
        <button
          type="button"
          className="icon-btn"
          aria-label="Previous month"
          onClick={() => setView((v) => shiftEthMonth(v.year, v.month, -1))}
        >
          ‹
        </button>
        <div className="cal-title">
          <strong>
            {monthName(view.month, lang)} {view.year}
          </strong>
          <span className="muted small">{range}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Next month"
          onClick={() => setView((v) => shiftEthMonth(v.year, v.month, 1))}
        >
          ›
        </button>
      </div>

      <div className="cal-grid" role="grid">
        {weekdayOrder(weekStart).map((d) => (
          <span key={`h${d}`} className="cal-dow">
            {weekdayName(d, lang, true)}
          </span>
        ))}
        {cells.map((iso, i) =>
          iso === null ? (
            <span key={`b${i}`} />
          ) : (
            <button
              key={iso}
              type="button"
              className={`cal-day${iso === today ? ' is-today' : ''}${iso === value ? ' is-selected' : ''}`}
              aria-label={`${monthName(view.month, lang)} ${isoToEth(iso).day}, ${view.year}`}
              aria-pressed={iso === value}
              onClick={() => pick(iso)}
            >
              {isoToEth(iso).day}
            </button>
          ),
        )}
      </div>
    </Sheet>
  );
}
