import Database from 'better-sqlite3'
import { randomBytes } from 'crypto'

const db = new Database('./dev.db')

function cuid() {
  return 'c' + randomBytes(11).toString('hex')
}

// ── IDs artiști din DB ────────────────────────────────────────────────────
const HVNDS         = 'c7a47bb63a2f14ea979e83d'
const COJO          = 'c9d2b57906225c47f7b53d6'
const THE_MOTANS    = 'cce27aff9188caf4b15109d'
const OM_LA_LUNA    = 'cc9f2115cf9d793f8e1c6b0'
const KRRYSOPHER    = 'cc299bf7e018eaf85975d32'
const VALERIA       = 'cd461e4dfe06d4487239c53'
const SUBCARPATI    = 'c5c0211a04e6df0edc60eca'
const MATEK         = 'cmn7l9izo00027cvkyjjg99fn'
const LABEL_ID      = 'cmn7l2zto00017cvkrxnheox1'

const T_ROMANIA     = JSON.stringify(['România'])
const T_EU          = JSON.stringify(['România', 'Europa'])
const T_MONDIAL     = JSON.stringify(['România', 'Europa', 'Mondial'])

const R_STREAMING   = JSON.stringify(['Streaming', 'Distribuție digitală'])
const R_FULL        = JSON.stringify(['Streaming', 'Distribuție digitală', 'Radio', 'Sincronizare'])
const R_RADIO       = JSON.stringify(['Streaming', 'Distribuție digitală', 'Radio'])
const R_SYNC        = JSON.stringify(['Streaming', 'Sincronizare', 'Distribuție digitală'])

// ── 1. Actualizează contractele existente cu teritorii, drepturi, signedAt ──

const updateContract = db.prepare(`
  UPDATE Contract
  SET territories = @territories,
      rights      = @rights,
      signedAt    = @signedAt,
      specialClauses = COALESCE(@specialClauses, specialClauses),
      updatedAt   = @updatedAt
  WHERE artistId = @artistId
`)

const updates = [
  {
    artistId: KRRYSOPHER,
    territories: T_EU,
    rights: R_RADIO,
    signedAt: '2024-01-10T10:00:00.000Z',
    specialClauses: null,
    updatedAt: new Date().toISOString(),
  },
  {
    artistId: VALERIA,
    territories: T_MONDIAL,
    rights: R_FULL,
    signedAt: '2024-05-28T11:30:00.000Z',
    specialClauses: null,
    updatedAt: new Date().toISOString(),
  },
  {
    artistId: SUBCARPATI,
    territories: T_ROMANIA,
    rights: R_STREAMING,
    signedAt: '2024-03-25T09:00:00.000Z',
    specialClauses: 'Artistul își păstrează drepturile integrale asupra versurilor și compoziției.\nLabelul are drept de distribuție exclusivă pe teritoriul României pentru durata contractului.\nOrice utilizare în sincronizare (film, publicitate) necesită acordul explicit al artistului.',
    updatedAt: new Date().toISOString(),
  },
  {
    artistId: MATEK,
    territories: T_EU,
    rights: R_SYNC,
    signedAt: '2024-12-20T14:00:00.000Z',
    specialClauses: null,
    updatedAt: new Date().toISOString(),
  },
]

for (const u of updates) {
  const result = updateContract.run(u)
  const name = {
    [KRRYSOPHER]: 'Krrysopher',
    [VALERIA]:    'Valeria Stoica',
    [SUBCARPATI]: 'Subcarpați',
    [MATEK]:      'MATEK',
  }[u.artistId]
  console.log(`✓ Actualizat contract ${name} (${result.changes} rând)`)
}

// ── 2. Contracte noi pentru artiștii fără contract ────────────────────────

const insertContract = db.prepare(`
  INSERT OR IGNORE INTO Contract
    (id, artistId, labelId, duration, royaltyPercent, advance, territories, rights,
     specialClauses, status, startDate, endDate, signedAt, createdAt, updatedAt)
  VALUES
    (@id, @artistId, @labelId, @duration, @royaltyPercent, @advance, @territories, @rights,
     @specialClauses, @status, @startDate, @endDate, @signedAt, @createdAt, @updatedAt)
`)

const newContracts = [
  {
    id: cuid(),
    artistId: HVNDS,
    labelId: LABEL_ID,
    duration: '3 ani',
    royaltyPercent: 22,
    advance: 7000,
    territories: T_EU,
    rights: R_RADIO,
    specialClauses: 'Trupa are dreptul de a lansa materiale independente (EP-uri, single-uri) pe canale proprii, cu condiția notificării labelului cu 30 de zile înainte.\nLabelul asigură suport pentru producție în valoare de maxim 15.000 € per an.\nDreptul de imagine rămâne exclusiv al trupei.',
    status: 'ACTIVE',
    startDate: '2024-03-01',
    endDate: '2027-03-01',
    signedAt: '2024-02-20T10:00:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: cuid(),
    artistId: COJO,
    labelId: LABEL_ID,
    duration: '2 ani',
    royaltyPercent: 18,
    advance: null,
    territories: T_ROMANIA,
    rights: R_STREAMING,
    specialClauses: 'Contract în stadiu de draft — clauzele finale se negociază după lansarea primului single.\nRoyalty-ul se recalculează la 6 luni în funcție de performanță.',
    status: 'DRAFT',
    startDate: '2025-06-01',
    endDate: '2027-06-01',
    signedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: cuid(),
    artistId: THE_MOTANS,
    labelId: LABEL_ID,
    duration: '3 ani',
    royaltyPercent: 25,
    advance: 12000,
    territories: T_MONDIAL,
    rights: R_FULL,
    specialClauses: 'Labelul deține dreptul de prioritate pentru urmatoarele 2 albume după expirarea contractului.\nArtistul primește 100% din veniturile din concerte și merchandise.\nLabelul asigură buget de marketing minim 20.000 € per lansare de album.',
    status: 'ACTIVE',
    startDate: '2023-09-15',
    endDate: '2026-09-15',
    signedAt: '2023-09-10T12:00:00.000Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: cuid(),
    artistId: OM_LA_LUNA,
    labelId: LABEL_ID,
    duration: '2 ani',
    royaltyPercent: 20,
    advance: 5000,
    territories: T_EU,
    rights: R_RADIO,
    specialClauses: null,
    status: 'NEGOTIATION',
    startDate: '2025-07-01',
    endDate: '2027-07-01',
    signedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const artistNames = {
  [HVNDS]:      'HVNDS',
  [COJO]:       'COJO',
  [THE_MOTANS]: 'The Motans',
  [OM_LA_LUNA]: 'om la lună',
}

for (const c of newContracts) {
  insertContract.run(c)
  console.log(`✓ Contract nou creat: ${artistNames[c.artistId]} (${c.status}, ${c.royaltyPercent}%, ${c.duration})`)
}

// ── 3. Verificare finală ───────────────────────────────────────────────────

const total = db.prepare('SELECT COUNT(*) as n FROM Contract WHERE labelId = ?').get(LABEL_ID)
const withTerritories = db.prepare("SELECT COUNT(*) as n FROM Contract WHERE labelId = ? AND territories IS NOT NULL").get(LABEL_ID)
console.log(`\n✓ Total contracte: ${total.n} | Cu teritorii: ${withTerritories.n}`)

db.close()
