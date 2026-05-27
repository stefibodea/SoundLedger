# SoundLedger

**Platformă SaaS de management pentru case de discuri cu protecție AI integrată.**

SoundLedger combină managementul complet al unui label muzical cu un sistem de detecție audio bazat pe amprentare digitală, oferind conformitate cu EU AI Act și protecție activă a drepturilor de autor.

---

## Funcționalități principale

### 🎵 Catalog muzical
- Gestionare piese (Single, Album Track, EP Track) cu metadate complete: gen, subgen, ISRC, BPM, tonalitate, durată, versuri
- Validare ISRC cu format standard internațional (`CC-XXX-YY-NNNNN`) și auto-formatare live
- Upload fișier audio (MP3, WAV, FLAC, M4A, OGG) — max 50MB
- Copertă piesă (upload fișier sau URL)
- Gestionare albume și EP-uri
- Filtrare și sortare client-side: tip, status, artist, gen

### 🛡️ Declarații creative & Conformitate EU AI Act
- **Declarație creativă** la adăugarea oricărei piese: echipă creativă per rol (compoziție, versuri, producție, mixaj) + checkbox-uri utilizare AI
- **Certificat Human Made** (`HM-YYYY-XXXXXX`) — generat automat cu credite complete când nu există implicare AI; document formal printabil
- **Declarație AI** (`AI-YYYY-XXXXXX`) — generată automat când AI este utilizat, cu lista etapelor implicate și referință EU AI Act
- Ambele documente vizualizabile direct din tabelul de catalog (badge clickabil) și din pagina piesei
- Revocare automată certificat Human Made dacă declarația este actualizată ulterior cu utilizare AI

### 🔊 Amprentare audio & Detecție similitudine
- Extragere amprentă audio prin serviciu Python/librosa: MFCC (13 coeficienți), Chroma (12 clase), tempo, durată
- Algoritm de comparație: pre-filtrare cosine → DTW (Dynamic Time Warping) pe matrici → scor final ponderat
- Scanner piese suspecte: upload fișier audio suspect → comparație cu întregul catalog amprentat → top-5 match-uri cu scor procentual
- Detecție segmente similare cu timestamp-uri
- Integrare raportare: platformă (TikTok, YouTube, Spotify etc.), URL suspect, status (Analiză / Confirmat / Rezolvat / Respins)

### 👥 Artiști
- Profile complete: date biografice, links social media (Spotify, Apple Music, YouTube, Instagram, TikTok), date de contact
- Manager de contact asociat
- Vizualizare venituri per artist, contracte active, piese din catalog
- Grafice venituri istorice

### 📄 Contracte
- Gestionare contracte de reprezentare artistică: durată, procent royalty, avans, teritorii, drepturi transferate, clauze speciale
- Status: Schiță / Activ / Expiră curând / Expirat / Negociere
- Analiză contract asistată AI (Groq LLaMA 3.3-70b): identificare clauze dezavantajoase, sugestii
- Generare clauze speciale asistată AI
- Previzualizare document formal printabil

### 💰 Finanțe & Royalties
- Înregistrare venituri pe surse: Streaming, YouTube, Apple Music, Licensing, Physical, Sync
- Filtrare per sursă, artist, perioadă
- Grafice interactive (Recharts): venituri lunare, distribuție per sursă
- Export CSV filtrat
- Gestionare plăți royalty: status (Pending / Plătit), date plată
- Import venituri din rapoarte distribuitori (CSV Believe și alte formate)

### 🎯 A&R Scouting
- Pipeline Kanban cu statusuri: Identificat → Analiză → Contactat → Negociere → Semnat / Respins
- View alternativ tabel
- Scoring prospect asistată AI: analiză prezență online, potențial artistic
- Raport AI detaliat per prospect
- Acțiune „Creare artist + contract" dintr-un singur formular: generează automat artistul și contractul activ

### 🚀 Lansări
- Planificare lansări cu checklist personalizabil
- Generare press release asistat AI
- Plan promovare social media
- Status: Planning / Ready / Released
- Sincronizare automată status cu piesa/albumul asociat

