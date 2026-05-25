import { z } from 'zod'

// ── Helpers ────────────────────────────────────────────────────────────────────

const requiredString = (msg = 'Câmpul este obligatoriu') =>
  z.string().min(1, msg)

/** URL opțional: acceptă string gol (câmp necompletat) sau URL valid https */
const optionalUrl = z
  .string()
  .transform((v) => v.trim())
  .refine(
    (v) => v === '' || /^https?:\/\/.+/.test(v),
    'URL invalid — trebuie să înceapă cu https://',
  )
  .transform((v) => v || null)

/** Email valid sau string gol */
const optionalEmail = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .refine(
    (v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Adresă de email invalidă',
  )
  .transform((v) => v || null)

/** Checkbox HTML trimite "on" dacă bifat, altfel lipsă din FormData */
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === 'on')

/** Număr pozitiv opțional din câmp text */
const optionalPositiveNumber = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0), 'Valoare numerică invalidă')
  .transform((v) => (v === '' ? null : Number(v)))

// ── Auth ───────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().min(1, 'Email-ul este obligatoriu').email({ message: 'Format email invalid' }),
  password: z.string().min(1, 'Parola este obligatorie'),
})

export const registerSchema = z.object({
  labelName: requiredString('Numele casei de discuri este obligatoriu'),
  country:   requiredString('Țara este obligatorie'),
  city:      requiredString('Orașul este obligatoriu'),
  genre:     requiredString('Genul muzical este obligatoriu'),
  firstName: requiredString('Prenumele este obligatoriu'),
  lastName:  requiredString('Numele este obligatoriu'),
  email:     z.string().min(1, 'Email-ul este obligatoriu').email({ message: 'Format email invalid' }),
  password:  z.string()
    .min(8, 'Parola trebuie să aibă minim 8 caractere')
    .refine((v) => /[A-Z]/.test(v), 'Parola trebuie să conțină cel puțin o literă mare')
    .refine((v) => /[0-9]/.test(v), 'Parola trebuie să conțină cel puțin o cifră')
    .refine((v) => /[^A-Za-z0-9]/.test(v), 'Parola trebuie să conțină cel puțin un caracter special'),
  plan:      z.string().optional().transform((v) => v || 'FREE_TRIAL'),
})

export const changePasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Parola trebuie să aibă minim 8 caractere')
    .refine((v) => /[A-Z]/.test(v), 'Parola trebuie să conțină cel puțin o literă mare')
    .refine((v) => /[0-9]/.test(v), 'Parola trebuie să conțină cel puțin o cifră')
    .refine((v) => /[^A-Za-z0-9]/.test(v), 'Parola trebuie să conțină cel puțin un caracter special'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Parolele nu coincid',
  path: ['confirmPassword'],
})

// ── Artiști ────────────────────────────────────────────────────────────────────

export const createArtistSchema = z.object({
  name:         requiredString('Numele artistului este obligatoriu').max(100),
  genre:        requiredString('Genul muzical este obligatoriu').max(50),
  realName:     z.string().transform((v) => v.trim() || null),
  spotifyUrl:   optionalUrl,
  instagram:    z.string().transform((v) => v.trim() || null),
  contactEmail: optionalEmail,
})

export const updateArtistSchema = z.object({
  name:           z.string().min(1, 'Numele artistului este obligatoriu').max(100),
  genre:          z.string().min(1, 'Genul muzical este obligatoriu').max(50),
  realName:       z.string().transform((v) => v.trim() || null),
  birthDate:      z.string().transform((v) => v.trim() || null),
  nationality:    z.string().transform((v) => v.trim() || null),
  subgenre:       z.string().transform((v) => v.trim() || null),
  bio:            z.string().max(3000, 'Biografia poate avea maximum 3000 de caractere').transform((v) => v.trim() || null),
  spotifyUrl:     optionalUrl,
  appleMusicUrl:  optionalUrl,
  youtubeUrl:     optionalUrl,
  instagram:      z.string().transform((v) => v.trim() || null),
  tiktok:         z.string().transform((v) => v.trim() || null),
  contactEmail:   optionalEmail,
  contactPhone:   z.string().transform((v) => v.trim() || null),
  managerName:    z.string().transform((v) => v.trim() || null),
  managerContact: z.string().transform((v) => v.trim() || null),
})

