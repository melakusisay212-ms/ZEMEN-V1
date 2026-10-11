# Zemen

Offline productivity app on the Ethiopian calendar: Today, Calendar, Tasks with reminders, Habits, and Notes (second brain with an inbox, tags and links). Built with React, Vite, Dexie (IndexedDB) and Capacitor for Android.

## Get the APK (GitHub Actions)

1. Push this folder to a GitHub repo on the `main` branch.
2. Open the repo's **Actions** tab and wait for **Build Android APK** to finish (or run it with **Run workflow**).
3. Open the finished run and download the **zemen-debug-apk** artifact. Unzip it and install `app-debug.apk`.

The workflow runs the unit tests, builds the web app, generates the Android project, adds the reminder permissions (`scripts/patch-android.cjs`) and builds the APK.

## Develop

```
npm install
npm test        # pure logic tests (calendar, dates, reminders, habits, backup)
npm run dev     # runs in the browser; reminders only work in the installed app
```

## Rules the code follows

- Every stored date is an ISO Gregorian string (`YYYY-MM-DD`). Ethiopian dates are computed for display and for the date picker only (`src/lib/dates.ts`, `src/lib/ethiopian.ts`).
- All writes go through `src/db/repo.ts`. Task changes also update the phone's scheduled reminder (`src/lib/notifications.ts`).
- Reminder timing is pure logic in `src/lib/reminders.ts`: `remindBefore` is minutes before the due moment, and tasks without a time use 08:00.
- Every module links to every other through one `links` table.

## Known limits

- Reminders are not verified on a real phone yet. Use More > Reminders > Send a test reminder after installing.
- No Ethiopian public holidays yet (needs a verified source for movable holidays).
