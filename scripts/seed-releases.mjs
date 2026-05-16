import Database from 'better-sqlite3'
import { randomBytes } from 'crypto'

const db = new Database('./dev.db')

function cuid() {
  return 'c' + randomBytes(11).toString('hex')
}

function checklist(items) {
  return JSON.stringify(items.map(({ label, done }) => ({ label, done })))
}

const LABEL_ID = 'cmn7l2zto00017cvkrxnheox1'

const TRACKS = {
  valeria:    'c0a4b92d3a51c590b72ffdb',
  krrysopher: 'c5a1ae76f0393381c1a4081',
  cojo:       'cef340fd711bbf8cfc2bd66',
  hvnds:      'ca9575dfc926d7ec3b5f89e',
  matek:      'c6a08a5fd1a2c5ebe7d2504',
  subcarpati: 'c3ec6bbacd259523a9634f1',
  motans:     'c41372726291384ddd79d88',
  omlaluna:   'c0086935bf6034a4f999203',
}

// ── Șterge lansările existente ────────────────────────────────────────────
const deleted = db.prepare('DELETE FROM Release WHERE labelId = ?').run(LABEL_ID)
console.log(`✓ ${deleted.changes} lansări vechi șterse`)

// ── Date releases ─────────────────────────────────────────────────────────
const releases = [
  {
    id: cuid(),
    labelId: LABEL_ID,
    trackId: TRACKS.valeria,
    releaseDate: '2026-03-28',
    status: 'RELEASED',
    checklist: checklist([
      { label: 'Master audio finalizat',                         done: true },
      { label: 'Cover art aprobat',                              done: true },
      { label: 'Distribuit pe platforme (Spotify, Apple Music)', done: true },
      { label: 'Press kit trimis',                               done: true },
      { label: 'Campanie social media programată',               done: true },
    ]),
    pressRelease: null,
  },
  {
    id: cuid(),
    labelId: LABEL_ID,
    trackId: TRACKS.krrysopher,
    releaseDate: '2026-04-15',
    status: 'RELEASED',
    checklist: checklist([
      { label: 'Master audio finalizat',                         done: true },
      { label: 'Cover art aprobat',                              done: true },
      { label: 'Distribuit pe platforme (Spotify, Apple Music)', done: true },
      { label: 'Press kit trimis',                               done: true },
      { label: 'Campanie social media programată',               done: true },
    ]),
    pressRelease: null,
  },
  {
    id: cuid(),
    labelId: LABEL_ID,
    trackId: TRACKS.cojo,
    releaseDate: '2026-05-22',
    status: 'READY',
    checklist: checklist([
      { label: 'Master audio finalizat',                         done: true },
      { label: 'Cover art aprobat',                              done: true },
      { label: 'Distribuit pe platforme (Spotify, Apple Music)', done: true },
      { label: 'Press kit trimis',                               done: true },
      { label: 'Campanie social media programată',               done: false },
    ]),
    pressRelease: null,
  },
  {
    id: cuid(),
    labelId: LABEL_ID,
    trackId: TRACKS.hvnds,
    releaseDate: '2026-06-10',
    status: 'PLANNING',
    checklist: checklist([
      { label: 'Master audio finalizat',                         done: true },
      { label: 'Cover art aprobat',                              done: true },
      { label: 'Distribuit pe platforme (Spotify, Apple Music)', done: false },
      { label: 'Press kit trimis',                               done: false },
      { label: 'Campanie social media programată',               done: false },
    ]),
    pressRelease: null,
  },
  {
    id: cuid(),
    labelId: LABEL_ID,
    trackId: TRACKS.matek,
    releaseDate: '2026-07-18',
    status: 'PLANNING',
    checklist: checklist([
      { label: 'Master audio finalizat',                         done: true },
      { label: 'Cover art aprobat',                              done: false },
      { label: 'Distribuit pe platforme (Spotify, Apple Music)', done: false },
      { label: 'Press kit trimis',                               done: false },
      { label: 'Campanie social media programată',               done: false },
    ]),
    pressRelease: null,
  },
]

// ── Insert ────────────────────────────────────────────────────────────────
const insert = db.prepare(`
  INSERT INTO Release (id, labelId, trackId, albumId, releaseDate, status, checklist, pressRelease, socialPlan, createdAt, updatedAt)
  VALUES (@id, @labelId, @trackId, NULL, @releaseDate, @status, @checklist, @pressRelease, NULL, @createdAt, @updatedAt)
`)

const now = new Date().toISOString()

const artistNames = {
  [TRACKS.valeria]:    'Valeria Stoica',
  [TRACKS.krrysopher]: 'Krrysopher',
  [TRACKS.cojo]:       'COJO',
  [TRACKS.hvnds]:      'HVNDS',
  [TRACKS.matek]:      'MATEK',
}

const trackTitles = db.prepare('SELECT id, title FROM Track WHERE id IN (SELECT id FROM Track WHERE labelId = ?)').all(LABEL_ID)
const titleMap = Object.fromEntries(trackTitles.map(t => [t.id, t.title]))

for (const r of releases) {
  insert.run({ ...r, createdAt: now, updatedAt: now })
  const artist = artistNames[r.trackId] ?? 'Artist'
  const title  = titleMap[r.trackId]   ?? 'Piesă'
  console.log(`✓ ${r.status.padEnd(8)} — ${artist.padEnd(16)} — "${title}" — ${r.releaseDate}`)
}

console.log(`\n✓ ${releases.length} lansări create cu succes!`)
console.log('\nSumar:')
console.log('  RELEASED: 2  (28.03.2026, 15.04.2026)')
console.log('  READY:    1  (22.05.2026)')
console.log('  PLANNING: 2  (10.06.2026, 18.07.2026)')

db.close()
