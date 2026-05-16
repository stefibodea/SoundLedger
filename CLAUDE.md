# SoundLedger — Context complet pentru AI

## Ce este aplicația

**SoundLedger** este o platformă web full-stack pentru managementul caselor de discuri (music label management SaaS), realizată ca lucrare de licență. Permite unui label muzical să gestioneze artiști, catalog de piese, contracte, finanțe, lansări, echipă, scouting A&R și conformitate AI.

## Stack tehnic

| Tehnologie | Versiune | Rol |
|---|---|---|
| Next.js | 16.2.1 | Framework principal (App Router) |
| React | 19.2.4 | UI |
| TypeScript | 5.x strict | Tipizare |
| Prisma | 7.5.0 | ORM |
| better-sqlite3 | 12.x | Baza de date SQLite locală |
| jose | 6.x | JWT custom (NU NextAuth) |
| bcryptjs | 3.x | Hash parole |
| Groq SDK | — | AI (LLaMA 3.3-70b) — singurul AI activ |
| Recharts | 3.8.0 | Grafice venituri |
| Resend | 6.x | Email invitații |
| nodemailer | 7.x | Email fallback |
| date-fns | 4.x | Utilități dată |
| concurrently | 9.x | Pornire simultană Next.js + Python (dev) |

**Serviciu Python auxiliar** (`audio-service/`) — FastAPI + librosa, rulează separat pe portul 8000:

| Tehnologie | Versiune | Rol |
|---|---|---|
| FastAPI | 0.115.0 | Web framework Python |
| uvicorn | 0.32.0 | ASGI server |
| librosa | 0.10.2 | Extragere features audio (MFCC, chroma, tempo) |
| numpy | 1.26.4 | Calcule numerice |
| scipy | 1.14.1 | Cosine similarity |
| soundfile | 0.12.1 | Citire fișiere audio |

**Fără Tailwind.** CSS global custom cu dark theme, variabile CSS în `src/app/globals.css`.

## Arhitectură

- **App Router** cu Server Components + Client Components (`'use client'`)
- **Server Actions** pentru toate mutațiile — NU REST API (excepție: `/api/finance/export` pentru CSV)
- **Fără NextAuth** — sesiuni JWT custom cu `jose`, stocate în cookie `httpOnly`
- **Erori/succes** comunicate prin URL query params (`?error=...&success=1`)
- **Filtrare** client-side via `useMemo` în client components, fără round-trips la server
- **Paginare** client-side în `DataTable` (pageSize default 25)
- **Date** — server serializează `.toISOString()` înainte de a trimite la client components
- **Serviciu Python auxiliar** — Next.js apelează `http://localhost:8000` (FastAPI) via `fetch` din Server Actions pentru analiza audio. URL configurabil prin `AUDIO_SERVICE_URL` env var. NU este integrat în procesul Next.js — rulează ca proces separat.
- **Upload fișiere audio** — Next.js Server Actions primesc `File` din `FormData`. Body size limit configurat în `next.config.ts` la 50MB (`experimental.serverActions.bodySizeLimit`). NU se pune `encType="multipart/form-data"` pe formuri cu Server Actions — React îl setează automat.

## Structura fișierelor

