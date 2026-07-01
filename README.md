# Basecamp 🏔️

Your daily command center for **lifting, basketball, and longevity habits** — a mobile-first PWA that tells you what to do each day, lets you check it off, and shows clean streaks. It's the conductor; **Hevy and MyNetDiary stay the instruments**. Basecamp never stores macro grams or set-by-set weights — it orchestrates and confirms, then deep-links you out to those apps.

Built with React + Vite + TypeScript, Tailwind, TanStack Query, date-fns, and a swappable data layer (localStorage **or** Supabase + Google auth).

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
npm test             # unit tests (vitest)
```

---

## The two backends

Basecamp talks to a single `DataProvider` interface (`src/data/provider.ts`). One env var swaps the whole backend — feature code never changes.

| `VITE_DATA_BACKEND` | Storage | Sync | Survives cache clear |
| --- | --- | --- | --- |
| `local` (default) | browser localStorage | no | no |
| `supabase` | Postgres + Google auth | ✅ across devices | ✅ |

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

> **Why only 3 tables?** The training programs, habit definitions, warm-up protocol, and weekly-template defaults are *static content* bundled into the app (parsed from the PDF). Only your mutable state — profile, daily logs, check-ins — lives in the database, so nothing is duplicated. This is a deliberate simplification of the table list in the original brief.

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

- **Today** is the screen you open every morning: the day's lift card (with the warm-up protocol, per-exercise sets/reps/RPE/rest/cues, substitutions, and demo videos), a basketball card if scheduled, your habit checklist grouped by category, and quick-entry for sleep / steps / RHR / weight. Check **Lift complete** + **Logged in Hevy ↗**, and **Hit protein ↗** bounces you to MyNetDiary.
- **Week** shows the 7-day grid with what's done/missed and your sleep + step averages vs. goals.
- **Programs** is the read-only reference — browse any of the 12 lift weeks × 5 days, or basketball weeks 3–10.
- **Habits** shows current/longest streaks and a 30-day dot grid per habit, plus your overall perfect-day streak.
- **Weekly check-in** (auto-surfaced on Sundays, also on the Week header) pre-fills your week's stats and captures one win / one friction / next week's focus.

### Editing the plan (all in **Settings**)

- **Weekly training template** — pick which Nippard day-type lands on each weekday and toggle basketball per day.
- **Habits** — switch any core habit off, or turn on the advanced ones (sauna, red-light, meditation, RHR logging).
- **Program timing** — lift Week-1 start date, cut dates, basketball start week, refeed day.
- **Goals** — protein, calories, steps, sleep, weights.
- **Appearance** — dark/light theme, timezone, rollover hour.

---

## Re-seeding the lift program from the PDF

The 12-week Nippard program is committed at `src/data/seed/liftProgram.ts`, generated by parsing `program-source/program2.pdf` with a vision-extraction pass (page image + embedded video links), an adversarial re-verification of low-confidence pages, and a focused second pass that corrected the RPE/technique/working-set columns. To regenerate from the workflow output:

```bash
node scripts/buildLiftProgram.mjs <base-parse.json> <rpe-fix.json>
```

The script validates all 60 days, checks the Week-1/Day-1 ground truth, and prints a quality report before writing the file.

---

## ⚠️ Where to spot-check the parse

The data is high-fidelity (all 60 days, 408 exercises, internally consistent), but it was machine-read from a dense PDF, so give it a glance:

- **The brief's "ground truth" was reversed.** The original build brief listed Week-1/Day-1 with the *substitution* exercises as if they were the primary lifts (e.g. it called the primary "45° Incline Machine Press" with "45° Incline Barbell Press" as the sub). The authoritative PDF is the opposite: **primary = 45° Incline Barbell Press**, subs = DB Press / Machine Press. Basecamp follows the **PDF**, since "fixing the parser to match the brief" would have corrupted the real program. If a lift looks swapped vs. your memory of the brief, the PDF is the source of truth.
- **Deload weeks:** Week 1 *and* Week 6 are deload/intro weeks (sub-failure RPE, technique "N/A"). Every other week takes the last set to failure (last-set RPE shown as **10**, technique "Failure"/"Myo-reps"/etc.). This pattern is consistent across all 60 days — not a bug.
- **`early_rpe: "N/A"`** appears on a few single-working-set isolation exercises (no "early" set to rate). Expected.
- **Video links** are the exact YouTube URLs embedded in the PDF, matched to each exercise by name.

If you ever spot a cell that looks off, the rendered source page is `program-source/program2.pdf` (Week _W_, Day _D_ is PDF page `3 + (W−1)×5 + D`).

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
    seed/               static content: profile, habits, warmup, liftProgram (generated), basketballProgram, links
  domain/
    schedule.ts         "assemble today" engine + progress
    streaks.ts          streak + perfect-day computation
    programs.ts         program accessors
  components/           LiftCard, BasketballCard, HabitList, AppShell, ui primitives
  screens/              Today, Week, Programs, Habits, CheckIn, Settings, Auth
  lib/                  time (Denver tz + 3 AM rollover), supabase client, cn
supabase/schema.sql     tables + RLS
scripts/buildLiftProgram.mjs   PDF-parse → seed generator
```

Basecamp stores **no macro grams and no set-by-set weights** — by design. Those live in MyNetDiary and Hevy.
