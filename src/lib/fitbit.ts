import type { DailyLog } from '@/data/types'

/**
 * Health sync via the **Google Health API** (the successor to the legacy Fitbit
 * Web API, which is shut down in Sept 2026). Data still originates from the
 * user's Fitbit, now surfaced through Google. Auth is Google OAuth 2.0.
 *
 * Flow: the browser runs the OAuth Authorization-Code redirect (with PKCE), and
 * the code→token exchange + refresh go through our /api/google-token serverless
 * proxy (which holds the client secret). Data reads hit the Health API directly
 * from the browser with the bearer token.
 *
 * NOTE: Google publishes the endpoint/auth contract but not every response
 * field name. The per-metric extraction below is best-effort and tolerant of
 * shape variance; raw responses are logged (see DEBUG) so the mapping can be
 * calibrated against real data on the first sync. Export names are kept generic
 * (fitbit*) so the rest of the app didn't need to change.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_PROXY = '/api/google-token'
const API = 'https://health.googleapis.com/v4'

const SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly', // steps, calories
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly', // HR, weight
  'https://www.googleapis.com/auth/googlehealth.nutrition.readonly', // calories in, macros
]

const LS_TOKENS = 'basecamp.fitbit.tokens'
const LS_VERIFIER = 'basecamp.fitbit.pkceVerifier'
const LS_STATE = 'basecamp.fitbit.oauthState'
const DEBUG = (() => {
  try {
    return localStorage.getItem('basecamp.fitbit.debug') === '1'
  } catch {
    return false
  }
})()

export const FITBIT_REDIRECT_PATH = '/fitbit/callback'

interface HealthTokens {
  access_token: string
  refresh_token: string
  /** epoch ms when the access token expires */
  expires_at: number
}

/** A normalized day of metrics. Any field may be null if unavailable. */
export interface FitbitDay {
  steps: number | null
  sleep_hours: number | null
  rhr_bpm: number | null
  weight: number | null
  calories_out: number | null
  calories_in: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

export function fitbitConfigured(): boolean {
  return Boolean(CLIENT_ID)
}

export function fitbitConnected(): boolean {
  return readTokens() !== null
}

// ── Token storage ──────────────────────────────────────────────────────────

function readTokens(): HealthTokens | null {
  try {
    const raw = localStorage.getItem(LS_TOKENS)
    return raw ? (JSON.parse(raw) as HealthTokens) : null
  } catch {
    return null
  }
}

function writeTokens(t: HealthTokens) {
  localStorage.setItem(LS_TOKENS, JSON.stringify(t))
}

export function disconnectFitbit() {
  localStorage.removeItem(LS_TOKENS)
}

// ── PKCE helpers ─────────────────────────────────────────────────────────────

function randomString(bytes = 48): string {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return base64url(a.buffer)
}

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(input: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
}

function redirectUri(): string {
  return window.location.origin + FITBIT_REDIRECT_PATH
}

// ── Authorization ──────────────────────────────────────────────────────────

/** Kick off the Google OAuth consent redirect. */
export async function beginFitbitAuth(): Promise<void> {
  if (!CLIENT_ID) throw new Error('Google Health is not configured (VITE_GOOGLE_CLIENT_ID missing).')
  const verifier = randomString()
  const challenge = base64url(await sha256(verifier))
  const state = randomString(16)
  localStorage.setItem(LS_VERIFIER, verifier)
  localStorage.setItem(LS_STATE, state)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES.join(' '),
    access_type: 'offline', // request a refresh token
    prompt: 'consent', // force refresh-token issuance on re-consent
    include_granted_scopes: 'true',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  })
  window.location.href = `${AUTHORIZE_URL}?${params.toString()}`
}

/** Complete the OAuth flow from the callback URL's ?code & ?state. */
export async function completeFitbitAuth(code: string, state: string | null): Promise<void> {
  const verifier = localStorage.getItem(LS_VERIFIER)
  const expectedState = localStorage.getItem(LS_STATE)
  localStorage.removeItem(LS_VERIFIER)
  localStorage.removeItem(LS_STATE)
  if (!verifier) throw new Error('Missing PKCE verifier — please start the connection again.')
  if (expectedState && state && expectedState !== state) throw new Error('OAuth state mismatch — aborting.')

  const tokens = await exchange({
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri(),
  })
  storeTokenResponse(tokens, null)
}