```
audio-service/            # Serviciu Python FastAPI (rulează separat pe portul 8000)
├── main.py               # Endpoints: GET /health, POST /extract, POST /compare
├── requirements.txt      # Dependențe Python fixate la versiuni exacte
├── README.md             # Setup venv + descriere algoritmi
└── venv/                 # Virtual environment Python (în .gitignore)

src/
├── app/
│   ├── actions/          # Server Actions (auth, artists, contracts, revenues, releases, ar, compliance, catalog, team, invitations, onboarding, ai, audio)
│   ├── api/
│   │   └── finance/export/route.ts   # Singurul API Route (CSV export)
│   ├── dashboard/page.tsx
│   ├── artists/
│   │   ├── page.tsx                  # Lista artiști
│   │   ├── [id]/page.tsx             # Profil artist
│   │   └── [id]/edit/page.tsx
│   ├── catalog/
│   │   ├── page.tsx                  # Lista piese + KPI cards
│   │   ├── catalog-client.tsx        # Client: FilterBar + DataTable + Modal
│   │   ├── [id]/page.tsx             # Detaliu piesă
│   │   ├── [id]/edit/page.tsx
│   │   └── albums/page.tsx
│   ├── contracts/
│   │   ├── page.tsx                  # Lista contracte + KPI cards
│   │   └── contracts-client.tsx      # Client: FilterBar + DataTable + Modal
│   ├── finance/
│   │   ├── page.tsx                  # Venituri + KPI cards (URL filter pt CSV)
│   │   └── [id]/page.tsx
│   ├── ar/
│   │   ├── page.tsx                  # Scouting A&R + KPI cards
│   │   ├── ar-client.tsx             # Client: Kanban + Tabel toggle
│   │   └── [id]/page.tsx
│   ├── releases/
│   │   ├── page.tsx                  # Lansări + KPI cards
│   │   └── releases-client.tsx       # Client: FilterBar + cards + Modal
│   ├── compliance/
│   │   ├── page.tsx                  # AI Compliance overview + KPI cards
│   │   ├── scanner/
│   │   │   ├── page.tsx              # Scanner piese suspecte + KPI cards + rezultate audio
│   │   │   └── scanner-client.tsx    # Client: FilterBar + DataTable (afișează topMatchScore audio)
│   │   ├── permissions/page.tsx      # Permisiuni AI per piesă (server-side flow)
│   │   └── certificates/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   ├── team/page.tsx
│   ├── invite/[token]/page.tsx
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── onboarding/page.tsx
│   ├── my-profile/page.tsx           # Vizualizare artist propriu profil
│   ├── my-music/page.tsx
│   ├── my-contract/page.tsx
│   ├── my-revenues/page.tsx
│   ├── globals.css                   # Design system CSS custom
│   ├── layout.tsx
│   └── page.tsx                      # Landing page
├── components/
│   ├── app-shell.tsx                 # Layout principal cu sidebar + header
│   ├── revenue-charts.tsx            # Grafice Recharts (are erori TS pre-existente Recharts 3.8)
│   ├── artist-revenue-chart.tsx
│   └── ui/
│       ├── KPICard.tsx               # Card metric cu accent color
│       ├── FilterBar.tsx             # Search + chips filtrare (controlled)
│       ├── DataTable.tsx             # Tabel paginat cu bulk select
│       ├── Modal.tsx                 # Modal dialog
│       ├── StatusBadge.tsx           # Badge semantic cu variante
│       ├── EmptyState.tsx            # Empty state cu icon + action
│       ├── Avatar.tsx
│       ├── ConfirmDialog.tsx
│       └── PageHeader.tsx
├── lib/
│   ├── session.ts                    # JWT encrypt/decrypt, cookie session
│   ├── auth-guards.ts                # requireSession()
│   ├── roles.ts                      # Constante + funcții de verificare roluri
│   ├── prisma.ts                     # Singleton Prisma client
│   └── onboarding.ts                 # enforceOnboarding()
└── generated/prisma/                 # Prisma client generat (nu edita)
```

## Baza de date (Prisma + SQLite)

Fișier: `prisma/schema.prisma`. DB locală: `dev.db`. Fără migrări formale — se folosește `prisma db push`.

### Modele

**User** — `id, email, password, firstName, lastName, role, labelId, createdAt`
- `role`: `SUPER_ADMIN | LABEL_MANAGER | AR_MANAGER | FINANCIAL | ARTIST`

**Label** — `id, name, country, city, genre, logo, plan (FREE_TRIAL|INDIE|PRO|ENTERPRISE), ownerId`

**Invitation** — `id, email, role, token, expiresAt, acceptedAt, labelId, createdById`

**Artist** — `id, name, realName, birthDate, nationality, genre, subgenre, bio, photo, spotifyUrl, appleMusicUrl, youtubeUrl, instagram, tiktok, contactEmail, contactPhone, managerName, managerContact, userId(optional — link cont), labelId`

**Track** — `id, title, type(SINGLE|ALBUM_TRACK|EP_TRACK), releaseDate(String?), status(UNRELEASED|RELEASED), genre, subgenre, isrc, bpm, key, duration(sec), audioFile, coverArt, lyrics, composers, producers, artistId, labelId, albumId(optional)`

**Album** — `id, title, releaseDate(String?), coverArt, type(ALBUM|EP), artistId, labelId`

**Contract** — `id, duration(String), royaltyPercent, advance, territories(JSON), rights(JSON), specialClauses, status(DRAFT|ACTIVE|EXPIRING|EXPIRED|NEGOTIATION), startDate(String?), endDate(String?), signedAt, documentUrl, aiAnalysis, artistId, labelId`
- ⚠️ `startDate` și `endDate` sunt `String?` — NU `DateTime` — nu se apelează `.toISOString()` pe ele

