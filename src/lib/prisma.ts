import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const rawUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
const sqliteUrl = rawUrl.startsWith('file:') ? rawUrl.replace(/^file:/, '') : rawUrl

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: sqliteUrl,
    }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
