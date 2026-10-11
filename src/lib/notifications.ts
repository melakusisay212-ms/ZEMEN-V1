// Local task reminders (Android notifications scheduled on the device, no server, work offline).
//
// RULE: reminders are derived data. The task row (dueDate, dueTime, remindBefore, status) is the source of truth;
// `syncTaskReminder` makes the OS schedule match it. Nothing here may throw into a save: a failed
// notification must never stop a task from being saved.

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { db } from '../db/db.ts';
import { computeReminderAt, notificationId } from './reminders.ts';

const CHANNEL_ID = 'task-reminders';

export type ReminderPermission = 'granted' | 'denied' | 'unsupported';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

let channelReady = false;

async function ensureChannel(): Promise<void> {
  if (channelReady || !isNative()) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Task reminders',
      description: 'Reminders for tasks with a due date',
      importance: 4,
      visibility: 1,
      vibration: true,
    });
    channelReady = true;
  } catch (e) {
    console.warn('Could not create notification channel', e);
  }
}

/** Current notification permission, without prompting. */
export async function reminderPermission(): Promise<ReminderPermission> {
  if (!isNative()) return 'unsupported';
  try {
    const res = await LocalNotifications.checkPermissions();
    return res.display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/** Ask for notification permission (shows the Android prompt the first time). */
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!isNative()) return 'unsupported';
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return 'granted';
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/** True when Android lets the app fire reminders at the exact minute (Android 12+ can restrict this). */
export async function exactTimingAllowed(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    const res = await LocalNotifications.checkExactNotificationSetting();
    return res.exact_alarm === 'granted';
  } catch {
    return true; // older Android versions have no such restriction
  }
}

/** Opens the Android screen where the user can allow exact alarms. */
export async function openExactTimingSettings(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.changeExactNotificationSetting();
  } catch (e) {
    console.warn('Could not open exact alarm settings', e);
  }
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationId(taskId) }] });
  } catch (e) {
    console.warn('Could not cancel reminder', e);
  }
}

/** Make the scheduled notification for one task match the stored task (schedule, replace, or remove). */
export async function syncTaskReminder(taskId: string): Promise<void> {
  if (!isNative()) return;
  try {
    const task = await db.tasks.get(taskId);
    const at = task ? computeReminderAt(task, Date.now()) : null;
    await cancelTaskReminder(taskId);
    if (!task || at === null) return;
    if ((await reminderPermission()) !== 'granted') return;
    await ensureChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId(task.id),
          title: 'Task reminder',
          body: task.title,
          channelId: CHANNEL_ID,
          schedule: { at: new Date(at), allowWhileIdle: true },
        },
      ],
    });
  } catch (e) {
    console.warn('Could not schedule reminder', e);
  }
}

/** Re-create every pending reminder from the database. Run at app start and after restoring a backup. */
export async function rescheduleAllReminders(): Promise<void> {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    const tasks = await db.tasks.where('status').equals('todo').toArray();
    for (const t of tasks) {
      if (computeReminderAt(t, Date.now()) !== null) await syncTaskReminder(t.id);
    }
  } catch (e) {
    console.warn('Could not reschedule reminders', e);
  }
}

// Reserved id for the test notification (notificationId() never produces this value in practice).
const TEST_NOTIFICATION_ID = 2147483646;

/** Shows a notification about 5 seconds from now so the person can check reminders work on their phone. */
export async function sendTestReminder(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    if ((await reminderPermission()) !== 'granted') return false;
    await ensureChannel();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TEST_NOTIFICATION_ID,
          title: 'Reminders are working',
          body: 'Your task reminders will look like this.',
          channelId: CHANNEL_ID,
          schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
        },
      ],
    });
    return true;
  } catch (e) {
    console.warn('Could not schedule test reminder', e);
    return false;
  }
}