// ── Catalog ────────────────────────────────────────────────────────────────────

export const createTrackSchema = z.object({
  title:    requiredString('Titlul piesei este obligatoriu').max(200),
  artistId: requiredString('Artistul este obligatoriu'),
  genre:    z.string().transform((v) => v.trim() || null),
  isrc:     z.string().max(12, 'ISRC invalid').transform((v) => v.trim() || null),
  bpm:      z.string().transform((v) => v.trim()).refine(
    (v) => v === '' || (Number.isInteger(Number(v)) && Number(v) > 0 && Number(v) < 300),
    'BPM trebuie să fie un număr întreg între 1 și 299',
  ).transform((v) => (v === '' ? null : Number(v))),
  key:  z.string().transform((v) => v.trim() || null),
  type: z.string().transform((v) => v || 'SINGLE'),
})

export const createAlbumSchema = z.object({
  title:       requiredString('Titlul albumului este obligatoriu').max(200),
  artistId:    requiredString('Artistul este obligatoriu'),
  type:        z.string().transform((v) => v || 'ALBUM'),
  releaseDate: z.string().transform((v) => v.trim() || null),
})

// ── Contracte ──────────────────────────────────────────────────────────────────

export const createContractSchema = z.object({
  artistId:      requiredString('Artistul este obligatoriu'),
  duration:      requiredString('Durata contractului este obligatorie').max(50),
  royaltyPercent: z.string().transform((v) => v.trim()).pipe(
    z.string()
      .refine((v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100,
        'Procentul de royalty trebuie să fie între 0 și 100')
      .transform(Number),
  ),
  advance:        optionalPositiveNumber,
  startDate:      z.string().transform((v) => v.trim() || null),
  endDate:        z.string().transform((v) => v.trim() || null),
  status:         z.string().transform((v) => v.trim() || 'ACTIVE'),
  signedAt:       z.string().transform((v) => v.trim() || null),
  documentUrl:    z.string().transform((v) => v.trim() || null),
  specialClauses: z.string().transform((v) => v.trim() || null),
  territories:    z.array(z.string()).transform((arr) => arr.length > 0 ? JSON.stringify(arr) : null),
  rights:         z.array(z.string()).transform((arr) => arr.length > 0 ? JSON.stringify(arr) : null),
})

// ── Venituri ───────────────────────────────────────────────────────────────────

const VALID_REVENUE_SOURCES = [
  'SPOTIFY', 'APPLE_MUSIC', 'YOUTUBE_MUSIC', 'YOUTUBE_CONTENT_ID', 'TIKTOK', 'DEEZER',
  'RADIO_TV', 'SYNC_LICENSING', 'LICENTIERE', 'VANZARI_FIZICE', 'MERCHANDISE', 'ALTE_SURSE',
  // legacy values kept for backwards compatibility
  'STREAMING', 'YOUTUBE', 'LICENSING', 'PHYSICAL', 'SYNC', 'OTHER',
]

export const createRevenueSchema = z.object({
  source: z.string().refine((v) => VALID_REVENUE_SOURCES.includes(v), 'Sursă de venit invalidă'),
  amount: z.string().transform((v) => v.trim()).pipe(
    z.string()
      .refine((v) => v !== '' && !Number.isNaN(Number(v)) && Number(v) > 0, 'Suma trebuie să fie pozitivă')
      .transform(Number),
  ),
  period:      requiredString('Perioada este obligatorie').regex(/^\d{4}-\d{2}(\/\d{4}-\d{2})?$/, 'Formatul perioadei trebuie să fie YYYY-MM sau YYYY-MM/YYYY-MM'),
  artistId:    requiredString('Artistul este obligatoriu'),
  streams:     z.string().transform((v) => v.trim()).refine(
    (v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 0),
    'Cantitatea trebuie să fie un număr întreg pozitiv',
  ).transform((v) => (v === '' ? null : Number(v))),
  description: z.string().optional().default(''),
})

// ── A&R Prospects ──────────────────────────────────────────────────────────────

export const createProspectSchema = z.object({
  name:         requiredString('Numele artistului este obligatoriu').max(100),
  source:       requiredString('Sursa de identificare este obligatorie').max(200),
  spotifyUrl:   optionalUrl,
  youtubeUrl:   optionalUrl,
  soundcloudUrl: optionalUrl,
  instagram:    z.string().transform((v) => v.trim() || null),
  tiktok:       z.string().transform((v) => v.trim() || null),
  notes:        z.string().transform((v) => v.trim() || null),
})

export const updateProspectSchema = z.object({
  name:         requiredString('Numele artistului este obligatoriu').max(100),
  source:       z.string().transform((v) => v.trim() || null),
  spotifyUrl:   optionalUrl,
  youtubeUrl:   optionalUrl,
  soundcloudUrl: optionalUrl,
  instagram:    z.string().transform((v) => v.trim() || null),
  tiktok:       z.string().transform((v) => v.trim() || null),
  notes:        z.string().transform((v) => v.trim() || null),
})

// ── Lansări ────────────────────────────────────────────────────────────────────

export const createReleaseSchema = z.object({
  trackId:     requiredString('Piesa este obligatorie'),
  releaseDate: requiredString('Data lansării este obligatorie'),
})

// ── AI Compliance ──────────────────────────────────────────────────────────────

export const setAIPermissionSchema = z.object({
  trackId:          requiredString('Piesa este obligatorie'),
  returnArtist:     z.string().transform((v) => v.trim()),
  allowAITraining:  checkbox,
  allowResearchOnly: checkbox,
  requiresLicense:  checkbox,
  artistConsent:    checkbox,
  consentDate:      z.string().transform((v) => v.trim() || null),
  minCompensation:  optionalPositiveNumber,
  notes:            z.string().transform((v) => v.trim() || null),
})

export const analyzeSuspectSchema = z.object({
  suspectUrl:    z.string().min(1, 'URL-ul piesei suspecte este obligatoriu')
    .refine((v) => /^https?:\/\/.+/.test(v), 'URL invalid — trebuie să înceapă cu https://'),
  suspectTitle:  z.string().transform((v) => v.trim() || undefined),
  suspectArtist: z.string().transform((v) => v.trim() || undefined),
  platform:      z.string().transform((v) => v.trim() || undefined),
  notes:         z.string().transform((v) => v.trim() || null),
})

export const issueCertificateSchema = z.object({
  trackId:     requiredString('Piesa este obligatorie'),
  declaration: requiredString('Declarația este obligatorie').min(20, 'Declarația trebuie să aibă minim 20 de caractere'),
})

// ── Echipă / Invitații ─────────────────────────────────────────────────────────

const INVITABLE_ROLES = ['AR_MANAGER', 'FINANCIAL']

export const inviteUserSchema = z.object({
  email: z.string().min(1, 'Email-ul este obligatoriu').email({ message: 'Format email invalid' }),
  role:  z.string().refine((v) => INVITABLE_ROLES.includes(v), 'Rol invalid'),
})

// ── Tipuri exportate ───────────────────────────────────────────────────────────

export type LoginInput           = z.infer<typeof loginSchema>
export type RegisterInput        = z.infer<typeof registerSchema>
export type CreateArtistInput    = z.infer<typeof createArtistSchema>
export type UpdateArtistInput    = z.infer<typeof updateArtistSchema>
export type CreateTrackInput     = z.infer<typeof createTrackSchema>
export type CreateAlbumInput     = z.infer<typeof createAlbumSchema>
export type CreateContractInput  = z.infer<typeof createContractSchema>
export type CreateRevenueInput   = z.infer<typeof createRevenueSchema>
export type CreateProspectInput  = z.infer<typeof createProspectSchema>
export type CreateReleaseInput   = z.infer<typeof createReleaseSchema>
export type SetAIPermissionInput = z.infer<typeof setAIPermissionSchema>
export type AnalyzeSuspectInput  = z.infer<typeof analyzeSuspectSchema>
export type IssueCertInput       = z.infer<typeof issueCertificateSchema>
export type InviteUserInput      = z.infer<typeof inviteUserSchema>
