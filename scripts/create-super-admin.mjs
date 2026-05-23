/**
 * Script creare cont SUPER_ADMIN pentru platforma SoundLedger.
 * Rulare: node scripts/create-super-admin.mjs
 */
import Database from 'better-sqlite3'
import { createHash, randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'

const db = new Database('./dev.db')

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise((resolve) => rl.question(q, resolve))

async function hashPassword(password) {
  // bcryptjs nu e disponibil direct din ESM simplu — folosim alternativa:
  // importăm bcryptjs
  const { default: bcrypt } = await import('bcryptjs')
  return bcrypt.hash(password, 10)
}

function generateId() {
  return randomBytes(12).toString('base64url').slice(0, 20)
}

async function main() {
  console.log('\n═══════════════════════════════════════')
  console.log('  Creare cont SUPER_ADMIN — SoundLedger')
  console.log('═══════════════════════════════════════\n')

  const existing = db.prepare("SELECT id, email, role FROM User WHERE role = 'SUPER_ADMIN'").all()
  if (existing.length > 0) {
    console.log('⚠️  Există deja un cont SUPER_ADMIN:')
    existing.forEach((u) => console.log(`   • ${u.email}`))
    const cont = await ask('\nVrei să creezi un cont adițional? (da/nu): ')
    if (cont.toLowerCase() !== 'da') {
      console.log('\nIeșire fără modificări.')
      rl.close()
      db.close()
      return
    }
  }

  const email = await ask('Email administrator: ')
  if (!email.includes('@')) {
    console.error('❌ Email invalid.')
    rl.close()
    db.close()
    return
  }

  const existingEmail = db.prepare('SELECT id FROM User WHERE email = ?').get(email)
  if (existingEmail) {
    console.error('❌ Email deja folosit în sistem.')
    rl.close()
    db.close()
    return
  }

  const firstName = await ask('Prenume: ')
  const lastName  = await ask('Nume: ')
  const password  = await ask('Parolă (min. 8 caractere): ')

  if (password.length < 8) {
    console.error('❌ Parola trebuie să aibă cel puțin 8 caractere.')
    rl.close()
    db.close()
    return
  }

  const hashedPassword = await hashPassword(password)
  const id = generateId()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO User (id, email, password, firstName, lastName, role, mustResetPassword, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', 0, ?, ?)
  `).run(id, email, hashedPassword, firstName, lastName, now, now)

  console.log('\n✅ Cont SUPER_ADMIN creat cu succes!')
  console.log(`   Email: ${email}`)
  console.log(`   Nume:  ${firstName} ${lastName}`)
  console.log('\n   Poți te loga acum la /login cu aceste credențiale.')
  console.log('   Vei fi redirecționat la /admin — dashboard platformă.\n')

  rl.close()
  db.close()
}

main().catch((err) => {
  console.error('Eroare:', err.message)
  rl.close()
  db.close()
  process.exit(1)
})
