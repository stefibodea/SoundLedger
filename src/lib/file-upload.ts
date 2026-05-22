import { promises as fs } from 'fs'
import path from 'path'

export const MAX_AUDIO_SIZE_MB = 50

export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.m4a', '.ogg']

export const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/flac',
  'audio/x-flac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/vorbis',
  'application/ogg',
]

export async function saveAudioFile(file: File, trackId: string): Promise<string> {
  const maxBytes = MAX_AUDIO_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error(`Fișierul depășește limita de ${MAX_AUDIO_SIZE_MB}MB`)
  }

  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
    throw new Error(`Format neacceptat. Formate permise: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`)
  }

  if (file.type && !ALLOWED_AUDIO_MIME_TYPES.includes(file.type)) {
    console.warn(`[file-upload] MIME type neașteptat: ${file.type} pentru fișierul ${file.name}`)
  }

  const filename = `${trackId}-${Date.now()}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'catalog')
  await fs.mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(uploadDir, filename), buffer)
  return filename
}

export async function deleteAudioFile(filename: string): Promise<void> {
  if (
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    path.isAbsolute(filename)
  ) {
    throw new Error(`Nume de fișier invalid: ${filename}`)
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', 'catalog', filename)
  try {
    await fs.stat(filePath)
  } catch {
    console.warn(`[file-upload] Fișierul nu există la ștergere: ${filename}`)
    return
  }

  try {
    await fs.unlink(filePath)
  } catch (err) {
    console.error(`[file-upload] Eroare la ștergerea fișierului ${filename}:`, err)
  }
}

export function getAudioFileUrl(filename: string | null | undefined): string | null {
  if (!filename) return null

  if (
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    path.isAbsolute(filename)
  ) {
    console.warn(`[file-upload] Nume de fișier cu path traversal detectat: ${filename}`)
    return null
  }

  return `/uploads/catalog/${filename}`
}

// ── Fișiere audio suspecte (pentru detecții scanner) ──────────────────────────

export async function saveSuspectAudioFile(file: File, detectionId: string): Promise<string> {
  const maxBytes = MAX_AUDIO_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error(`Fișierul depășește limita de ${MAX_AUDIO_SIZE_MB}MB`)
  }

  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
    throw new Error(`Format neacceptat. Formate permise: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}`)
  }

  if (file.type && !ALLOWED_AUDIO_MIME_TYPES.includes(file.type)) {
    console.warn(`[file-upload] MIME type neașteptat: ${file.type} pentru fișierul ${file.name}`)
  }

  const filename = `${detectionId}${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'suspects')
  await fs.mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(uploadDir, filename), buffer)
  return filename
}

export function getSuspectAudioFileUrl(filename: string | null): string | null {
  if (!filename) return null

  if (
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    path.isAbsolute(filename)
  ) {
    console.warn(`[file-upload] Nume de fișier cu path traversal detectat: ${filename}`)
    return null
  }

  return `/uploads/suspects/${filename}`
}

export async function deleteSuspectAudioFile(filename: string): Promise<void> {
  if (
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..') ||
    path.isAbsolute(filename)
  ) {
    throw new Error(`Nume de fișier invalid: ${filename}`)
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', 'suspects', filename)
  try {
    await fs.stat(filePath)
  } catch {
    console.warn(`[file-upload] Fișierul suspect nu există la ștergere: ${filename}`)
    return
  }

  try {
    await fs.unlink(filePath)
  } catch (err) {
    console.error(`[file-upload] Eroare la ștergerea fișierului suspect ${filename}:`, err)
  }
}

// ── Poze de profil (avatare utilizatori) ──────────────────────────────────────

export async function saveAvatarFile(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp']
  if (!allowedExts.includes(ext)) throw new Error('Format nesuportat. Folosește JPG, PNG sau WebP.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Fișierul depășește 5MB.')

  const filename = `${userId}-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars')
  await fs.mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(path.join(uploadDir, filename), buffer)
  return filename
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isValidAudioFile(file: File): { ok: boolean; error?: string } {
  const maxBytes = MAX_AUDIO_SIZE_MB * 1024 * 1024
  if (file.size > maxBytes) {
    return { ok: false, error: `Fișierul depășește limita de ${MAX_AUDIO_SIZE_MB}MB` }
  }

  const extDot = file.name.lastIndexOf('.')
  const ext = extDot >= 0 ? file.name.slice(extDot).toLowerCase() : ''
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
    return { ok: false, error: `Format neacceptat. Formate permise: ${ALLOWED_AUDIO_EXTENSIONS.join(', ')}` }
  }

  return { ok: true }
}
