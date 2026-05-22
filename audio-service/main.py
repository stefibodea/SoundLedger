"""
SoundLedger Audio Analysis Service v2.0
Arhitectură hibridă:
  Nivel 1: Chromaprint (acoustid + fpcalc) — detecție copiere directă fragment
  Nivel 2: OpenL3 (deep learning embeddings) — detecție similaritate semantică/voce clonată
Scor final = 0.5 * chromaprint_score + 0.5 * openl3_score
"""

import os
import sys

os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# Forțează UTF-8 pe stdout/stderr — consola Windows folosește implicit charmap (cp1252)
# care nu suportă caractere românești (ț, ș etc.) în titlurile de piese
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import json
import shutil
import subprocess
import tempfile
from typing import List, Optional

import librosa
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

app = FastAPI(title="SoundLedger Audio Analysis v2", version="2.0.0")

FPCALC_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fpcalc.exe')
SAMPLE_RATE = 22050
ALLOWED_EXTENSIONS = {"mp3", "wav", "flac", "m4a", "ogg"}

# OpenL3 lazy load — evită import lent la startup
_openl3 = None


def get_openl3():
    global _openl3
    if _openl3 is None:
        import openl3
        _openl3 = openl3
    return _openl3


# ============================================================
# MODELE PYDANTIC
# ============================================================

class FingerprintResponse(BaseModel):
    # Câmpurile păstrate din v1 pentru compatibilitate cu schema DB
    mfccMean: List[float]           # Stochează openl3_embedding (512D)
    chromaMean: List[float]         # Stochează chromaprint fingerprint (lista int ca float)
    mfccMatrix: List[List[float]]   # Gol [] — neutilizat în v2
    chromaMatrix: List[List[float]] # Gol [] — neutilizat în v2
    tempo: float
    duration: float
    sampleRate: int
    hopLength: int


class CatalogTrack(BaseModel):
    trackId: str
    trackTitle: str
    artistName: str
    mfccMean: List[float]           # openl3_embedding
    chromaMean: List[float]         # chromaprint fingerprint
    mfccMatrix: List[List[float]]
    chromaMatrix: List[List[float]]
    tempo: float
    duration: float


class SegmentMatch(BaseModel):
    startSec: float
    endSec: float
    score: float


class TrackMatch(BaseModel):
    trackId: str
    trackTitle: str
    artistName: str
    overallScore: float
    mfccSimilarity: float    # openl3 score (redenumit pentru compatibilitate cu v1)
    chromaSimilarity: float  # chromaprint score (redenumit pentru compatibilitate cu v1)
    tempoMatch: float
    segments: List[SegmentMatch]


class CompareResponse(BaseModel):
    suspectDuration: float
    suspectTempo: float
    matches: List[TrackMatch]
    topMatchScore: float
    topMatchTrackId: Optional[str]


# ============================================================
# NIVEL 1: CHROMAPRINT
# ============================================================

def extract_chromaprint(audio_path: str) -> Optional[List[int]]:
    """
    Extrage Chromaprint fingerprint folosind fpcalc.exe.
    Returnează lista de int-uri sau None dacă eșuează.
    """
    safe_path = None
    try:
        ext = os.path.splitext(audio_path)[1]
        safe_path = os.path.join(tempfile.gettempdir(), f'sl_fpcalc_tmp{ext}')
        shutil.copy2(audio_path, safe_path)

        result = subprocess.run(
            [FPCALC_PATH, '-raw', '-json', safe_path],
            capture_output=True,
            timeout=60,
            encoding='utf-8',
            errors='replace'
        )
        if result.returncode != 0:
            print(f"fpcalc error: {result.stderr}")
            return None
        data = json.loads(result.stdout)
        return data.get('fingerprint', None)
    except Exception as e:
        print(f"Chromaprint extraction error: {e}")
        return None
    finally:
        if safe_path and os.path.exists(safe_path):
            try:
                os.unlink(safe_path)
            except:
                pass


