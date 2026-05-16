import Database from 'better-sqlite3'

const db = new Database('./dev.db')

const tracks = db.prepare("SELECT id, title FROM Track WHERE title LIKE '%balcani%' OR title LIKE '%Balcani%'").all()
console.log('Găsite:', tracks)

if (tracks.length === 1) {
  db.prepare("DELETE FROM Track WHERE id = ?").run(tracks[0].id)
  console.log('Ștearsă:', tracks[0].title, '(id:', tracks[0].id + ')')
} else if (tracks.length === 0) {
  console.log('Nicio piesă găsită.')
} else {
  console.log('Mai multe piese găsite — nu am șters nimic, specifică mai bine.')
}

db.close()