/** Exchange a form payload at the token proxy and return the parsed response. */
async function exchange(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as TokenResponse & { error?: string; error_description?: string }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Token request failed (${res.status})`)
  }
  return data
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

/** Persist a token response. Google omits refresh_token on refresh — keep the prior one. */
function storeTokenResponse(t: TokenResponse, priorRefresh: string | null) {
  const refresh = t.refresh_token || priorRefresh
  if (!refresh) throw new Error('No refresh token returned — try reconnecting (consent screen must grant offline access).')
  writeTokens({
    access_token: t.access_token,
    refresh_token: refresh,
    expires_at: nowMs() + (t.expires_in - 60) * 1000, // refresh a minute early
  })
}

function nowMs(): number {
  return new Date().getTime()
}

/** Return a valid access token, refreshing if expired. Throws if not connected. */
async function getAccessToken(): Promise<string> {
  const tokens = readTokens()
  if (!tokens) throw new Error('Not connected to Google Health.')
  if (nowMs() < tokens.expires_at) return tokens.access_token
  const refreshed = await exchange({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token })
  storeTokenResponse(refreshed, tokens.refresh_token)
  return refreshed.access_token
}

// ── Data fetching ────────────────────────────────────────────────────────────
//
// Per the Google Health API contract (developers.google.com/health):
//  • `:dailyRollUp` is a POST with a JSON `range` of CivilDateTime; the response
//    field is `rollupDataPoints`, each carrying an aggregation union keyed by the
//    camelCase data-type name (steps→countSum, weight→kgAvg, totalCalories→kcalSum).
//  • Resting HR and sleep do NOT support dailyRollUp — they use `list` (GET with a
//    civil-time `filter`); response field is `dataPoints` with single-sample unions.
// JSON serializes protobuf snake_case as camelCase, so we probe both forms.

/** camelCase the union field for a kebab-case data-type id (e.g. total-calories → totalCalories). */
function unionKey(dataType: string): string {
  return dataType.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

interface DiagEntry {
  dataType: string
  method: 'dailyRollUp' | 'list'
  status: number | string
  ok: boolean
  pointCount?: number
  note?: string
}
let lastDiag: DiagEntry[] = []
/** Per-metric outcome of the most recent fetchFitbitDay — surfaced in Settings diagnostics. */
export function getFitbitDiagnostics(): DiagEntry[] {
  return [...lastDiag]
}

function civil(date: string): { date: { year: number; month: number; day: number } } {
  const [year, month, day] = date.split('-').map(Number)
  return { date: { year, month, day } }
}
function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + 1))
  return dt.toISOString().slice(0, 10)
}

async function authedJson(url: string, token: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(init?.headers ?? {}) },
  })
  if (res.status === 401) {
    disconnectFitbit()
    throw new Error('Google Health session expired — please reconnect.')
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`HTTP ${res.status}`) as Error & { status?: number; body?: string }
    err.status = res.status
    err.body = body.slice(0, 300)
    throw err
  }
  return res.json()
}

/** POST :dailyRollUp for one day; returns the aggregation union object, or null. */
async function dailyRollUp(dataType: string, date: string, token: string, diags: DiagEntry[]): Promise<Record<string, unknown> | null> {
  const url = `${API}/users/me/dataTypes/${dataType}/dataPoints:dailyRollUp`
  const body = JSON.stringify({ range: { start: civil(date), end: civil(nextDay(date)) }, windowSizeDays: 1 })
  const diag: DiagEntry = { dataType, method: 'dailyRollUp', status: 0, ok: false }
  diags.push(diag)
  try {
    const json = (await authedJson(url, token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })) as {
      rollupDataPoints?: Record<string, unknown>[]
    }
    if (DEBUG) console.info(`[health] dailyRollUp ${dataType}`, json)
    const points = json.rollupDataPoints ?? []
    diag.status = 200
    diag.ok = true
    diag.pointCount = points.length
    if (!points.length) return null
    const value = points[points.length - 1][unionKey(dataType)]
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  } catch (e) {
    const err = e as Error & { status?: number; body?: string }
    diag.status = err.status ?? 'err'
    diag.note = err.body || err.message
    if (err.status === 401) throw e // propagate session expiry
    if (DEBUG) console.warn(`[health] dailyRollUp ${dataType} failed`, err.status, err.body)
    return null
  }
}

/** GET :list for one day via a civil-time filter; returns the dataPoints array. */
async function listDay(
  dataType: string,
  filterId: string,
  date: string,
  token: string,
  diags: DiagEntry[],
  filterMode: 'civil_start_time' | 'civil_end_time' | 'date' = 'civil_start_time',
): Promise<Record<string, unknown>[]> {
  const nd = nextDay(date)
  const filter =
    filterMode === 'date'
      ? `${filterId}.date >= "${date}" AND ${filterId}.date < "${nd}"`
      : filterMode === 'civil_end_time'
        ? `${filterId}.interval.civil_end_time >= "${date}T00:00:00" AND ${filterId}.interval.civil_end_time < "${nd}T23:59:59"`
        : `${filterId}.interval.civil_start_time >= "${date}T00:00:00" AND ${filterId}.interval.civil_start_time < "${nd}T00:00:00"`
  const url = `${API}/users/me/dataTypes/${dataType}/dataPoints?pageSize=100&filter=${encodeURIComponent(filter)}`
  const diag: DiagEntry = { dataType, method: 'list', status: 0, ok: false }
  diags.push(diag)
  try {
    const json = (await authedJson(url, token)) as { dataPoints?: Record<string, unknown>[] }
    if (DEBUG) console.info(`[health] list ${dataType}`, json)
    const points = json.dataPoints ?? []
    diag.status = 200
    diag.ok = true
    diag.pointCount = points.length
    return points
  } catch (e) {
    const err = e as Error & { status?: number; body?: string }
    diag.status = err.status ?? 'err'
    diag.note = err.body || err.message
    if (err.status === 401) throw e
    if (DEBUG) console.warn(`[health] list ${dataType} failed`, err.status, err.body)
    return []
  }
}

/** Pull the first numeric value among candidate keys (handles string-encoded numbers). */
function pickNumber(obj: Record<string, unknown> | null | undefined, keys: string[]): number | null {
  if (!obj) return null
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v)
  }
  return null
}

const KG_TO_LB = 2.20462

/** Sum sleep-session durations (ms) across the day's sleep dataPoints. */
function sleepHoursFrom(points: Record<string, unknown>[]): number | null {
  let ms = 0
  let found = false
  for (const p of points) {
    const sleep = p[unionKey('sleep')] as Record<string, unknown> | undefined
    const interval = sleep?.interval as { startTime?: string; endTime?: string } | undefined
    if (interval?.startTime && interval?.endTime) {
      const dur = new Date(interval.endTime).getTime() - new Date(interval.startTime).getTime()
      if (dur > 0) {
        ms += dur
        found = true
        continue
      }
    }
    // Fallback: a summary minutes field on the session.
    const summary = sleep?.summary as Record<string, unknown> | undefined
    const mins = pickNumber(summary ?? null, ['minutesInSleepPeriod', 'minutesAsleep', 'totalMinutes'])
    if (mins != null) {
      ms += mins * 60_000
      found = true
    }
  }
  return found ? Math.round((ms / 3_600_000) * 100) / 100 : null
}

/**
 * Fetch one day's metrics from the Google Health API. Each data type is fetched
 * independently so a missing scope/type leaves its field null rather than
 * failing the whole sync. `date` is yyyy-MM-dd. Records per-metric outcomes in
 * getFitbitDiagnostics(); set localStorage['basecamp.fitbit.debug']='1' to also
 * log raw responses.
 */
export async function fetchFitbitDay(date: string): Promise<FitbitDay> {
  const token = await getAccessToken()
  const diags: DiagEntry[] = [] // local to this call; published to lastDiag once complete

  const [steps, totalCal, weight, nutrition, rhrPoints, sleepPoints] = await Promise.all([
    dailyRollUp('steps', date, token, diags),
    dailyRollUp('total-calories', date, token, diags),
    dailyRollUp('weight', date, token, diags),
    dailyRollUp('nutrition-log', date, token, diags),
    listDay('daily-resting-heart-rate', 'daily_resting_heart_rate', date, token, diags, 'date'),
    listDay('sleep', 'sleep', date, token, diags, 'civil_end_time'),
  ])
  lastDiag = diags

  const weightGrams = pickNumber(weight, ['weightGramsAvg', 'weightGrams', 'weight_grams_avg'])
  const weightKg = weightGrams != null ? weightGrams / 1000 : null
  const rhr = rhrPoints.length ? (rhrPoints[rhrPoints.length - 1][unionKey('daily-resting-heart-rate')] as Record<string, unknown>) : null

  return {
    steps: pickNumber(steps, ['countSum', 'count_sum', 'count']),
    calories_out: pickNumber(totalCal, ['kcalSum', 'kcal_sum', 'kcal']),
    rhr_bpm: pickNumber(rhr, ['beatsPerMinute', 'beats_per_minute', 'bpm']),
    weight: weightKg != null ? Math.round(weightKg * KG_TO_LB * 10) / 10 : null,
    sleep_hours: sleepHoursFrom(sleepPoints),
    // Nutrition shapes are the least-documented; best-effort + diagnostics will calibrate.
    calories_in: pickNumber(nutrition, ['kcalSum', 'kcal_sum', 'kcal', 'caloriesKcal', 'calories']),
    protein_g: pickNumber(nutrition, ['proteinGramsSum', 'proteinGrams', 'protein_grams', 'protein']),
    carbs_g: pickNumber(nutrition, ['carbsGramsSum', 'carbsGrams', 'carbs_grams', 'carbs']),
    fat_g: pickNumber(nutrition, ['fatGramsSum', 'fatGrams', 'fat_grams', 'fat']),
  }
}

/**
 * Merge a fetched day into a daily log. Source-of-truth, but ONLY overwrites a
 * field when it actually has a value — so a day with no weigh-in won't clobber a
 * manually entered weight. Stamps fitbit_synced_at.
 */
export function applyFitbitToLog(log: DailyLog, day: FitbitDay): DailyLog {
  const merged = { ...log }
  const keys: (keyof FitbitDay)[] = [
    'steps', 'sleep_hours', 'rhr_bpm', 'weight',
    'calories_out', 'calories_in', 'protein_g', 'carbs_g', 'fat_g',
  ]
  for (const k of keys) {
    if (day[k] != null) (merged as Record<string, unknown>)[k] = day[k]
  }
  merged.fitbit_synced_at = new Date().toISOString()
  return merged
}