**Revenue** — `id, source(STREAMING|YOUTUBE|APPLE_MUSIC|LICENSING|PHYSICAL|SYNC), amount, streams, period(ex: "2024-01"), description, labelId, artistId?, trackId?`

**RoyaltyPayment** — `id, amount, period, status(PENDING|PAID), paidAt, artistId, contractId, labelId`

**ARProspect** — `id, name, spotifyUrl, youtubeUrl, soundcloudUrl, instagram, tiktok, status(IDENTIFIED|ANALYZING|CONTACTED|NEGOTIATION|SIGNED|REJECTED), aiScore, aiReport, notes, labelId`

**Release** — `id, releaseDate(String), status(PLANNING|READY|RELEASED), checklist(JSON), pressRelease, socialPlan, trackId?, albumId?, labelId`

**Notification** — `id, message, type(INFO|WARNING|AI_INSIGHT|CONTRACT|ROYALTY|AI_COMPLIANCE), read, userId`

**AIPermission** — `id, trackId(unique), labelId, allowAITraining, allowResearchOnly, requiresLicense, artistConsent, minCompensation, consentDate, notes`

**AIDetection** — `id, labelId, suspectUrl, suspectTitle, suspectArtist, platform, similarityScore, matchedTrackIds(JSON), aiAnalysis, status(PENDING|CONFIRMED|DISMISSED|RESOLVED), takedownSent, compensationClaimed, reportedById, notes`
- Câmpuri adăugate pentru analiza audio: `suspectAudioFile(String?), suspectDuration(Float?), matches(String? — JSON CompareResponse complet), topMatchScore(Float?), topMatchTrackId(String?), analyzedAt(DateTime?), analysisError(String?)`
- Index pe `topMatchScore`
- `similarityScore` se actualizează la max(scor AI, scor audio×100) când rulează analiza audio

**AudioFingerprint** — `id, trackId(unique), labelId, mfccMean(String — JSON number[13]), chromaMean(String — JSON number[12]), mfccMatrix(String — JSON number[][]), chromaMatrix(String — JSON number[][]), tempo(Float), duration(Float), sampleRate(Int default 22050), hopLength(Int default 512), computedAt(DateTime)`
- Relație cu Track (onDelete: Cascade), index pe labelId
- Toate valorile numerice stocate ca JSON serializat în câmpuri String (limitare SQLite)

**HumanMadeCertificate** — `id, trackId(unique), labelId, certificateCode(unique), issuedAt, issuedById, declaration, isRevoked, revokedAt, revokedReason`

## Roluri și permisiuni (`src/lib/roles.ts`)

| Funcție | SUPER_ADMIN | LABEL_MANAGER | AR_MANAGER | FINANCIAL | ARTIST |
|---|---|---|---|---|---|
| `canManageArtists` | ✓ | ✓ | ✓ | — | — |
| `canViewContracts` | ✓ | ✓ | ✓ | ✓ | — |
| `canManageContracts` | ✓ | ✓ | — | — | — |
| `canViewFinance` | ✓ | ✓ | — | ✓ | — |
| `canUseScouting` | ✓ | ✓ | ✓ | — | — |
| `canViewCatalog` | ✓ | ✓ | ✓ | ✓ | — |
| `canManageReleases` | ✓ | ✓ | ✓ | — | — |
| `canManageTeam` | ✓ | ✓ | — | — | — |
| `canViewCompliance` | ✓ | ✓ | ✓ | — | — |
| `canManageCompliance` | ✓ | ✓ | — | — | — |

Artiștii văd doar: `/my-profile`, `/my-music`, `/my-contract`, `/my-revenues`.

## Sesiune și autentificare

- JWT custom cu `jose`, HS256, TTL 7 zile
- Cookie: `session` (httpOnly, sameSite: lax)
- `SessionPayload`: `{ userId, role, labelId?, expiresAt }`
- `requireSession()` în `src/lib/auth-guards.ts` — redirect la `/login` dacă nu există sesiune
- `enforceOnboarding(session, returnTo)` — redirect la `/onboarding` dacă labelul nu e configurat

## Design system CSS

Dark theme, fără Tailwind. Variabile principale:

