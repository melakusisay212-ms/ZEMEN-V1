// Adds the permissions that task reminders need to the Android manifest created by `npx cap add android`.
// Safe to run more than once: permissions that are already present are skipped.
//
//   POST_NOTIFICATIONS       Android 13+: show notifications at all
//   USE_EXACT_ALARM          Android 13+: fire at the exact minute (granted automatically for calendar/reminder apps)
//   SCHEDULE_EXACT_ALARM     Android 12: same, but the person grants it in Settings ("Alarms & reminders")
//   RECEIVE_BOOT_COMPLETED   bring scheduled reminders back after the phone restarts
//   VIBRATE                  vibrate on reminders

const fs = require('node:fs');

const manifestPath = process.argv[2] || 'android/app/src/main/AndroidManifest.xml';
const PERMISSIONS = [
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.USE_EXACT_ALARM',
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.VIBRATE',
];

if (!fs.existsSync(manifestPath)) {
  console.error(`patch-android: manifest not found at ${manifestPath}. Run "npx cap add android" first.`);
  process.exit(1);
}

let xml = fs.readFileSync(manifestPath, 'utf8');
const missing = PERMISSIONS.filter((name) => !xml.includes(`android:name="${name}"`));

if (missing.length === 0) {
  console.log('patch-android: all permissions already present.');
  process.exit(0);
}

const lines = missing.map((name) => `    <uses-permission android:name="${name}" />`).join('\n');
if (!/<application[\s>]/.test(xml)) {
  console.error('patch-android: no <application> element found in the manifest.');
  process.exit(1);
}
xml = xml.replace(/(\s*)<application([\s>])/, `\n${lines}\n$1<application$2`);
fs.writeFileSync(manifestPath, xml);
console.log(`patch-android: added ${missing.length} permission(s): ${missing.join(', ')}`);
