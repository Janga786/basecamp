// Reads a program JSON (base), merges an optional RPE/technique/working-sets
// correction file over it, validates, and emits
// src/data/seed/liftProgram.ts.
// Run: node scripts/buildLiftProgram.mjs <base.json> [<rpe-fix.json>]
import fs from 'node:fs'
import path from 'node:path'

const outFile = process.argv[2]
const rpeFile = process.argv[3]
if (!outFile) {
  console.error('usage: node scripts/buildLiftProgram.mjs <base.json> [<rpe-fix.json>]')
  process.exit(1)
}
const wrapper = JSON.parse(fs.readFileSync(outFile, 'utf8'))
const result = typeof wrapper.result === 'string' ? JSON.parse(wrapper.result) : wrapper.result
const { days, report } = result

// ── Merge focused RPE re-extraction (corrects early/last RPE, technique, working_sets) ──
let mergeReport = { applied: 0, skipped: [], nameMismatches: [] }
if (rpeFile) {
  const rw = JSON.parse(fs.readFileSync(rpeFile, 'utf8'))
  const rr = typeof rw.result === 'string' ? JSON.parse(rw.result) : rw.result
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const byKey = Object.fromEntries(rr.pages.map((p) => [`W${p.week}D${p.day_index}`, p]))
  for (const d of days) {
    const key = `W${d.week}D${d.day_index}`
    const fix = byKey[key]
    if (!fix || !fix.ok || fix.rows.length !== d.exercises.length) {
      mergeReport.skipped.push(`${key}${fix ? ` (count ${fix?.rows.length} vs ${d.exercises.length})` : ' (missing)'}`)
      continue
    }
    d.exercises.forEach((e, i) => {
      const f = fix.rows[i]
      // Cross-check row alignment by name; warn if very different, but trust index order.
      if (norm(e.name).slice(0, 8) !== norm(f.name).slice(0, 8)) {
        mergeReport.nameMismatches.push(`${key} row ${i + 1}: "${e.name}" vs "${f.name}"`)
      }
      e.early_rpe = f.early_rpe
      e.last_rpe = f.last_rpe
      e.last_set_technique = f.last_set_technique || 'N/A'
      e.working_sets = String(f.working_sets ?? e.working_sets)
    })
    mergeReport.applied++
  }
  console.log('── RPE merge ─────────────────────────────────────────')
  console.log('Pages merged:', mergeReport.applied, '/ 60')
  console.log('Pages skipped:', mergeReport.skipped.length, mergeReport.skipped.join(', ') || '(none)')
  console.log('Row name mismatches (alignment warnings):', mergeReport.nameMismatches.length)
  for (const m of mergeReport.nameMismatches) console.log('   ?', m)
}

// ── Validate ──────────────────────────────────────────────────────────────────
const problems = []
if (days.length !== 60) problems.push(`expected 60 days, got ${days.length}`)
const seen = new Set()
for (const d of days) {
  const k = `W${d.week}D${d.day_index}`
  if (seen.has(k)) problems.push(`duplicate ${k}`)
  seen.add(k)
  if (!d.exercises?.length) problems.push(`${k}: no exercises`)
  d.exercises?.forEach((e, i) => {
    for (const f of ['name', 'reps', 'rest', 'last_rpe', 'early_rpe', 'working_sets', 'warmup_sets']) {
      if (!e[f] || !String(e[f]).trim()) problems.push(`${k} row ${i + 1}: empty ${f}`)
    }
  })
}
// Every (week, day) 1..12 x 1..5 present
for (let w = 1; w <= 12; w++)
  for (let dd = 1; dd <= 5; dd++) if (!seen.has(`W${w}D${dd}`)) problems.push(`missing W${w}D${dd}`)

console.log('── Parse quality report ──────────────────────────────')
console.log('Ground-truth W1D1:', JSON.stringify(report.ground_truth_w1d1))
console.log('Total days:', report.total_days, '/ 60')
console.log('Pages re-verified:', report.verified_pages.length, report.verified_pages.join(', ') || '(none)')
console.log('Non-high-confidence pages:', report.non_high_confidence.length)
for (const p of report.non_high_confidence) console.log('   ', p.page, p.conf, JSON.stringify(p.uncertain))
console.log('Pages with reconciled disagreements:', report.disagreement_pages.length)
for (const p of report.disagreement_pages) console.log('   ', p.page, JSON.stringify(p.diffs))
console.log('Deterministic-issue pages:', report.det_issue_pages.length)
for (const p of report.det_issue_pages) console.log('   ', p.page, JSON.stringify(p.issues))
const counts = {}
for (const d of days) counts[d.exercises.length] = (counts[d.exercises.length] || 0) + 1
console.log('Exercise-count distribution:', JSON.stringify(counts))
console.log('Validation problems:', problems.length)
for (const p of problems) console.log('   !', p)
console.log('──────────────────────────────────────────────────────')

// ── Emit clean TS (strip _meta, stable sort, keep canonical field order) ───────
const clean = days
  .slice()
  .sort((a, b) => a.week - b.week || a.day_index - b.day_index)
  .map((d) => ({
    week: d.week,
    day_index: d.day_index,
    day_label: d.day_label,
    block: d.block,
    exercises: d.exercises.map((e) => ({
      name: e.name,
      video_url: e.video_url || '',
      working_sets: String(e.working_sets ?? ''),
      warmup_sets: String(e.warmup_sets ?? ''),
      reps: e.reps || '',
      early_rpe: e.early_rpe || '',
      last_rpe: e.last_rpe || '',
      rest: e.rest || '',
      last_set_technique: e.last_set_technique || 'N/A',
      sub_1: e.sub_1 || '',
      sub_2: e.sub_2 || '',
      notes: e.notes || '',
    })),
  }))

const header = `import type { WorkoutDay } from '../types'

/**
 * Lift program: 12 weeks × 5 day-types. GENERATED FILE — do not hand-edit;
 * rerun scripts/buildLiftProgram.mjs to regenerate.
 */
export const LIFT_PROGRAM: WorkoutDay[] = ${JSON.stringify(clean, null, 2)}

export const LIFT_TOTAL_WEEKS = 12
export const LIFT_DAYS_PER_WEEK = 5
`

const dest = path.resolve('src/data/seed/liftProgram.ts')
fs.writeFileSync(dest, header)
console.log(`Wrote ${dest} (${clean.length} days, ${clean.reduce((n, d) => n + d.exercises.length, 0)} exercises)`)
