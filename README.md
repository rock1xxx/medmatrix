# MedMatrix

An offline-first study cockpit for medical interns preparing for **NEET PG / INI-CET** while working 12-hour hospital shifts. Built as a dark, thumb-friendly PWA, with an optional Android build that ships a One UI style home-screen widget.

The whole app is a single linear pipeline per lecture, so you always know the one next thing to do:

```
QUEUED ──▶ STEP_1_WATCHING ──▶ STEP_2_WARD_MCQ ──▶ STEP_3_ANNOTATING ──▶ LOCKED_IN_SR
            tonight's video        ward MCQs            book notes          spaced repetition
```

Once a topic is locked it enters a custom Ebbinghaus schedule and keeps resurfacing on the Tonight screen until it is mastered.

## Screens

| Screen | What it is for |
| --- | --- |
| **Ward** | The morning shift. One-tap "done with MCQs" per topic for the active subject. |
| **Tonight** | Three steps at the hostel desk: annotate → review what is due → watch tonight's videos. |
| **Timeline** | Projected first-read finish date, month calendar and daily agenda, per-day shift-load overrides (low/medium/high duty), Grand Test dates and Subject-Wise Test milestones. |
| **Syllabus** | All 19 subjects / 271 chapters, searchable, category-filtered, with a per-topic status dropdown. On a laptop the same tab becomes a wide subject rail + chapter table with multi-select and a bulk status bar. |
| **Board** | Drag-and-drop Kanban over the same pipeline, with high-yield and subject filters. Desktop only — the tab is hidden on phones, where the board has no room to be useful. |
| **Stats** | Pipeline distribution, SR level histogram, 7-day review forecast, subject progress. Loaded lazily, so the charts never weigh down the first paint. |

## Spaced repetition

Intervals are configurable from *Interval & Revision Settings* and default to the classic Ebbinghaus ladder:

| Level | Next review |
| --- | --- |
| 0 | +1 day |
| 1 | +5 days |
| 2 | +12 days |
| 3 | +25 days |
| 4 | mastered ⭐ (leaves the queue) |

"Snooze" pushes a due card out by the configurable postpone interval (3 days by default) without advancing the level. Status (`DUE_TODAY`, `OVERDUE`, `SCHEDULED`, `MASTERED`) is always derived from the date, so it stays correct without any background job.

## Tech stack

React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS 4 · Zustand (persisted to `localStorage`) · date-fns · dnd-kit · Recharts · Sonner · Capacitor (Android) · Supabase (optional cloud sync)

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |
| `npm run lint` | Oxlint |

### Installing it on your phone

Open the deployed site in Chrome or Safari → **Install App on Phone** from the ⋮ menu for step-by-step instructions. It runs standalone, and the service worker keeps the app shell available with a dead network connection (which is the point, in a hospital basement).

### Cloud sync across devices (optional)

Everything works fully offline with no account. To sync between phone and laptop, create a Supabase project and run this in the SQL editor, then paste the project URL and anon key into **Multi-Device Sync**:

```sql
create table if not exists medmatrix_sync (
  id text primary key,
  data jsonb not null,
  last_modified bigint not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table medmatrix_sync enable row level security;

create policy "Anon full access" on medmatrix_sync
  for all using (true) with check (true);

alter publication supabase_realtime add table medmatrix_sync;
```

The policy above is wide open — fine for a personal project keyed by a private `syncKey`, **not** safe for anything multi-user. Sync is last-write-wins on a `lastModified` timestamp; every mutating action bumps it, and the newest payload wins.

### Surviving a reinstall

Typing the URL and key in again after every reinstall is avoidable — bake them into the build instead, so a freshly installed APK is already connected:

1. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as **repository secrets** (Settings → Secrets and variables → Actions). They are read by the APK workflow and never committed to the repo.
2. Re-run the build workflow.

For local dev, copy `.env.example` to `.env` and fill it in (`.env` is git-ignored). The values are read by Vite at build time and fall back to whatever the device has stored.

Saving the credentials in the app (Sync → Save) also mirrors them into native **SharedPreferences** (`MedMatrixSyncPrefs`), not just WebView `localStorage`. That survives in-place APK updates, "clear cache", and WebView storage resets, and it is included in Android Auto Backup. The browser build keeps the same mirror in `localStorage`. Nothing is ever written back into the repository.

Credentials are only half of it — the study database itself is mirrored into `filesDir/medmatrix-data.json` on every change (see **Data and backups**), so a wiped WebView still has its progress. Ordering on boot is: device snapshot → credentials → sync engine. That way the first cloud read has both the data and the client, and no code path can push seed data first.

On a **fresh install the app deliberately starts its change clock at 0**, so the copy in Supabase always out-ranks the seeded local data and gets pulled down on first launch. Without that, a new install would look "newer" and overwrite your real progress in the cloud with seed data. Saving the URL and key does **not** bump that clock either — connecting is not a study edit — so the first sync after a reinstall pulls your progress down instead of uploading the seed curriculum over it.

