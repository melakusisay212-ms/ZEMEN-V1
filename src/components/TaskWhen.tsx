import { useState } from 'react';
import { DatePicker } from './DatePicker.tsx';
import { addDays, formatEth } from '../lib/dates.ts';
import type { ISODate } from '../lib/dates.ts';
import { requestReminderPermission } from '../lib/notifications.ts';
import { remindOptions, reminderHint } from '../lib/reminders.ts';
import { useSettings } from '../lib/settings.ts';

export interface When {
  dueDate: ISODate | null;
  dueTime: string | null;
  remindBefore: number | null;
}

interface TaskWhenProps {
  value: When;
  today: ISODate;
  /** Only the fields that changed. The parent merges them (new task) or saves them (existing task). */
  onChange: (patch: Partial<When>) => void;
}

/** Date (Ethiopian), time and reminder fields. Shared by Quick add and the task sheet. */
export function TaskWhen({ value, today, onChange }: TaskWhenProps) {
  const { lang } = useSettings();
  const [picking, setPicking] = useState(false);
  const tomorrow = addDays(today, 1);
  const hasDate = value.dueDate !== null;
  const hasTime = value.dueTime !== null;
  const customDate = value.dueDate !== null && value.dueDate !== today && value.dueDate !== tomorrow;

  const setDate = (iso: ISODate | null) => {
    if (iso === null) {
      onChange({ dueDate: null, dueTime: null, remindBefore: null });
      return;
    }
    // The first time a date is set, remind at the due time so tasks remind by default.
    if (value.dueDate === null && value.remindBefore === null) {
      onChange({ dueDate: iso, remindBefore: 0 });
      void requestReminderPermission();
    } else {
      onChange({ dueDate: iso });
    }
  };

  const setTime = (time: string | null) => {
    // Without a time only "that day" and "the day before" make sense (both fire at 8:00 AM).
    const keepsRemind = time !== null || value.remindBefore === null || value.remindBefore === 0 || value.remindBefore === 1440;
    onChange({ dueTime: time, ...(keepsRemind ? {} : { remindBefore: 0 }) });
  };

  const setRemind = (minutes: number | null) => {
    onChange({ remindBefore: minutes });
    if (minutes !== null) void requestReminderPermission();
  };

  const hint = reminderHint(
    { status: 'todo', dueDate: value.dueDate, dueTime: value.dueTime, remindBefore: value.remindBefore },
    Date.now(),
    lang,
  );

  return (
    <>
      <div className="field">
        <span>Date</span>
        <div className="chips" role="radiogroup" aria-label="Date">
          <button type="button" role="radio" aria-checked={value.dueDate === today} className={`chip${value.dueDate === today ? ' on' : ''}`} onClick={() => setDate(today)}>
            Today
          </button>
          <button type="button" role="radio" aria-checked={value.dueDate === tomorrow} className={`chip${value.dueDate === tomorrow ? ' on' : ''}`} onClick={() => setDate(tomorrow)}>
            Tomorrow
          </button>
          <button type="button" role="radio" aria-checked={customDate} className={`chip${customDate ? ' on' : ''}`} onClick={() => setPicking(true)}>
            {customDate && value.dueDate ? formatEth(value.dueDate, lang, { weekday: true, year: false }) : 'Pick date'}
          </button>
          <button type="button" role="radio" aria-checked={!hasDate} className={`chip${!hasDate ? ' on' : ''}`} onClick={() => setDate(null)}>
            No date
          </button>
        </div>
      </div>

      {hasDate ? (
        <>
          <div className="field">
            <span>Time</span>
            <div className="chips">
              <input
                className="input compact"
                type="time"
                aria-label="Time"
                value={value.dueTime ?? ''}
                onChange={(e) => setTime(e.target.value === '' ? null : e.target.value)}
              />
              <button type="button" className={`chip${!hasTime ? ' on' : ''}`} aria-pressed={!hasTime} onClick={() => setTime(null)}>
                All day
              </button>
            </div>
          </div>

          <div className="field">
            <span>Reminder</span>
            <div className="chips" role="radiogroup" aria-label="Reminder">
              <button type="button" role="radio" aria-checked={value.remindBefore === null} className={`chip${value.remindBefore === null ? ' on' : ''}`} onClick={() => setRemind(null)}>
                Off
              </button>
              {remindOptions(hasTime).map((o) => (
                <button key={o.minutes} type="button" role="radio" aria-checked={value.remindBefore === o.minutes} className={`chip${value.remindBefore === o.minutes ? ' on' : ''}`} onClick={() => setRemind(o.minutes)}>
                  {o.label}
                </button>
              ))}
            </div>
            <p className="muted small when-hint">{hint}</p>
          </div>
        </>
      ) : null}

      {picking ? (
        <DatePicker value={value.dueDate} today={today} allowClear={false} onPick={(iso) => iso && setDate(iso)} onClose={() => setPicking(false)} />
      ) : null}
    </>
  );
}
