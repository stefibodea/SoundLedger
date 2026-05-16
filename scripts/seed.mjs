import Database from 'better-sqlite3'
import { randomBytes } from 'crypto'

const db = new Database('./dev.db')
const labelId = 'cmn7l2zto00017cvkrxnheox1'

function cuid() {
  return 'c' + randomBytes(11).toString('hex')
}

// ── Artiști ────────────────────────────────────────────────────────────────
const artists = [
  {
    id: 'cmn7l9izo00027cvkyjjg99fn', name: 'MATEK', realName: 'MATEK', genre: 'House', subgenre: 'Bass House',
    bio: 'DJ și producător din Iași specializat în house și bass music.',
    nationality: 'Română', instagram: '@matek_music',
  },
  {
    id: 'cc299bf7e018eaf85975d32', name: 'Krrysopher', realName: 'Krrysopher', genre: 'Indie', subgenre: 'Indie Rock',
    bio: 'Artist indie rock din București cu sound atmosferic.',
    nationality: 'Română', instagram: '@krrysopher',
  },
  {
    id: 'c5c0211a04e6df0edc60eca', name: 'Subcarpati', realName: 'Andrei Munteanu', genre: 'Hip-Hop', subgenre: 'Folk Hop',
    bio: 'Rapper și producător care îmbină versuri sociale cu sample-uri din muzica populară românească.',
    nationality: 'Română', instagram: '@subcarpati_official',
    youtubeUrl: 'https://youtube.com/@subcarpati',
  },
  {
    id: 'c7a47bb63a2f14ea979e83d', name: 'HVNDS', realName: 'Andrei Wintincher', genre: 'Rock', subgenre: 'Alternative Rock',
    bio: 'Trupa rock din București cu influențe metal și alternative.',
    nationality: 'Română', instagram: '@hvndsband',
  },
  {
    id: 'c9d2b57906225c47f7b53d6', name: 'COJO', realName: 'Andrei Cojocaru', genre: 'Alternative', subgenre: 'Indie Rock',
    bio: 'Artist independent din Iași cu sound experimental.',
    nationality: 'Română', instagram: '@cojo_music',
  },
  {
    id: 'cce27aff9188caf4b15109d', name: 'The Motans', realName: 'The Motans', genre: 'Pop', subgenre: 'Electronic Pop',
    bio: 'Trupa pop din București cunoscută pentru hit-uri dance.',
    nationality: 'Română', instagram: '@themotans',
  },
  {
    id: 'cc9f2115cf9d793f8e1c6b0', name: 'om la lună', realName: 'Om la Lună', genre: 'Indie Pop', subgenre: 'Indie Pop',
    bio: 'Trupa indie pop din Cluj cu sound fresh și versuri poetice.',
    nationality: 'Română', instagram: '@omlaluna',
  },  {
    id: 'cd461e4dfe06d4487239c53', name: 'Valeria Stoica', realName: 'Valeria Stoica', genre: 'Indie Pop', subgenre: 'Indie Folk',
    bio: 'Artistă indie folk din București cu voce caldă și aranjamente acustice.',
    nationality: 'Română', instagram: '@valeriast',
  },]

const insertArtist = db.prepare(`
  INSERT OR IGNORE INTO Artist (id, name, realName, genre, subgenre, bio, nationality, instagram, contactEmail, spotifyUrl, youtubeUrl, labelId, createdAt, updatedAt)
  VALUES (@id, @name, @realName, @genre, @subgenre, @bio, @nationality, @instagram, @contactEmail, @spotifyUrl, @youtubeUrl, @labelId, @createdAt, @updatedAt)
`)

