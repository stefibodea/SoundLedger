import Database from 'better-sqlite3'
import { randomBytes } from 'crypto'

const db = new Database('./dev.db')
const cuid = () => 'c' + randomBytes(11).toString('hex')
const labelId = 'cmn7l2zto00017cvkrxnheox1'
const now = new Date().toISOString()

const ids = {
  'MATEK': 'cmn7l9izo00027cvkyjjg99fn',
  'Krrysopher': 'cc299bf7e018eaf85975d32',
  'Valeria Stoica': 'cd461e4dfe06d4487239c53',
  'Subcarpati': 'c5c0211a04e6df0edc60eca',
  'HVNDS': 'c7a47bb63a2f14ea979e83d',
  'COJO': 'c9d2b57906225c47f7b53d6',
  'The Motans': 'cce27aff9188caf4b15109d',
  'om la luna': 'cc9f2115cf9d793f8e1c6b0',
}

const tracks = [
  // Krrysopher
  { artist: 'Krrysopher', title: 'Homesick', genre: 'Indie', releaseDate: '2023-03-15', bpm: 82, duration: 198 },
  { artist: 'Krrysopher', title: 'sare', genre: 'Indie', releaseDate: '2025-01-24', bpm: 95, duration: 212 },
  { artist: 'Krrysopher', title: 'INDIGO (close your eyes)', genre: 'Indie Rock', releaseDate: '2024-06-07', bpm: 110, duration: 187 },
  { artist: 'Krrysopher', title: 'fantezie', genre: 'Indie', releaseDate: '2024-11-15', bpm: 88, duration: 203 },

  // Valeria Stoica
  { artist: 'Valeria Stoica', title: 'Distante', genre: 'Indie Pop', releaseDate: '2017-11-10', bpm: 76, duration: 231 },
  { artist: 'Valeria Stoica', title: 'Get Back', genre: 'Indie Pop', releaseDate: '2018-03-02', bpm: 88, duration: 195 },
  { artist: 'Valeria Stoica', title: 'Empty Air', genre: 'Indie Pop', releaseDate: '2019-10-18', bpm: 72, duration: 218 },
  { artist: 'Valeria Stoica', title: 'Hazy', genre: 'Indie Folk', releaseDate: '2024-09-20', bpm: 68, duration: 226 },

  // Subcarpati
  { artist: 'Subcarpati', title: 'Undeva in Balcani', genre: 'Folk Hop', releaseDate: '2016-08-26', bpm: 94, duration: 268 },
  { artist: 'Subcarpati', title: 'Pasare ca cucu', genre: 'Folk Hop', releaseDate: '2023-08-15', bpm: 87, duration: 245 },
  { artist: 'Subcarpati', title: 'Pankaraala 2', genre: 'Hip-Hop', releaseDate: '2024-03-08', bpm: 102, duration: 193 },
  { artist: 'Subcarpati', title: 'Proba de Suflet', genre: 'Folk Hop', releaseDate: '2024-07-19', bpm: 91, duration: 221 },

  // HVNDS
  { artist: 'HVNDS', title: 'Turn On', genre: 'Rock', releaseDate: '2016-10-01', bpm: 140, duration: 178 },
  { artist: 'HVNDS', title: 'Home', genre: 'Rock', releaseDate: '2017-02-14', bpm: 128, duration: 204 },
  { artist: 'HVNDS', title: 'Blood', genre: 'Metal', releaseDate: '2025-09-26', bpm: 155, duration: 215 },
  { artist: 'HVNDS', title: 'Cel mai dulce blestem', genre: 'Alternative Rock', releaseDate: '2025-02-07', bpm: 118, duration: 198, composers: 'Andrei Wintincher, Cristi Ciofu' },
  { artist: 'HVNDS', title: 'Dor', genre: 'Alternative Rock', releaseDate: '2026-02-01', bpm: 112, duration: 189, composers: 'Andrei Wintincher' },

  // COJO
  { artist: 'COJO', title: 'Latent', genre: 'Alternative', releaseDate: '2025-03-12', bpm: 86, duration: 208 },
  { artist: 'COJO', title: 'Erupt', genre: 'Alternative', releaseDate: '2025-01-17', bpm: 92, duration: 221 },
  { artist: 'COJO', title: 'Din mine pentru toti', genre: 'Alternative', releaseDate: '2024-10-04', bpm: 78, duration: 234 },
  { artist: 'COJO', title: 'Daca stiam', genre: 'Alternative', releaseDate: '2024-12-06', bpm: 84, duration: 216, composers: 'Andrei-Ovidiu Cojocaru' },
  { artist: 'COJO', title: 'Asta seara mancam in familie', genre: 'Alternative', releaseDate: '2025-01-03', bpm: 74, duration: 247 },

  // The Motans
  { artist: 'The Motans', title: 'Versus', genre: 'Pop', releaseDate: '2016-08-01', bpm: 95, duration: 243, composers: 'Denis Roabes' },
  { artist: 'The Motans', title: 'Jackpot', genre: 'Electronic Pop', releaseDate: '2018-05-18', bpm: 108, duration: 211, composers: 'Denis Roabes' },
  { artist: 'The Motans', title: 'POEM', genre: 'Electronic Pop', releaseDate: '2019-04-11', bpm: 82, duration: 256, composers: 'Denis Roabes, Irina Rimes' },
  { artist: 'The Motans', title: 'Pentru Ca', genre: 'Pop', releaseDate: '2018-11-09', bpm: 118, duration: 199, composers: 'Denis Roabes' },
  { artist: 'The Motans', title: 'ISNFN', genre: 'Electronic Pop', releaseDate: '2020-03-27', bpm: 96, duration: 228, composers: 'Denis Roabes' },

  // om la luna
  { artist: 'om la luna', title: 'La capat de linie', genre: 'Indie Pop', releaseDate: '2023-04-14', bpm: 79, duration: 219 },
  { artist: 'om la luna', title: 'Supranatural', genre: 'Indie Pop', releaseDate: '2022-09-09', bpm: 88, duration: 204 },
  { artist: 'om la luna', title: 'Spre inaltime', genre: 'Indie Pop', releaseDate: '2022-05-20', bpm: 84, duration: 198 },
  { artist: 'om la luna', title: 'Orasul meu', genre: 'Indie Pop', releaseDate: '2023-10-06', bpm: 92, duration: 213 },
  { artist: 'om la luna', title: 'Noapte buna', genre: 'Indie Pop', releaseDate: '2024-02-14', bpm: 71, duration: 231 },

  // MATEK
  { artist: 'MATEK', title: 'Deep Down', genre: 'House', releaseDate: '2023-06-01', bpm: 124, duration: 356 },
  { artist: 'MATEK', title: 'Bass Therapy', genre: 'Bass House', releaseDate: '2024-01-19', bpm: 128, duration: 412 },
  { artist: 'MATEK', title: 'Iasi Sessions Vol.1', genre: 'Electronic', releaseDate: '2024-08-30', bpm: 132, duration: 3600 },
  { artist: 'MATEK', title: 'Gravity Pull', genre: 'House', releaseDate: '2025-03-07', bpm: 126, duration: 378 },
]

const stmt = db.prepare(`INSERT INTO Track (id, title, genre, releaseDate, status, bpm, duration, composers, type, artistId, labelId, createdAt, updatedAt)
VALUES (@id, @title, @genre, @releaseDate, @status, @bpm, @duration, @composers, @type, @artistId, @labelId, @createdAt, @updatedAt)`)

let count = 0
for (const t of tracks) {
  stmt.run({
    id: cuid(),
    title: t.title,
    genre: t.genre ?? null,
    releaseDate: t.releaseDate ?? null,
    status: 'RELEASED',
    bpm: t.bpm ?? null,
    duration: t.duration ?? null,
    composers: t.composers ?? null,
    type: 'SINGLE',
    artistId: ids[t.artist],
    labelId,
    createdAt: now,
    updatedAt: now,
  })
  count++
}
console.log(`✓ ${count} piese adaugate`)

const summary = db.prepare('SELECT a.name, COUNT(t.id) as cnt FROM Artist a LEFT JOIN Track t ON t.artistId=a.id GROUP BY a.id ORDER BY a.name').all()
summary.forEach(r => console.log(`  ${r.name}: ${r.cnt} piese`))

db.close()