### 👨‍💼 Echipă & Roluri
- Roluri: Super Admin, Label Manager, A&R Manager, Financial
- Invitații prin email (Resend / Nodemailer fallback) cu token unic
- Permisiuni granulare per modul (artiști, contracte, finanțe, scouting, compliance etc.)

### ⚙️ Setări label
- Onboarding ghidat la prima autentificare
- Date label: nume, țară, oraș, gen principal, logo
- Planuri: Free Trial / Indie / Pro / Enterprise

---

## Stack tehnic

| Tehnologie | Rol |
|---|---|
| Next.js 15 (App Router) | Framework principal |
| React 19 | UI |
| TypeScript 5 strict | Tipizare |
| Prisma 7 + SQLite | ORM + bază de date |
| jose + bcryptjs | Autentificare JWT custom |
| Groq SDK (LLaMA 3.3-70b) | AI integrat |
| FastAPI + librosa (Python) | Serviciu analiză audio |
| Recharts | Grafice |
| Resend | Email invitații |

---

## Arhitectură

- **Server Components + Server Actions** — fără API REST (excepție: export CSV)
- **Autentificare JWT custom** — fără NextAuth, cookie `httpOnly`
- **Multi-tenant** — toate datele izolate per `labelId`
- **Serviciu Python auxiliar** — rulează separat pe portul 8000, apelat din Server Actions pentru analiza audio
- **Filtrare client-side** — fără round-trips la server pentru filtre și sortare
- **CSS custom dark theme** — fără Tailwind, variabile CSS globale

---

## Setup & rulare

### Cerințe
- Node.js 18+
- Python 3.10+ (pentru serviciul audio)

### Instalare

```bash
# Instalare dependențe Node.js
npm install

# Configurare variabile de mediu
cp .env.example .env
# Completează: AUTH_SECRET, GROQ_API_KEY, RESEND_API_KEY, DATABASE_URL

# Inițializare bază de date
npx prisma db push
npx prisma generate

# Date demo (opțional)
node seed.mjs
node seed-tracks.mjs
```

### Serviciu audio Python

```bash
cd audio-service
python -m venv venv

# Windows
venv\Scripts\pip install -r requirements.txt

# Linux/macOS
source venv/bin/activate && pip install -r requirements.txt
```

### Pornire

```bash
# Next.js + serviciu Python simultan (Windows)
npm run dev:all

# Sau separat
npm run dev                                               # Next.js pe portul 3000
cd audio-service && venv\Scripts\uvicorn main:app --reload --port 8000  # Python pe portul 8000
```

### Comenzi utile

```bash
npx prisma studio      # GUI bază de date
npx prisma db push     # Aplică modificări schemă
npx tsc --noEmit       # Verificare TypeScript
```

---

## Variabile de mediu

```env
AUTH_SECRET=           # Secret JWT (obligatoriu)
GROQ_API_KEY=          # Cheie API Groq
RESEND_API_KEY=        # Cheie API Resend (email)
DATABASE_URL=          # Calea SQLite, ex: file:./dev.db
AUDIO_SERVICE_URL=     # URL serviciu Python (default: http://localhost:8000)
```

---

## Structura proiectului

```
audio-service/          # Serviciu FastAPI + librosa (Python)
prisma/
  schema.prisma         # Schema bază de date
src/
  app/
    actions/            # Server Actions (mutații)
    api/                # API Routes (doar export CSV)
    artists/            # Modul artiști
    catalog/            # Modul catalog piese & albume
    compliance/         # Modul conformitate AI & scanner
    contracts/          # Modul contracte
    finance/            # Modul finanțe & royalties
    ar/                 # Modul A&R Scouting
    releases/           # Modul lansări
    team/               # Modul echipă
  components/
    ui/                 # Componente reutilizabile (DataTable, Modal, KPICard etc.)
  lib/                  # Utilități (sesiune, roluri, guards, Prisma)
```

---

*Lucrare de licență — Facultatea de Informatică*


