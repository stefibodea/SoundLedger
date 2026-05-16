import Database from 'better-sqlite3'

const db = new Database('./dev.db')

db.prepare(`
  INSERT INTO User (id, email, password, firstName, lastName, role, createdAt, updatedAt)
  VALUES ('cmn7l2zto00017cvkrxnheox2', 'demo@soundledger.ro', '$2b$10$dummy', 'Demo', 'User', 'SUPER_ADMIN', datetime('now'), datetime('now'))
`).run()

db.prepare(`
  INSERT INTO Label (id, name, country, city, genre, plan, ownerId, createdAt, updatedAt)
  VALUES ('cmn7l2zto00017cvkrxnheox1', 'SoundLedger Demo', 'România', 'București', 'Indie', 'INDIE', 'cmn7l2zto00017cvkrxnheox2', datetime('now'), datetime('now'))
`).run()

db.prepare(`
  UPDATE User SET labelId = 'cmn7l2zto00017cvkrxnheox1' WHERE id = 'cmn7l2zto00017cvkrxnheox2'
`).run()

console.log('User and label created')

db.close()