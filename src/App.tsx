import { useEffect, useState } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { QuickCapture } from './components/QuickCapture.tsx';
import { useToday } from './hooks/useToday.ts';
import { isISODate } from './lib/dates.ts';
import { handleBack } from './lib/backStack.ts';
import { rescheduleAllReminders } from './lib/notifications.ts';
import { Calendar } from './screens/Calendar.tsx';
import { Habits } from './screens/Habits.tsx';
import { More } from './screens/More.tsx';
import { NoteEditor } from './screens/NoteEditor.tsx';
import { Notes } from './screens/Notes.tsx';
import { Tasks } from './screens/Tasks.tsx';
import { Today } from './screens/Today.tsx';

const TABS = [
  {
    to: '/',
    label: 'Today',
    icon: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  },
  {
    to: '/calendar',
    label: 'Calendar',
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </>
    ),
  },
  {
    to: '/tasks',
    label: 'Tasks',
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="M8 12.5l3 3L16.5 9" />
      </>
    ),
  },
  {
    to: '/notes',
    label: 'Notes',
    icon: <path d="M7 4h7l4 4v12H7zM14 4v4h4M9.5 13h6M9.5 16h6" />,
  },
];

function Shell() {
  const location = useLocation();
  const [params] = useSearchParams();
  const today = useToday();
  const [capturing, setCapturing] = useState(false);
  const inEditor = location.pathname.startsWith('/notes/');

  // On the calendar, quick add starts on the selected day.
  const dayParam = params.get('d');
  const calendarDay = location.pathname === '/calendar' && dayParam !== null && isISODate(dayParam) ? dayParam : null;

  // Make the phone's scheduled reminders match the stored tasks (after an update, restore or reboot).
  useEffect(() => {
    void rescheduleAllReminders();
  }, []);

  // Android hardware back: close the top sheet first, then go back, then exit.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    let remove: (() => void) | undefined;
    void CapApp.addListener('backButton', ({ canGoBack }) => {
      if (handleBack()) return;
      if (canGoBack) window.history.back();
      else void CapApp.exitApp();
    }).then((handle) => {
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    });
    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);

  const tabLink = (tab: (typeof TABS)[number]) => (
    <NavLink key={tab.to} to={tab.to} end replace className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {tab.icon}
      </svg>
      <span>{tab.label}</span>
    </NavLink>
  );

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/:id" element={<NoteEditor />} />
        <Route path="/more" element={<More />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {inEditor ? null : (
        <>
          <nav className="tabbar" aria-label="Main">
            {tabLink(TABS[0])}
            {tabLink(TABS[1])}
            <span className="tab-gap" aria-hidden="true" />
            {tabLink(TABS[2])}
            {tabLink(TABS[3])}
          </nav>
          <button type="button" className="fab" aria-label="Quick add" onClick={() => setCapturing(true)}>
            +
          </button>
        </>
      )}
      {capturing ? <QuickCapture today={today} defaultDate={calendarDay} onClose={() => setCapturing(false)} /> : null}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
