import Database from 'better-sqlite3'
import { randomBytes } from 'crypto'

const db = new Database('./dev.db')

function cuid() {
  return 'c' + randomBytes(11).toString('hex')
}

const contracts = [
  {
    artist: 'The Motans',
    status: 'ACTIVE',
    royaltyPercent: 25,
    advance: 12000,
    startDate: '15.09.2023',
    endDate: '15.09.2026',
    territories: '["Romania","Europa","Mondial"]',
    rights: '["streaming","digital","sync","physical"]',
  },
  {
    artist: 'Valeria Stoica',
    status: 'ACTIVE',
    royaltyPercent: 22,
    advance: 8000,
    startDate: '01.06.2024',
    endDate: '01.06.2027',
    territories: '["Romania","Europa","Mondial"]',
    rights: '["streaming","digital","sync","physical"]',
  },
  {
    artist: 'HVNDS',
    status: 'ACTIVE',
    royaltyPercent: 22,
    advance: 7000,
    startDate: '01.03.2024',
    endDate: '01.03.2027',
    territories: '["Romania","Europa"]',
    rights: '["streaming","digital","sync"]',
  },
  {
    artist: 'MATEK',
    status: 'ACTIVE',
    royaltyPercent: 20,
    advance: 3000,
    startDate: '01.01.2026',
    endDate: '01.01.2027',
    territories: '["Romania","Europa"]',
    rights: '["streaming","digital"]',
  },
  {
    artist: 'Krrysopher',
    status: 'ACTIVE',
    royaltyPercent: 18.5,
    advance: 5000,
    startDate: '15.01.2025',
    endDate: '15.01.2027',
    territories: '["Romania","Europa"]',
    rights: '["streaming","digital","sync"]',
  },
  {
    artist: 'Subcarpați',
    status: 'EXPIRING',
    royaltyPercent: 15,
    advance: null,
    startDate: '01.04.2025',
    endDate: '01.04.2026',
    territories: '["Romania"]',
    rights: '["streaming","digital"]',
  },
  {
    artist: 'om la lună',
    status: 'NEGOTIATION',
    royaltyPercent: 20,
    advance: 5000,
    startDate: '01.07.2025',
    endDate: '01.07.2027',
    territories: '["Romania","Europa"]',
    rights: '["streaming","digital"]',
  },
  {
    artist: 'COJO',
    status: 'DRAFT',
    royaltyPercent: 18,
    advance: null,
    startDate: '01.06.2025',
    endDate: '01.06.2027',
    territories: '["Romania"]',
    rights: '["streaming","digital"]',
  },
]

const findArtist = db.prepare(`SELECT id, labelId FROM Artist WHERE name LIKE ? LIMIT 1`)
const findContract = db.prepare(`SELECT id FROM Contract WHERE artistId = ? LIMIT 1`)
const updateContract = db.prepare(`
  UPDATE Contract SET
    status = ?, royaltyPercent = ?, advance = ?,
    startDate = ?, endDate = ?, territories = ?, rights = ?,
    updatedAt = datetime('now')
  WHERE id = ?
`)
const insertContract = db.prepare(`
  INSERT INTO Contract
    (id, status, royaltyPercent, advance, startDate, endDate, territories, rights,
     duration, artistId, labelId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`)

for (const c of contracts) {
  const artist = findArtist.get(`%${c.artist}%`)
  if (!artist) {
    console.log(`✗ ${c.artist} — artist negăsit în DB`)
    continue
  }

  const existing = findContract.get(artist.id)

  if (existing) {
    updateContract.run(
      c.status, c.royaltyPercent, c.advance,
      c.startDate, c.endDate, c.territories, c.rights,
      existing.id,
    )
  } else {
    const [y1, y2] = [c.startDate.slice(-4), c.endDate.slice(-4)]
    const duration = `${parseInt(y2) - parseInt(y1)} ${parseInt(y2) - parseInt(y1) === 1 ? 'an' : 'ani'}`
    insertContract.run(
      cuid(), c.status, c.royaltyPercent, c.advance,
      c.startDate, c.endDate, c.territories, c.rights,
      duration, artist.id, artist.labelId,
    )
  }

  console.log(`✓ ${c.artist} — ${c.status} — ${c.royaltyPercent}% — ${c.startDate} → ${c.endDate}`)
}

db.close()
console.log('\n✓ Toate contractele au fost actualizate!')