Every APK build is signed with the keystore committed at `android/app/medmatrix.keystore`, so installing a new APK over the old one is always allowed — Android never forces an uninstall, and an in-place update keeps both the WebView data and the native snapshot.

If you would rather not use secrets, the APK still restores app data through Android Auto Backup (`allowBackup` is enabled) when the device has system backup turned on — but that restore is at the OS's discretion and can lag behind the reinstall.

## Data and backups

The study database is treated as the most important thing in the app, so it is kept in three independent places:

| Copy | Where | Survives |
| --- | --- | --- |
| Live state | `localStorage` → `medmatrix-storage-v2` | reloads, normal app updates |
| Device snapshot | Android: `filesDir/medmatrix-data.json` (+ `.prev.json`); web: a second `localStorage` slot | clear cache, WebView storage reset, in-place APK updates, uninstall when Android backup is on |
| Cloud row | Supabase `medmatrix_sync`, keyed by your sync key | reinstalls, storage wipes, losing the phone |

Recovery is automatic: on boot the app restores the device snapshot if it is newer than what the WebView has, then pulls the cloud row. The order is deliberate — nothing can upload seed data before those two reads have happened.

Guards that keep a bad write from becoming a lost database:

- **A fresh install never writes first.** Its change clock starts at `0`, and saving credentials no longer bumps it, so the cloud copy out-ranks it and is pulled down. The first cloud read of a fresh install wins even if you tapped around for a minute beforehand.
- **Empty payloads are refused.** A cloud row, JSON file or snapshot with no topics is treated as damage; the local database is kept instead of being replaced by it.
- **Pushes re-check the cloud first.** Before uploading, the app re-reads the row's timestamp; if another device synced something newer, it pulls that instead of overwriting it.
- **Corrupt state is set aside, not trusted.** If `medmatrix-storage-v2` is unparseable or incomplete it is copied to `medmatrix-storage-v2.corrupt` and the app boots clean, which lets the device snapshot fill the gap.
- **Destructive steps keep an undo copy.** Every cloud pull, **Restore from JSON** and **Reset Seed Data** first writes the current database to `medmatrix-storage-lastgood-v2`, and ⋮ → **Restore Previous State** puts it back. The Android snapshot file also rotates a previous copy.
- **Exports are timestamped** (`MedMatrix_Backup_2026-10-29_1345.json`) so several backups can coexist.

**Export Backup (JSON)** / **Restore from JSON** in the ⋮ menu move the whole database between devices or into cold storage. **Reset Seed Data** returns the 271-chapter curriculum to its starting state (and is undoable as above).

One thing the app cannot protect by itself: the suggested Supabase policy allows full access to anyone holding the anon key, and that key ships inside the APK. Keep the project private, keep a copy of the JSON export somewhere outside the phone, and turn on your Supabase project's own backups (or Point-in-Time Recovery) before relying on cloud sync as the only copy.

## Android app + home-screen widget

`.github/workflows/build-apk.yml` builds a debug APK on every push to `main`, publishes it to a rolling `android-latest` release, and cuts a versioned release per run. The native side lives in `android/` and is wired through `@capacitor/core`.

The widget bridge (`src/lib/widgetBridge.ts`) pushes today's MCQs, tonight's videos and revision cards into Android shared preferences; in the browser it degrades to `localStorage`. **Check for Updates** in the ⋮ menu reads the release feed and hands the APK to the native installer.

Each build stamps its run number into the rolling release title ("… — build 42") and also uploads a `version.json` next to the APK. The app compares that number with its own installed `versionCode`, so the "new APK available" strip only appears when something is genuinely newer, and dismissing it keeps it dismissed for that build. The title is the source of truth rather than `version.json`, because release *assets* are served without CORS headers and a WebView cannot read them; the GitHub API response is readable. In the browser there is no banner, because a browser cannot install an APK.

## Project structure

```
src/
  components/
    layout/     Header, BottomNav
    views/      Ward, Tonight, Timeline, Syllabus, Kanban, Stats
    modals/     Topic details, sync, intervals, widgets, install, update …
    widget/     Today widget used by the Android home screen and /?view=widget
  data/         Seeded 19-subject / 271-chapter curriculum
  lib/          SR engine, calendar projection, sync engine, widget bridge, confetti
  store/        Single Zustand store (persisted)
  types/        Domain model
```

## Known limits

- Single-user by design: there are no accounts, and the Supabase schema is trust-the-client.
- The timeline projection assumes a constant daily pace per subject, except where you override a specific day's shift load.
- Sync conflicts are last-write-wins; there is no merge or history.
- iOS home-screen widgets are not implemented — the PWA install path is the iOS story.
