import pkg from '../src/generated/prisma/index.js'
const { PrismaClient } = pkg

const prisma = new PrismaClient()
const result = await prisma.audioFingerprint.deleteMany({})
console.log('Deleted:', result.count, 'fingerprints')
await prisma.$disconnect()
