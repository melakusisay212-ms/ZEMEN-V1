import { useEffect, useState } from 'react';
import { todayISO } from '../lib/dates.ts';
import type { ISODate } from '../lib/dates.ts';

/** Today's date (local), updated automatically when midnight passes or the app returns to the foreground. */
export function useToday(): ISODate {
  const [today, setToday] = useState<ISODate>(() => todayISO());

  useEffect(() => {
    const refresh = () => setToday(todayISO());
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  return today;
}
