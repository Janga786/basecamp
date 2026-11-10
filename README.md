# Basecamp

A personal, mobile-first PWA for daily training and health habits: it shows the day's workout and habits, logs sets and daily metrics, and tracks streaks. Nutrition logging stays in MyNetDiary, which the app links out to.

Built with React + Vite + TypeScript, Tailwind, TanStack Query, and date-fns, with a swappable data layer (browser localStorage or Supabase + Google sign-in) and optional Fitbit data sync through the Google Health API. 37 unit tests (Vitest). Personal side project, not coursework.

---

## Quick start (local)

```bash
npm install
npm run dev          # → http://localhost:5173
```

That's it. The app runs in **local mode** out of the box — your data is saved in the browser on this device. Tap **Enter Basecamp** and you're in. No accounts, no setup.

> Today defaults to **America/Denver** with a **3 AM day rollover**, so a late-night log still counts for the right day. Both are editable in Settings.

Other scripts:

```bash
npm run build        # typecheck + production build to dist/
npm run preview      # serve the production build
npm run lint         # typecheck only
npm test             # 37 unit tests (vitest)
```

---

## The two backends

Basecamp talks to a single `DataProvider` interface (`src/data/provider.ts`). One env var swaps the whole backend — feature code never changes.

| `VITE_DATA_BACKEND` | Storage | Sync | Survives cache clear |
| --- | --- | --- | --- |
| `local` (default) | browser localStorage | no | no |
| `supabase` | Postgres + Google auth | yes, across devices | yes |

### Turning on Supabase (≈15 min, one time)

