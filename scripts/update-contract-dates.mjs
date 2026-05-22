import Database from 'better-sqlite3'

const db = new Database('./dev.db')

const LABEL_ID = 'cmn7l2zto00017cvkrxnheox1'

const updates = [
  { artistName: 'MATEK',       startDate: '2026-01-01', endDate: '2027-01-01', status: 'ACTIVE' },
  { artistName: 'Subcarpați',  startDate: '2025-04-01', endDate: '2026-04-01', status: 'EXPIRING' },
  { artistName: 'Krrysopher',  startDate: '2025-01-15', endDate: '2027-01-15', status: 'ACTIVE' },
]

const getArtistId = db.prepare(
  `SELECT id FROM Artist WHERE name = ? AND labelId = ?`
)

const updateContract = db.prepare(
  `UPDATE Contract SET startDate = ?, endDate = ?, status = ?, updatedAt = ?
   WHERE artistId = ? AND labelId = ?`
)

const now = new Date().toISOString()

for (const { artistName, startDate, endDate, status } of updates) {
  const artist = getArtistId.get(artistName, LABEL_ID)
  if (!artist) {
    console.warn(`⚠ Artist negăsit: "${artistName}" — sărit`)
    continue
  }
  const result = updateContract.run(startDate, endDate, status, now, artist.id, LABEL_ID)
  if (result.changes > 0) {
    console.log(`✓ ${artistName}: ${startDate} → ${endDate} [${status}]`)
  } else {
    console.warn(`⚠ Niciun contract actualizat pentru "${artistName}"`)
  }
}

db.close()
console.log('Gata.')
