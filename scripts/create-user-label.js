import Database from 'better-sqlite3'

const db = new Database('./dev.db')

const insertUser = db.prepare(`
  INSERT INTO User (id, email, password, firstName, lastName, role, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`)

const insertLabel = db.prepare(`
  INSERT INTO Label (id, name, country, city, genre, plan, ownerId, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`)

const updateUser = db.prepare(`
  UPDATE User SET labelId = ? WHERE id = ?
`)

insertUser.run('cmn7l2zto00017cvkrxnheox2', 'demo@soundledger.ro', '$2b$10$dummy', 'Demo', 'User', 'SUPER_ADMIN')
insertLabel.run('cmn7l2zto00017cvkrxnheox1', 'SoundLedger Demo', 'România', 'București', 'Indie', 'INDIE', 'cmn7l2zto00017cvkrxnheox2')
updateUser.run('cmn7l2zto00017cvkrxnheox1', 'cmn7l2zto00017cvkrxnheox2')

console.log('User and label created')

db.close()