def chromaprint_similarity(fp1: List[int], fp2: List[int]) -> float:
    """
    Calculează similaritatea între două Chromaprint fingerprints.
    Folosește bit error rate pe perechile de int-uri de 32 biți.
    Returnează scor 0-1 (1 = identic).
    """
    if not fp1 or not fp2:
        return 0.0

    min_len = min(len(fp1), len(fp2))
    if min_len == 0:
        return 0.0

    fp1 = fp1[:min_len]
    fp2 = fp2[:min_len]

    total_bits = 0
    matching_bits = 0

    for a, b in zip(fp1, fp2):
        xor = a ^ b
        bits = 32
        total_bits += bits
        diff_bits = bin(xor).count('1')
        matching_bits += (bits - diff_bits)

    return float(matching_bits / total_bits) if total_bits > 0 else 0.0


# ============================================================
# NIVEL 2: OPENL3
# ============================================================

def extract_openl3_embedding(audio_path: str) -> Optional[List[float]]:
    """
    Extrage OpenL3 embedding pentru un fișier audio.
    Returnează vectorul mediu de 512D sau None dacă eșuează.
    """
    try:
        openl3 = get_openl3()
        audio, sr = librosa.load(audio_path, sr=22050, mono=True)

        # hop_size=1.0s pentru viteză pe CPU; content_type='music'; embedding_size=512
        emb, ts = openl3.get_audio_embedding(
            audio, sr,
            content_type='music',
            embedding_size=512,
            hop_size=1.0
        )

        embedding_mean = emb.mean(axis=0).tolist()
        return embedding_mean
    except Exception as e:
        print(f"OpenL3 extraction error: {e}")
        return None


def openl3_similarity(emb1: List[float], emb2: List[float]) -> float:
    """
    Cosine similarity între două OpenL3 embeddings.
    Returnează scor 0-1 (1 = identic).
    """
    if not emb1 or not emb2:
        return 0.0
    a = np.array(emb1, dtype=np.float64)
    b = np.array(emb2, dtype=np.float64)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-8 or norm_b < 1e-8:
        return 0.0
    cosine_sim = float(np.dot(a, b) / (norm_a * norm_b))
    # np.dot / norme → [-1, 1]; mapăm la [0, 1]
    return float(max(0.0, min(1.0, (cosine_sim + 1.0) / 2.0)))


# ============================================================
# UTILITĂȚI
# ============================================================

def get_tempo_and_duration(audio_path: str):
    y, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    duration = float(len(y) / sr)
    tempo_arr, _ = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.atleast_1d(tempo_arr)[0])
    return tempo, duration


def tempo_similarity(t1: float, t2: float) -> float:
    if t1 <= 0 or t2 <= 0:
        return 0.0
    diff = abs(t1 - t2)
    if diff <= 5.0:
        return 1.0
    if diff >= 30.0:
        return 0.0
    return float(1.0 - (diff - 5.0) / 25.0)


# ============================================================
# ENDPOINT-URI
# ============================================================

@app.get("/")
def root():
    return {
        "service": "SoundLedger Audio Analysis v2",
        "status": "ok",
        "architecture": "Chromaprint + OpenL3"
    }


@app.get("/health")
def health():
    openl3_available = True
    try:
        get_openl3()
    except Exception:
        openl3_available = False

    fpcalc_available = os.path.exists(FPCALC_PATH)

    return {
        "status": "healthy",
        "librosa_version": librosa.__version__,
        "openl3_available": openl3_available,
        "chromaprint_available": fpcalc_available,
        "fpcalc_path": FPCALC_PATH
    }


