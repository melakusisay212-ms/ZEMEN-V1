import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportBackupText, importBackupText } from '../db/repo.ts';
import { todayISO } from '../lib/dates.ts';
import { countRows, parseBackup } from '../lib/backup.ts';
import { saveTextFile } from '../lib/files.ts';
import {
  exactTimingAllowed,
  openExactTimingSettings,
  reminderPermission,
  requestReminderPermission,
  sendTestReminder,
} from '../lib/notifications.ts';
import type { ReminderPermission } from '../lib/notifications.ts';
import { getSettings, sanitizeSettings, setSettings, useSettings } from '../lib/settings.ts';
import type { Theme } from '../lib/settings.ts';
import type { Lang } from '../lib/dates.ts';

interface Message {
  kind: 'ok' | 'error';
  text: string;
}

const THEMES: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'am', label: 'አማርኛ' },
];

const WEEK_STARTS: { value: 0 | 1; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 0, label: 'Sunday' },
];

export function More() {
  const settings = useSettings();
  const [message, setMessage] = useState<Message | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [permission, setPermission] = useState<ReminderPermission | null>(null);
  const [exact, setExact] = useState(true);
  const [reminderMessage, setReminderMessage] = useState<Message | null>(null);

  const refreshReminders = useCallback(async () => {
    setPermission(await reminderPermission());
    setExact(await exactTimingAllowed());
  }, []);

  useEffect(() => {
    void refreshReminders();
    // Coming back from Android settings: re-check.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshReminders();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshReminders]);

  const allowReminders = async () => {
    const result = await requestReminderPermission();
    await refreshReminders();
    if (result !== 'granted') {
      setReminderMessage({ kind: 'error', text: 'Reminders are still off. Open Android Settings, then Apps, Zemen, Notifications, and turn them on.' });
    } else {
      setReminderMessage(null);
    }
  };

  const testReminder = async () => {
    const ok = await sendTestReminder();
    setReminderMessage(
      ok
        ? { kind: 'ok', text: 'A test reminder will appear in about 5 seconds. Lock your screen to check it still arrives.' }
        : { kind: 'error', text: 'Could not schedule the test. Check that reminders are allowed.' },
    );
  };

  const exportBackup = async () => {
    try {
      const text = await exportBackupText(getSettings());
      await saveTextFile(`zemen-backup-${todayISO()}.json`, text);
      setMessage({ kind: 'ok', text: 'Backup created. Keep the file somewhere safe, like Google Drive.' });
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      if (/cancel/i.test(text)) return; // closing the share sheet is not an error
      setMessage({ kind: 'error', text: `Could not create the backup. ${text}` });
    }
  };

  const importBackup = async (file: File) => {
    try {
      const text = await file.text();
      const counts = countRows(parseBackup(text).data);
      const summary = `${counts.tasks} tasks, ${counts.habits} habits, ${counts.notes} notes, ${counts.projects} projects`;
      if (!window.confirm(`Replace ALL current data with this backup (${summary})? This cannot be undone.`)) return;
      const { settings: restored } = await importBackupText(text);
      if (restored !== undefined && restored !== null) setSettings(sanitizeSettings(restored));
      setMessage({ kind: 'ok', text: `Backup restored: ${summary}.` });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not restore the backup.' });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <main className="page">
      <header className="page-head">
        <h1>More</h1>
      </header>

      <Link className="nav-row" to="/habits">
        <span>Habits</span>
        <span aria-hidden="true">›</span>
      </Link>

      <section className="group">
        <h2>Reminders</h2>
        {permission === 'unsupported' ? (
          <p className="muted small">Reminders work in the installed Android app. This browser cannot schedule them.</p>
        ) : null}
        {permission === 'granted' ? (
          <>
            <p className="muted small">Reminders are on. Tasks with a date and a reminder will notify you, even when the app is closed.</p>
            {!exact ? (
              <>
                <p className="error">Android may delay reminders because exact timing is off.</p>
                <div className="btn-row">
                  <button type="button" className="btn" onClick={() => void openExactTimingSettings()}>
                    Allow exact timing
                  </button>
                </div>
              </>
            ) : null}
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => void testReminder()}>
                Send a test reminder
              </button>
            </div>
            <p className="muted small">If reminders arrive late on Tecno, Infinix, itel or Xiaomi phones, set battery use for Zemen to Unrestricted in Android settings.</p>
          </>
        ) : null}
        {permission === 'denied' ? (
          <>
            <p className="muted small">Reminders are off. Allow notifications so tasks can remind you.</p>
            <div className="btn-row">
              <button type="button" className="btn primary" onClick={() => void allowReminders()}>
                Allow reminders
              </button>
            </div>
          </>
        ) : null}
        {reminderMessage ? (
          <p className={reminderMessage.kind === 'error' ? 'error' : 'success'} role="status">
            {reminderMessage.text}
          </p>
        ) : null}
      </section>

      <section className="group">
        <h2>Appearance</h2>
        <div className="field">
          <span>Theme</span>
          <div className="seg" role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => (
              <button key={t.value} type="button" role="radio" aria-checked={settings.theme === t.value} className={settings.theme === t.value ? 'on' : ''} onClick={() => setSettings({ theme: t.value })}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Month and day names</span>
          <div className="seg" role="radiogroup" aria-label="Month and day names">
            {LANGS.map((l) => (
              <button key={l.value} type="button" role="radio" aria-checked={settings.lang === l.value} className={settings.lang === l.value ? 'on' : ''} onClick={() => setSettings({ lang: l.value })}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Week starts on</span>
          <div className="seg" role="radiogroup" aria-label="Week starts on">
            {WEEK_STARTS.map((w) => (
              <button key={w.value} type="button" role="radio" aria-checked={settings.weekStart === w.value} className={settings.weekStart === w.value ? 'on' : ''} onClick={() => setSettings({ weekStart: w.value })}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="group">
        <h2>Your data</h2>
        <p className="muted small">Everything is stored on this phone and works offline. Back it up before you change phones or clear app data.</p>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={() => void exportBackup()}>
            Create backup
          </button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            Restore backup
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importBackup(file);
          }}
        />
        {message ? (
          <p className={message.kind === 'error' ? 'error' : 'success'} role="status">
            {message.text}
          </p>
        ) : null}
      </section>

      <section className="group">
        <h2>About Zemen</h2>
        <p className="muted small">Version 0.1.0. Zemen means time. Dates are stored as standard dates and shown in the Ethiopian calendar.</p>
        <p className="muted small">Coming next: goals, finance, and a daily journal with a weekly review.</p>
      </section>
    </main>
  );
}
