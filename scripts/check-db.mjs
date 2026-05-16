import Database from 'better-sqlite3'

const db = new Database('./dev.db', { readonly: true })

const tables = ['User', 'Label', 'Artist', 'Track', 'Revenue', 'Contract', 'ARProspect', 'Release', 'AudioFingerprint', 'AIDetection', 'HumanMadeCertificate']

console.log('=== Starea bazei de date ===')
for (const table of tables) {
  try {
    const count = db.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get()
    console.log(`${table}: ${count.c}`)
  } catch (e) {
    console.log(`${table}: EROARE - ${e.message}`)
  }
}

console.log('\nArtiști:')
try {
  const artists = db.prepare('SELECT name, genre FROM "Artist"').all()
  artists.forEach(a => console.log(' -', a.name, `(${a.genre})`))
} catch(e) { console.log('Eroare:', e.message) }

console.log('\nUseri:')
try {
  const users = db.prepare('SELECT email, role, firstName, lastName FROM "User"').all()
  users.forEach(u => console.log(' -', u.email, `[${u.role}]`, u.firstName, u.lastName))
} catch(e) { console.log('Eroare:', e.message) }

db.close()