for (const a of artists) {
  insertArtist.run({ ...a, labelId, realName: a.realName ?? null, subgenre: a.subgenre ?? null, bio: a.bio ?? null, nationality: a.nationality ?? null, instagram: a.instagram ?? null, contactEmail: a.contactEmail ?? null, spotifyUrl: a.spotifyUrl ?? null, youtubeUrl: a.youtubeUrl ?? null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
}
console.log('✓ Artiști adăugați')

// ── Piese ──────────────────────────────────────────────────────────────────
const tracks = [
  { id: cuid(), title: 'Dimineți albastre', type: 'SINGLE', genre: 'Pop', isrc: 'ROSL12500001', bpm: 98, key: 'C minor', duration: 214, status: 'RELEASED', releaseDate: '2025-03-15', artistIdx: 0 },
  { id: cuid(), title: 'Nopți de vară', type: 'SINGLE', genre: 'Pop', isrc: 'ROSL12500002', bpm: 112, key: 'G major', duration: 187, status: 'RELEASED', releaseDate: '2025-06-01', artistIdx: 0 },
  { id: cuid(), title: 'Umbre', type: 'SINGLE', genre: 'R&B', isrc: 'ROSL12500003', bpm: 78, key: 'F minor', duration: 243, status: 'RELEASED', releaseDate: '2025-01-20', artistIdx: 1 },
  { id: cuid(), title: 'Rădăcini', type: 'SINGLE', genre: 'R&B', isrc: 'ROSL12500004', bpm: 85, key: 'D minor', duration: 198, status: 'UNRELEASED', artistIdx: 1 },
  { id: cuid(), title: 'Munte și vale', type: 'SINGLE', genre: 'Hip-Hop', isrc: 'ROSL12500005', bpm: 90, key: 'A minor', duration: 225, status: 'RELEASED', releaseDate: '2025-04-10', artistIdx: 2 },
  { id: cuid(), title: 'Codrul verde', type: 'SINGLE', genre: 'Hip-Hop', isrc: 'ROSL12500006', bpm: 87, key: 'E minor', duration: 201, status: 'UNRELEASED', artistIdx: 2 },
]

const insertTrack = db.prepare(`
  INSERT OR IGNORE INTO Track (id, title, type, genre, isrc, bpm, key, duration, status, releaseDate, artistId, labelId, createdAt, updatedAt)
  VALUES (@id, @title, @type, @genre, @isrc, @bpm, @key, @duration, @status, @releaseDate, @artistId, @labelId, @createdAt, @updatedAt)
`)

for (const t of tracks) {
  insertTrack.run({ ...t, artistId: artists[t.artistIdx].id, labelId, releaseDate: t.releaseDate ?? null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
}
console.log('✓ Piese adăugate')

// ── Venituri ───────────────────────────────────────────────────────────────
const revenues = [
  { source: 'STREAMING', amount: 1240.50, period: '2025-01', artistIdx: 0, trackIdx: 0 },
  { source: 'STREAMING', amount: 980.00, period: '2025-02', artistIdx: 0, trackIdx: 0 },
  { source: 'STREAMING', amount: 1580.75, period: '2025-03', artistIdx: 0, trackIdx: 0 },
  { source: 'STREAMING', amount: 2100.20, period: '2025-04', artistIdx: 0, trackIdx: 1 },
  { source: 'STREAMING', amount: 890.00, period: '2025-01', artistIdx: 1, trackIdx: 2 },
  { source: 'STREAMING', amount: 1320.40, period: '2025-02', artistIdx: 1, trackIdx: 2 },
  { source: 'LICENSING', amount: 3500.00, period: '2025-02', artistIdx: 1, trackIdx: 2 },
  { source: 'STREAMING', amount: 760.10, period: '2025-04', artistIdx: 2, trackIdx: 4 },
  { source: 'SYNC', amount: 2200.00, period: '2025-03', artistIdx: 2, trackIdx: 4 },
]

const insertRevenue = db.prepare(`
  INSERT OR IGNORE INTO Revenue (id, source, amount, period, artistId, trackId, labelId, createdAt)
  VALUES (@id, @source, @amount, @period, @artistId, @trackId, @labelId, @createdAt)
`)

for (const r of revenues) {
  insertRevenue.run({ id: cuid(), ...r, artistId: artists[r.artistIdx].id, trackId: tracks[r.trackIdx].id, labelId, createdAt: new Date().toISOString() })
}
console.log('✓ Venituri adăugate')

// ── Contracte ──────────────────────────────────────────────────────────────
const contracts = [
  { artistIdx: 0, royaltyPercent: 18.5, advance: 5000, duration: '2 ani', status: 'ACTIVE', startDate: '2024-01-15', endDate: '2026-01-15', specialClauses: 'Exclusivitate pe piața română și moldoveană. Label deține drepturile de distribuție digitală pe 5 ani.' },
  { artistIdx: 1, royaltyPercent: 22, advance: 8000, duration: '3 ani', status: 'ACTIVE', startDate: '2024-06-01', endDate: '2027-06-01', specialClauses: 'Artist primește 50% din veniturile sync licensing. Clauză de exit după 18 luni cu penalizare de 15%.' },
  { artistIdx: 2, royaltyPercent: 15, advance: null, duration: '1 an', status: 'EXPIRING', startDate: '2024-04-01', endDate: '2025-04-01', specialClauses: null },
]

const insertContract = db.prepare(`
  INSERT OR IGNORE INTO Contract (id, royaltyPercent, advance, duration, status, startDate, endDate, specialClauses, artistId, labelId, createdAt, updatedAt)
  VALUES (@id, @royaltyPercent, @advance, @duration, @status, @startDate, @endDate, @specialClauses, @artistId, @labelId, @createdAt, @updatedAt)
`)

for (const c of contracts) {
  insertContract.run({ id: cuid(), ...c, advance: c.advance ?? null, specialClauses: c.specialClauses ?? null, artistId: artists[c.artistIdx].id, labelId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
}
console.log('✓ Contracte adăugate')

// ── Prospecte A&R ──────────────────────────────────────────────────────────
const prospects = [
  { name: 'Mara Florescu', status: 'ANALYZING', spotifyUrl: 'https://open.spotify.com/artist/mara', instagram: '@maraflorescu', notes: 'Artistă pop cu 45k urmăritori pe Instagram. Single-ul "Departe" a ajuns viral pe TikTok în februarie.' },
  { name: 'DJ Nocturn', status: 'CONTACTED', instagram: '@djnocturn', youtubeUrl: 'https://youtube.com/@djnocturn', notes: 'Produce electronic și house. Rezidenție la club Midi din Cluj. Colaborare cu 3 artiști internaționali.' },
  { name: 'Raze de Lună', status: 'NEGOTIATION', spotifyUrl: 'https://open.spotify.com/artist/raze', notes: 'Duo folk-pop, 120k stream-uri pe Spotify în ultimele 30 de zile. Caută label pentru distribuție internațională.' },
  { name: 'Victor Popa', status: 'IDENTIFIED', instagram: '@victorpopa_music', notes: 'Cântăreț și chitarist, stil acustic. Recomandare din partea lui Luca Ioniță.' },
  { name: 'Bianca Rus', status: 'IDENTIFIED', notes: 'Artistă trap/R&B, 18 ani, demo primit prin email. Voce interesantă, producție brută.' },
]

const insertProspect = db.prepare(`
  INSERT OR IGNORE INTO ARProspect (id, name, status, spotifyUrl, youtubeUrl, instagram, notes, labelId, createdAt, updatedAt)
  VALUES (@id, @name, @status, @spotifyUrl, @youtubeUrl, @instagram, @notes, @labelId, @createdAt, @updatedAt)
`)

for (const p of prospects) {
  insertProspect.run({ id: cuid(), ...p, spotifyUrl: p.spotifyUrl ?? null, youtubeUrl: p.youtubeUrl ?? null, instagram: p.instagram ?? null, notes: p.notes ?? null, labelId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
}
console.log('✓ Prospecte A&R adăugate')

// ── Lansări ────────────────────────────────────────────────────────────────
const checklist = JSON.stringify([
  { label: 'Master audio finalizat', done: true },
  { label: 'Cover art aprobat', done: true },
  { label: 'Distribuit pe platforme (Spotify, Apple Music)', done: false },
  { label: 'Comunicat de presă trimis', done: false },
  { label: 'Campanie social media programată', done: false },
])

const insertRelease = db.prepare(`
  INSERT OR IGNORE INTO Release (id, releaseDate, status, checklist, trackId, labelId, createdAt, updatedAt)
  VALUES (@id, @releaseDate, @status, @checklist, @trackId, @labelId, @createdAt, @updatedAt)
`)

insertRelease.run({ id: cuid(), releaseDate: '2025-05-20', status: 'PLANNING', checklist, trackId: tracks[3].id, labelId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
insertRelease.run({ id: cuid(), releaseDate: '2025-06-15', status: 'READY', checklist, trackId: tracks[5].id, labelId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
console.log('✓ Lansări adăugate')

// ── AI Compliance — Permisiuni ─────────────────────────────────────────────
const insertPermission = db.prepare(`
  INSERT OR IGNORE INTO AIPermission (id, trackId, labelId, allowAITraining, allowResearchOnly, requiresLicense, artistConsent, minCompensation, consentDate, notes, createdAt, updatedAt)
  VALUES (@id, @trackId, @labelId, @allowAITraining, @allowResearchOnly, @requiresLicense, @artistConsent, @minCompensation, @consentDate, @notes, @createdAt, @updatedAt)
`)

// Piesa 0 (Dimineți albastre): artist a consimțit, permite research, necesită licență
insertPermission.run({ id: cuid(), trackId: tracks[0].id, labelId, allowAITraining: 0, allowResearchOnly: 1, requiresLicense: 1, artistConsent: 1, minCompensation: 500, consentDate: '2025-01-10T00:00:00.000Z', notes: 'Consimțit verbal și în scris. Exclus din dataset-uri comerciale.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
// Piesa 2 (Umbre): artistă refuză orice utilizare AI
insertPermission.run({ id: cuid(), trackId: tracks[2].id, labelId, allowAITraining: 0, allowResearchOnly: 0, requiresLicense: 1, artistConsent: 0, minCompensation: null, consentDate: null, notes: 'Elena Voicu a refuzat explicit orice formă de utilizare AI. A se respecta decizia artistei.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
// Piesa 4 (Munte și vale): permite training cu compensație minimă
insertPermission.run({ id: cuid(), trackId: tracks[4].id, labelId, allowAITraining: 1, allowResearchOnly: 0, requiresLicense: 1, artistConsent: 1, minCompensation: 1200, consentDate: '2025-03-01T00:00:00.000Z', notes: 'Subcarpați a aprobat cu condiția compensației minime de 1200 EUR per utilizare comercială.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
console.log('✓ Permisiuni AI adăugate')

// ── AI Compliance — Detecții ───────────────────────────────────────────────
const insertDetection = db.prepare(`
  INSERT OR IGNORE INTO AIDetection (id, labelId, suspectUrl, suspectTitle, suspectArtist, platform, similarityScore, matchedTrackIds, aiAnalysis, status, takedownSent, compensationClaimed, notes, createdAt, updatedAt)
  VALUES (@id, @labelId, @suspectUrl, @suspectTitle, @suspectArtist, @platform, @similarityScore, @matchedTrackIds, @aiAnalysis, @status, @takedownSent, @compensationClaimed, @notes, @createdAt, @updatedAt)
`)

// Detecție 1: Lolita Cercel — caz real, scor ridicat, confirmat
insertDetection.run({
  id: cuid(), labelId,
  suspectUrl: 'https://youtube.com/watch?v=lolita-cercel-demo',
  suspectTitle: 'Dragostea interzisă (AI Version)',
  suspectArtist: 'Lolita Cercel',
  platform: 'YouTube',
  similarityScore: 78,
  matchedTrackIds: JSON.stringify([tracks[0].id, tracks[2].id]),
  aiAnalysis: 'Analiza metadata indică o similitudine semnificativă cu piesele din catalog. Stilul vocal sintetic prezintă caracteristici comune cu "Dimineți albastre" și "Umbre". Structura armonică și BPM-ul se încadrează în aceleași plaje valorice. Recomand verificare prin serviciu de audio fingerprinting (AudD) și inițierea procedurii de takedown DMCA dacă similitudinea este confirmată. Documentați toate dovezile înainte de acțiune.',
  status: 'CONFIRMED',
  takedownSent: 1,
  compensationClaimed: 0,
  notes: 'Caz prioritar — artistă AI controversată, primul caz din România. Monitorizare continuă.',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
})

// Detecție 2: suspect respins — fals pozitiv
insertDetection.run({
  id: cuid(), labelId,
  suspectUrl: 'https://spotify.com/track/suspect-demo',
  suspectTitle: 'Noapte bună (Remix)',
  suspectArtist: 'Unknown AI Artist',
  platform: 'Spotify',
  similarityScore: 34,
  matchedTrackIds: JSON.stringify([]),
  aiAnalysis: 'Scorul de similitudine este scăzut. Deși genul muzical este similar (pop românesc), nu există indicii clare de utilizare a catalogului. Structura melodică și armonică diferă semnificativ. Probabilitate mică de utilizare neautorizată. Recomandat: monitorizare pasivă, fără acțiune imediată.',
  status: 'DISMISSED',
  takedownSent: 0,
  compensationClaimed: 0,
  notes: 'Fals pozitiv — coincidență stilistică, nu utilizare AI.',
  createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date().toISOString(),
})
console.log('✓ Detecții AI adăugate')

// ── AI Compliance — Certificate Human Made ────────────────────────────────
const year = new Date().getFullYear()
const insertCert = db.prepare(`
  INSERT OR IGNORE INTO HumanMadeCertificate (id, trackId, labelId, certificateCode, issuedAt, issuedById, declaration, isRevoked)
  VALUES (@id, @trackId, @labelId, @certificateCode, @issuedAt, @issuedById, @declaration, @isRevoked)
`)

// Certificat pentru "Dimineți albastre"
insertCert.run({
  id: cuid(), trackId: tracks[0].id, labelId,
  certificateCode: `HM-${year}-A1B2C3`,
  issuedAt: new Date('2025-02-01').toISOString(),
  issuedById: 'seed-label-manager',
  declaration: 'Certific prin prezenta că piesa "Dimineți albastre" este 100% creație umană. Niciun element al acestei piese (melodie, versuri, aranjament, producție) nu a fost generat sau asistat de sisteme de inteligență artificială. Toate drepturile de autor aparțin creatorilor umani implicați în realizarea acestei opere.',
  isRevoked: 0,
})

// Certificat pentru "Umbre"
insertCert.run({
  id: cuid(), trackId: tracks[2].id, labelId,
  certificateCode: `HM-${year}-D4E5F6`,
  issuedAt: new Date('2025-01-25').toISOString(),
  issuedById: 'seed-label-manager',
  declaration: 'Certific prin prezenta că piesa "Umbre" este 100% creație umană. Niciun element al acestei piese (melodie, versuri, aranjament, producție) nu a fost generat sau asistat de sisteme de inteligență artificială. Toate drepturile de autor aparțin creatorilor umani implicați în realizarea acestei opere.',
  isRevoked: 0,
  createdAt: new Date('2025-01-25').toISOString(),
})
console.log('✓ Certificate Human Made adăugate')

db.close()
console.log('\n✅ Date demo introduse cu succes!')
