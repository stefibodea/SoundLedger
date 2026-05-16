# SoundLedger — Audio Similarity Service

Serviciu Python FastAPI care extrage amprentă audio (MFCC, chroma, tempo) din fișiere audio și compară piese suspecte cu catalogul unui label muzical pentru detecția plagiatului AI.

## Setup

```bash
# Din folderul audio-service/
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
```

## Pornire

```bash
# Din rădăcina proiectului Next.js, cu venv activat
uvicorn main:app --reload --port 8000 --app-dir audio-service

# Sau din folderul audio-service/
uvicorn main:app --reload --port 8000
```

Serviciul rulează la `http://localhost:8000`. Documentație automată: `http://localhost:8000/docs`.

## Algoritmi

### Extragere features (`/extract`)

1. **MFCC** (Mel-Frequency Cepstral Coefficients, N=13) — capturează timbrul și caracteristicile spectrale. Normalizat per coeficient (zero mean, unit variance) pentru invarianță la volum.
2. **Chroma** (N=12) — distribuția energiei pe cele 12 clase de pitch; robust la variații de tempo.
3. **Tempo** — estimat cu `librosa.beat.beat_track`.

### Comparație similaritate (`/compare`)

**Pre-filtrare cosine** pe vectorii medii:
- `pre_score = 0.5 × cosine(mfccMean_suspect, mfccMean_catalog) + 0.5 × cosine(chromaMean_suspect, chromaMean_catalog)`
- Selectează top-k candidați cei mai promițători.

**DTW (Dynamic Time Warping)** pe matricile de features:
- `librosa.sequence.dtw` cu metrică euclidiană
- Sub-eșantionare la max 500 frames pentru performanță
- Similaritate: `1.0 / (1.0 + cost_normalizat / 10.0)`

**Scor final per piesă:**
```
overallScore = 0.5 × mfcc_dtw + 0.4 × chroma_dtw + 0.1 × tempo_similarity
```

**Detecție segmente similare:**
- Sliding window cu pas = segment_duration / 2
- Cosine pe medii de segment; prag de raportare: 0.85

### Similaritate tempo

| Diferență BPM | Scor |
|---|---|
| ≤ 5 BPM | 1.0 |
| ≥ 30 BPM | 0.0 |
| Între 5–30 | Liniar |

## Endpoint-uri

| Method | Path | Descriere |
|---|---|---|
| GET | `/` | Status serviciu |
| GET | `/health` | Status + versiune librosa |
| POST | `/extract` | Extrage amprentă audio din fișier |
| POST | `/compare` | Compară fișier suspect cu catalogul JSON |

### `POST /extract`
- **Body**: `multipart/form-data`, câmp `file` (mp3, wav, flac, m4a, ogg)
- **Returnează**: `FingerprintResponse` cu toți vectorii

### `POST /compare`
- **Body**: `multipart/form-data`
  - `file`: fișier audio suspect
  - `catalog_json`: JSON string cu array de `CatalogTrack`
  - `top_k`: numărul maxim de match-uri dorite (default: 3)
- **Returnează**: `CompareResponse` cu match-uri sortate descrescător

#### Exemplu `catalog_json`

```json
[
  {
    "trackId": "clxyz123",
    "trackTitle": "Summertime",
    "artistName": "Maria Ionescu",
    "mfccMean": [...],
    "chromaMean": [...],
    "mfccMatrix": [[...]],
    "chromaMatrix": [[...]],
    "tempo": 120.5,
    "duration": 213.4
  }
]
```