1. **Create a project** at [supabase.com](https://supabase.com) (free tier).
2. **Run the schema:** open *SQL Editor* and paste/run [`supabase/schema.sql`](supabase/schema.sql). This creates `profile`, `daily_log`, `weekly_checkin` with Row Level Security scoped to your user.
3. **Enable Google login:** *Authentication → Providers → Google → Enable*. You'll need a Google OAuth client:
   - In [Google Cloud Console](https://console.cloud.google.com/) → *APIs & Services → Credentials → Create OAuth client ID → Web application*.
   - **Authorized redirect URI:** `https://<your-project-ref>.supabase.co/auth/v1/callback` (Supabase shows you the exact value).
   - Paste the client ID + secret into Supabase.
   - In Supabase *Authentication → URL Configuration*, add your site URL (e.g. `http://localhost:5173` and your Vercel URL) to the redirect allowlist.
4. **Set env vars** (copy `.env.example` → `.env.local`):
   ```
   VITE_DATA_BACKEND=supabase
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your anon public key>
   ```
   (Both under Supabase → *Project Settings → API*.)
5. Restart `npm run dev`. The login screen now shows **Continue with Google**, and your data is tied to your Google account and follows you between devices.

> **Why only 3 tables?** The training program, habit definitions, warm-up protocol, and weekly-template defaults are static content bundled into the app. Only mutable state (profile, daily logs, check-ins) lives in the database.

---

## Deploy to Vercel

```bash
npm i -g vercel        # if needed
vercel                 # link + deploy a preview
vercel --prod          # production
```

- Vercel auto-detects Vite. [`vercel.json`](vercel.json) adds the SPA rewrite so deep links (`/today`, `/week`, …) work on refresh.
- In the Vercel dashboard → *Settings → Environment Variables*, add the same `VITE_*` vars you use locally (only needed if you've switched to Supabase). Redeploy after adding them.
- The PWA is installable: on iPhone, open the URL in **Safari → Share → Add to Home Screen**. It opens full-screen like an app.

---

## Connect Fitbit via the Google Health API (optional)

Auto-fills **steps, sleep, resting HR, weight, and calories burned** (and macros/calories *in* if logged) into your daily log — Basecamp pulls them when you open the Today screen, so you stop typing them.

> **Why Google?** Fitbit's legacy Web API is being shut down in **September 2026**, and new app registrations there are already closed. Fitbit data now flows through the **Google Health API** using **Google OAuth 2.0**. The browser runs the consent redirect (with PKCE); a serverless function ([`api/google-token.js`](api/google-token.js)) holds the client secret and performs the token exchange/refresh. Data reads hit `https://health.googleapis.com/v4/users/me/...` directly.

**One-time setup (~10 min):** follow [Set up Google Cloud and OAuth](https://developers.google.com/health/setup):

1. **Create a Google Cloud project** and **enable the Google Health API**.
2. **OAuth consent screen** (*APIs & Services → OAuth consent / Audience*): User type **External**, publishing status **Testing**. Under **Test users**, add your own Google account email (the one your Fitbit is linked to).
3. **Data Access → Add or remove scopes**: add the four read-only scopes —
   `googlehealth.activity_and_fitness.readonly`, `googlehealth.sleep.readonly`,
   `googlehealth.health_metrics_and_measurements.readonly`, `googlehealth.nutrition.readonly`.
4. **Credentials → Create OAuth client ID → Web application.** Under **Authorized redirect URIs** add:
   - `https://<your-deployment>/fitbit/callback`
   - `http://localhost:5173/fitbit/callback` (local dev)

   Copy the **Client ID** and **Client Secret**.
5. **Set env vars** (in `.env.local` and Vercel → *Settings → Environment Variables*):
   ```
   VITE_GOOGLE_CLIENT_ID=<client id>      # client-side: builds the consent URL
   GOOGLE_CLIENT_ID=<client id>           # server-side: token proxy
   GOOGLE_CLIENT_SECRET=<client secret>   # server-side: token proxy
   ```
6. **Redeploy**, then open the app → **Settings → Connected apps → Connect**, approve on Google, and Today auto-syncs.

> **Heads-up (Testing mode):** while the OAuth app is in *Testing* status, Google's **refresh tokens expire after 7 days**, so you'll re-tap **Connect** about once a week. Publishing to Production removes this but requires a third-party security review (only needed if you ever support >100 users).
>
> **Field calibration:** Google doesn't publish every response field name, so metric extraction in [`src/lib/fitbit.ts`](src/lib/fitbit.ts) is best-effort. If a metric reads wrong after the first sync, set `localStorage['basecamp.fitbit.debug']='1'` in the browser console and re-sync to log the raw responses, then adjust the candidate field lists.
>
> Tokens live in the browser (localStorage); the integration stays hidden until `VITE_GOOGLE_CLIENT_ID` is set, so the app works fine without it.

---

## Using it day to day

- **Today** is the screen you open every morning: the day's lift card (with the warm-up protocol, per-exercise sets/reps/RPE/rest/cues, substitutions, and demo videos), your habit checklist grouped by category, and quick-entry for sleep / steps / RHR / weight. The workout logger records weight, reps, and RPE per set and ends with **Finish workout**; the protein habit links out to MyNetDiary.
- **Week** shows the 7-day grid with what's done/missed and your sleep + step averages vs. goals.
- **Programs** is the read-only reference: browse any of the 12 lift weeks × 5 days.
- **Habits** shows current/longest streaks and a 30-day dot grid per habit, plus your overall perfect-day streak.
- **Weekly check-in** (auto-surfaced on Sundays, also on the Week header) pre-fills your week's stats and captures one win / one friction / next week's focus.

### Editing the plan (all in **Settings**)

- **Weekly training template** — pick which program day-type lands on each weekday.
- **Habits** — switch any core habit off, or turn on the advanced ones (sauna, red-light, meditation, RHR logging).
- **Program timing** — lift Week-1 start date, cut dates, refeed day.
- **Goals** — protein, calories, steps, sleep, weights.
- **Appearance** — dark/light theme, timezone, rollover hour.

---

## Lift program data

`src/data/seed/liftProgram.ts` holds a 12-week, 5-day program (60 days, 408 exercise entries) extracted from Jeff Nippard's *Bodybuilding Transformation System* PDF, which is not included in this repository. `scripts/buildLiftProgram.mjs` validates the extracted JSON (60 days, Week-1/Day-1 check) and regenerates the file:

```bash
node scripts/buildLiftProgram.mjs <base-parse.json> [<rpe-fix.json>]
```

Week 1 and Week 6 are deload/intro weeks; from Week 2 on, the last set of each exercise goes to failure. If a cell looks wrong, the source page for Week W, Day D is PDF page `3 + (W−1)×5 + D`.

---

## Project map

```
src/
  data/
    types.ts            domain model
    provider.ts         DataProvider interface + backend picker
    localProvider.ts    localStorage impl
    supabaseProvider.ts Supabase impl
    queries.ts          TanStack Query hooks
    seed/               static content: profile, habits, warmup, liftProgram (generated), links
  domain/
    schedule.ts         "assemble today" engine + progress
    streaks.ts          streak + perfect-day computation
    programs.ts         program accessors
  components/           LiftCard, HabitList, WorkoutLogger, ReminderCards, AppShell, ui primitives
  screens/              Today, Week, Programs, Habits, CheckIn, Settings, Auth
  lib/                  time (Denver tz + 3 AM rollover), supabase client, Google Health sync, cn
supabase/schema.sql     tables + RLS
scripts/buildLiftProgram.mjs   extracted JSON → seed generator
api/google-token.js     serverless OAuth token proxy (Vercel)
tests/                  Vitest unit tests
```


## License

[MIT](LICENSE) for the code. The lift-program content in `src/data/seed/liftProgram.ts` comes from Jeff Nippard's program and is not covered by this license.