@app.post("/extract", response_model=FingerprintResponse)
async def extract_endpoint(file: UploadFile = File(...)):
    """
    Extrage fingerprint din fișier audio.
    Returnează Chromaprint + OpenL3 embedding + tempo + duration.
    mfccMean → openl3_embedding (512D)
    chromaMean → chromaprint fingerprint (int-uri ca float)
    """
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format neacceptat: {ext}. Acceptate: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Tempo și durată
        tempo, duration = get_tempo_and_duration(tmp_path)

        # Nivel 1: Chromaprint — eșec silențios, returnează []
        chromaprint_fp = extract_chromaprint(tmp_path)
        chromaprint_list = chromaprint_fp if chromaprint_fp else []

        # Nivel 2: OpenL3 — eșec silențios, returnează []
        openl3_emb = extract_openl3_embedding(tmp_path)
        openl3_list = openl3_emb if openl3_emb else []

        print(
            f"[extract] tempo={tempo:.1f} BPM, duration={duration:.1f}s, "
            f"chromaprint_len={len(chromaprint_list)}, openl3_dim={len(openl3_list)}"
        )

        return FingerprintResponse(
            mfccMean=openl3_list,
            chromaMean=[float(x) for x in chromaprint_list],
            mfccMatrix=[],
            chromaMatrix=[],
            tempo=tempo,
            duration=duration,
            sampleRate=SAMPLE_RATE,
            hopLength=512
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare la extragere: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.post("/compare", response_model=CompareResponse)
async def compare_endpoint(
    file: UploadFile = File(...),
    catalog_json: str = Form(...),
    top_k: int = Form(default=3),
):
    """
    Compară fișier audio suspect cu fingerprints din catalog.
    Nivel 1: Chromaprint bit error rate
    Nivel 2: OpenL3 cosine similarity
    Scor final = 0.5 * chromaprint + 0.5 * openl3
    """
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format neacceptat: {ext}. Acceptate: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    try:
        catalog_data: list = json.loads(catalog_json)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"catalog_json invalid: {str(e)}")

    if not catalog_data:
        raise HTTPException(status_code=400, detail="Catalog gol")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Extrage features piesă suspectă
        tempo_suspect, duration_suspect = get_tempo_and_duration(tmp_path)
        chromaprint_suspect = extract_chromaprint(tmp_path)
        openl3_suspect = extract_openl3_embedding(tmp_path)

        print(
            f"[compare] suspect: tempo={tempo_suspect:.1f} BPM, duration={duration_suspect:.1f}s, "
            f"catalog_size={len(catalog_data)}"
        )

        matches: List[TrackMatch] = []

        for track in catalog_data:
            # Recuperează datele din câmpurile refolosite
            openl3_catalog = track.get('mfccMean', [])             # OpenL3 embedding 512D
            chromaprint_float = track.get('chromaMean', [])         # Chromaprint ca float
            chromaprint_catalog = [int(x) for x in chromaprint_float] if chromaprint_float else []
            tempo_catalog = float(track.get('tempo', 0))

            # Nivel 1: Chromaprint — eșec returnează 0.0, nu aruncă eroare
            cp_score = 0.0
            try:
                cp_score = chromaprint_similarity(
                    chromaprint_suspect or [],
                    chromaprint_catalog
                )
            except Exception as e:
                print(f"  [chromaprint] eroare pentru {track.get('trackTitle', '?')}: {e}")

            # Nivel 2: OpenL3 — eșec returnează 0.0, nu aruncă eroare
            ol3_score = 0.0
            try:
                ol3_score = openl3_similarity(
                    openl3_suspect or [],
                    openl3_catalog
                )
            except Exception as e:
                print(f"  [openl3] eroare pentru {track.get('trackTitle', '?')}: {e}")

            # Tempo match (informativ, nu intră în scorul final)
            t_match = tempo_similarity(tempo_suspect, tempo_catalog)

            # Scor final
            overall = round(0.5 * cp_score + 0.5 * ol3_score, 4)

            print(
                f"  [{track.get('trackTitle', '?')}] "
                f"chromaprint={cp_score:.3f}, openl3={ol3_score:.3f}, "
                f"tempo_match={t_match:.3f}, overall={overall:.3f}"
            )

            matches.append(TrackMatch(
                trackId=track['trackId'],
                trackTitle=track['trackTitle'],
                artistName=track['artistName'],
                overallScore=overall,
                mfccSimilarity=round(ol3_score, 4),      # openl3 score
                chromaSimilarity=round(cp_score, 4),     # chromaprint score
                tempoMatch=round(t_match, 4),
                segments=[]  # Chromaprint nu face segment detection cu timestamp-uri
            ))

        matches.sort(key=lambda m: m.overallScore, reverse=True)
        top = matches[0] if matches else None

        return CompareResponse(
            suspectDuration=round(duration_suspect, 2),
            suspectTempo=round(tempo_suspect, 2),
            matches=matches[:top_k],
            topMatchScore=top.overallScore if top else 0.0,
            topMatchTrackId=top.trackId if top else None,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare la comparare: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