```css
--primary: #9B94F0            /* violet */
--bg-primary: #1c1b22
--bg-secondary: #23212b
--bg-tertiary: #2d2b38
--text-primary: #f0efe8
--text-secondary: #c8c6bc
--border-light: rgba(255,255,255,0.08)

/* Culori roluri */
--role-ar-dark: #6ee7b7       /* verde — A&R, AI Compliance */
--role-finance-dark: #fde68a  /* galben — Finance */
--role-artist-dark: #fca5a5   /* roșu — Artist, erori */
--role-admin-dark: #93c5fd    /* albastru */
```

Clase utilitare definite în `globals.css`: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`, `.card`, `.badge`, `.form-input`, `.form-label`, `.form-group`, `.form-row`, `.form-textarea`, `.form-select`, `.page-header`, `.page-title`, `.page-subtitle`, `.grid`, `.grid-2`, `.grid-3`, `.grid-4`.

## Componente UI reutilizabile

### `KPICard` (Server Component)
```tsx
<KPICard label="Total piese" value={42} icon="🎵" accentColor="purple" subtitle="text secundar opțional" />
```
`accentColor`: `"green" | "yellow" | "red" | "blue" | "purple" | "gray"`

### `FilterBar` (Client Component — controlled)
```tsx
<FilterBar
  searchQuery={search} onSearchChange={setSearch}
  searchPlaceholder="Caută..."
  chips={{ value: filter, activeValue: filter, onChange: setFilter, options: [{ value: 'all', label: 'Toate' }, ...] }}
  resultsCount={filtered.length} resultsLabel="piese"
  hasActiveFilters={Boolean(search || filter !== 'all')}
  onReset={resetFilters}
/>
```

### `DataTable` (Client Component)
```tsx
<DataTable
  data={filtered} columns={columns} getRowKey={(r) => r.id}
  pageSize={25}
  emptyState={<EmptyState icon="🎵" title="Nicio piesă" description="..." />}
/>
```
`Column<T>`: `{ key, header, width?, render: (row) => ReactNode }`

### `Modal` (Client Component)
```tsx
<Modal isOpen={open} onClose={() => setOpen(false)} title="Titlu">
  <form action={serverAction}>...</form>
</Modal>
```

### `StatusBadge`
```tsx
<StatusBadge label="Activ" variant="success" />
```
Variante: `"success" | "warning" | "error" | "info" | "neutral"`

### `AppShell`
```tsx
<AppShell session={session} title="Pagina" subtitle="Subtitlu opțional">
  {children}
</AppShell>
```
Sidebar cu navigare bazată pe rol, header cu badge rol + buton Logout.

## Pagini principale — structură tipică

Fiecare pagină de tip listă urmează același pattern:

```tsx
// page.tsx (Server Component)
export default async function XPage() {
  const session = await requireSession()
  await enforceOnboarding(session, '/x')
  if (!canViewX(session.role)) redirect('/dashboard')

  const [rawItems, ...kpiData] = await Promise.all([
    prisma.model.findMany({ where: { labelId: session.labelId }, orderBy: { createdAt: 'desc' } }),
    // ... alte query-uri pentru KPI
  ])

  const items: ItemRow[] = rawItems.map((i) => ({
    ...i,
    createdAt: i.createdAt.toISOString(),  // serializare dată pentru client
  }))

  return (
    <AppShell session={session} title="X">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard label="..." value={count} icon="..." accentColor="..." />
      </div>
      <XClient items={items} canManage={canManageX(session.role)} />
    </AppShell>
  )
}

// x-client.tsx ('use client')
export function XClient({ items, canManage }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = useMemo(() => items.filter(/* ... */), [items, search, filter])

  const columns: Column<ItemRow>[] = [/* ... */]

  return (
    <>
      <FilterBar ... />
      {canManage && <button onClick={() => setModalOpen(true)}>Adaugă</button>}
      <section className="card">
        <DataTable data={filtered} columns={columns} getRowKey={(i) => i.id} />
      </section>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Adaugă">
        <form action={createXAction}>...</form>
      </Modal>
    </>
  )
}
```

## Server Actions — convenții

Toate în `src/app/actions/`.

```typescript
'use server'
import { requireSession } from '@/lib/auth-guards'
import { redirect } from 'next/navigation'

