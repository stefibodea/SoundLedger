import Database from 'better-sqlite3'

const db = new Database('./dev.db')

const fingerprints = db.prepare(`
  SELECT af.trackId, af.tempo, t.title, t.bpm
  FROM AudioFingerprint af
  JOIN Track t ON t.id = af.trackId
`).all()

if (fingerprints.length === 0) {
  console.log('Nicio amprentă audio găsită în DB.')
  db.close()
  process.exit(0)
}

const update = db.prepare('UPDATE Track SET bpm = ?, updatedAt = ? WHERE id = ?')

let updated = 0
let skipped = 0

for (const fp of fingerprints) {
  const bpm = Math.round(fp.tempo)
  if (fp.bpm === bpm) {
    skipped++
    continue
  }
  update.run(bpm, new Date().toISOString(), fp.trackId)
  console.log(`✓ "${fp.title}" — BPM: ${fp.bpm ?? 'null'} → ${bpm}`)
  updated++
}

console.log(`\nRezumat: ${updated} actualizate, ${skipped} deja corecte.`)
db.close()