export async function createXAction(formData: FormData) {
  const session = await requireSession()
  if (!canManageX(session.role)) redirect('/dashboard')

  const name = formData.get('name') as string
  // validare, logică business
  await prisma.x.create({ data: { ..., labelId: session.labelId! } })

  redirect('/x')  // sau redirect('/x?success=1')
}
```

Erorile se pasează ca `redirect('/x?error=' + encodeURIComponent(message))`.

## AI Integration (Groq)

Groq SDK cu `llama-3.3-70b-versatile`. Folosit în 6 acțiuni:
- `src/app/actions/ai.ts` — analize generale
- `src/app/actions/compliance.ts` — raport conformitate AI, analiză piesă suspectă
- `src/app/actions/contracts.ts` — analiză contract, generare clauze
- `src/app/actions/ar.ts` — scoring prospect A&R
- `src/app/actions/releases.ts` — generare press release

Pattern:
```typescript
import Groq from 'groq-sdk'
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const response = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: prompt }],
})
const text = response.choices[0].message.content ?? ''
```

## Sistem detecție similitudine audio

### Arhitectură generală

Două analize independente pe același `AIDetection`, declanșate separat de utilizator:

1. **Analiza AI (metadata)** — Groq LLaMA compară text: URL, titlu, artist, genuri din catalog → `similarityScore`, `matchedTrackIds`, `aiAnalysis`
2. **Analiza audio (fingerprint)** — Python/librosa compară semnal audio: MFCC, chroma, tempo → `topMatchScore`, `matches`, `analyzedAt`

### Serviciu Python (`audio-service/main.py`)

**Endpoints:**
- `GET /health` — status + versiune librosa
- `POST /extract` — primește fișier audio, returnează `FingerprintResponse` (vectori MFCC/chroma + tempo/duration)
- `POST /compare` — primește fișier suspect + `catalog_json` (array JSON cu fingerprint-uri) + `top_k`, returnează `CompareResponse`

**Algoritmi:**
- **MFCC** (N=13) — normalizat per coeficient (zero mean, unit variance) pentru invarianță la volum
- **Chroma** (N=12) — distribuție energie pe 12 clase de pitch, robust la variații de tempo
- **Pre-filtrare cosine** pe vectori medii: `0.5 × mfcc_cosine + 0.5 × chroma_cosine` — selectează top-k candidați
- **DTW** (Dynamic Time Warping) pe matrici, sub-eșantionat la max 500 frames: `1.0 / (1.0 + cost_normalizat / 10.0)`
- **Scor final**: `0.5 × mfcc_dtw + 0.4 × chroma_dtw + 0.1 × tempo_similarity`
- **Segmente similare**: sliding window, pas = segment/2, threshold cosine ≥ 0.85
- **Tempo similarity**: 1.0 dacă diff ≤5 BPM, 0.0 dacă ≥30 BPM, liniar între

**Constante:** `SAMPLE_RATE=22050, HOP_LENGTH=512, N_MFCC=13, N_CHROMA=12, SEGMENT_DURATION_SEC=5.0`

### Server Actions (`src/app/actions/audio.ts`)

**`computeFingerprintAction(formData)`**
- Primește `trackId` + fișier audio (`audioFile`)
- Verifică că piesa aparține labelului + `canManageCompliance`
- POST la `{AUDIO_SERVICE_URL}/extract`
- Upsert `AudioFingerprint` în DB
- Redirect la `/catalog/{trackId}?fpOk=1` sau `?fpError=...`

**`runAudioAnalysisAction(formData)`**
- Primește `detectionId` + fișier audio suspect (`suspectAudioFile`)
- Verifică `canManageCompliance`
- Încarcă toate `AudioFingerprint` pentru labelul curent
- POST la `{AUDIO_SERVICE_URL}/compare` cu `catalog_json` + `top_k=5`
- Actualizează `AIDetection` cu `matches`, `topMatchScore`, `topMatchTrackId`, `analyzedAt`, `suspectDuration`, `suspectAudioFile`
- Actualizează `similarityScore` la `max(scor_ai_existent, round(topMatchScore × 100))`

### UI

**`/catalog/[id]`** — secțiune "🔊 Amprentă audio" (vizibilă doar pt SUPER_ADMIN, LABEL_MANAGER):
- Dacă amprenta există: afișează tempo, durată, sampleRate + buton "↻ Recalculează"
- Dacă nu există: text informativ + buton "⊕ Calculează amprentă"
- File input acceptă: `.mp3, .wav, .flac, .m4a, .ogg`

**`/compliance/scanner`** — în blocul rezultat al ultimei detecții (`lastDetection`):
- Dacă `analyzedAt` există: afișează rezultatele audio (scor per piesă, MFCC/chroma/tempo breakdown, segmente cu timestamp-uri)
- Dacă `analyzedAt` nu există și există fingerprinte în catalog: formular upload pentru analiză
- Dacă nu există fingerprinte în catalog: mesaj informativ cu link spre `/catalog`
- Counter `fingerprintCount` afișat în UI (câte piese au amprentă calculată)

**`scanner-client.tsx`** — coloana Scor afișează atât scorul AI cât și `🔊 X% audio` dacă `topMatchScore` e disponibil

### Setup serviciu Python

```bash
cd audio-service
python -m venv venv
# Windows:
venv\Scripts\python.exe -m pip install -r requirements.txt
venv\Scripts\uvicorn main:app --reload --port 8000
# Linux/macOS:
source venv/bin/activate && pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Excepții și particularități importante

1. **`Contract.startDate` și `endDate` sunt `String?`** — NU `DateTime`. Nu se apelează `.toISOString()` pe ele, se pasează direct `c.startDate ?? null`.

2. **Pagina Finance** — păstrează filtrare URL-based pe server (`?source=&artistId=&period=`) pentru că endpoint-ul `/api/finance/export` citește parametrii URL pentru CSV export. Nu se convertește la filtrare client-side.

3. **Pagina Compliance/Permissions** — flow server-side în 2 pași (artist → track → formular permisiuni). Nu are client component.

4. **Kanban A&R** — în `ar-client.tsx`, cardurile Kanban conțin `<form action={moveProspectAction}>`. La submit → redirect server → page reload → Kanban se actualizează. Fără optimistic UI.

5. **`revenue-charts.tsx`** — are erori TypeScript pre-existente din Recharts 3.8.0 (incompatibilitate `formatter` type). Nu au fost introduse în sesiunea curentă, nu trebuie fixate acum.

6. **Fără `take` limit** în query-urile Prisma — paginarea e client-side în `DataTable`. Nu adăuga `take:` în query-urile de listare.

7. **Multi-tenant** — toate query-urile filtrează `where: { labelId: session.labelId }`.

8. **File upload în Server Actions** — NU se adaugă `encType="multipart/form-data"` pe formuri cu Server Actions (React aruncă warning și îl ignoră). React setează automat encoding-ul când detectează `<input type="file">`. Body size limit configurat în `next.config.ts`: `experimental.serverActions.bodySizeLimit = '50mb'`.

9. **`AudioFingerprint` — matrici ca JSON string** — `mfccMatrix` și `chromaMatrix` sunt stocate ca `String` (JSON serializat), nu ca array nativ, din cauza limitărilor SQLite. La citire se face `JSON.parse()`, la scriere `JSON.stringify()`. Nu se schimbă tipul în `Float[]` sau similar.

10. **Serviciul Python nu pornește automat** — trebuie pornit manual sau cu `npm run dev:all`. Dacă serviciul nu rulează, acțiunile audio returnează eroare `fetch failed` și fac redirect cu `?fpError=` sau `?error=`. UI-ul arată eroarea dar nu cade.

## Comenzi utile

```bash
# Next.js
npm run dev          # pornire development server (doar Next.js)
npm run dev:all      # pornire Next.js + serviciu Python simultan (Windows)
npx prisma db push   # aplică schema în DB (fără migrări)
npx prisma generate  # regenerează Prisma client după modificări schema
npx prisma studio    # GUI pentru DB
npx tsc --noEmit     # verificare TypeScript
node seed.mjs        # seed date demo
node seed-tracks.mjs # seed piese

# Serviciu Python (din audio-service/)
venv\Scripts\uvicorn main:app --reload --port 8000        # Windows
uvicorn main:app --reload --port 8000                      # Linux/macOS (cu venv activat)
# Sau din rădăcina proiectului:
audio-service\venv\Scripts\uvicorn main:app --reload --port 8000 --app-dir audio-service
```

## Variabile de mediu necesare

```
AUTH_SECRET=              # secret JWT (obligatoriu în producție)
GROQ_API_KEY=             # cheie API Groq pentru AI
RESEND_API_KEY=           # cheie API Resend pentru email
DATABASE_URL=             # path SQLite (ex: file:./dev.db)
AUDIO_SERVICE_URL=        # URL serviciu Python (default: http://localhost:8000)
```
