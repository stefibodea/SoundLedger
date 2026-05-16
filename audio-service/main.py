import json
import os
import tempfile
from typing import Optional

import librosa
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from scipy.spatial.distance import cosine as scipy_cosine

app = FastAPI(title="SoundLedger Audio Service", version="1.0.0")

SAMPLE_RATE = 22050
HOP_LENGTH = 512
N_MFCC = 13
N_CHROMA = 12
SEGMENT_DURATION_SEC = 5.0

ALLOWED_EXTENSIONS = {"mp3", "wav", "flac", "m4a", "ogg"}


# ── Pydantic models ──────────────────────────────────────────────────────────

class FingerprintResponse(BaseModel):
    mfccMean: list[float]
    chromaMean: list[float]
    mfccMatrix: list[list[float]]
    chromaMatrix: list[list[float]]
    tempo: float
    duration: float
    sampleRate: int
    hopLength: int


class CatalogTrack(BaseModel):
    trackId: str
    trackTitle: str
    artistName: str
    mfccMean: list[float]
    chromaMean: list[float]
    mfccMatrix: list[list[float]]
    chromaMatrix: list[list[float]]
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
    mfccSimilarity: float
    chromaSimilarity: float
    tempoMatch: float
    segments: list[SegmentMatch]


class CompareResponse(BaseModel):
    suspectDuration: float
    suspectTempo: float
    matches: list[TrackMatch]
    topMatchScore: float
    topMatchTrackId: Optional[str]


# ── Funcții core ─────────────────────────────────────────────────────────────

def extract_features(audio_path: str) -> dict:
    y, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)
    duration = float(len(y) / sr)

    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC, hop_length=HOP_LENGTH)
    # Normalizare per coeficient (zero mean, unit variance)
    mfcc_mean = mfcc.mean(axis=1)
    mfcc_std = mfcc.std(axis=1) + 1e-8
    mfcc_norm = (mfcc - mfcc_mean[:, None]) / mfcc_std[:, None]

    chroma = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=HOP_LENGTH, n_chroma=N_CHROMA)

    tempo_arr, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=HOP_LENGTH)
    tempo = float(np.atleast_1d(tempo_arr)[0])

    return {
        "mfccMean": mfcc_norm.mean(axis=1).tolist(),
        "chromaMean": chroma.mean(axis=1).tolist(),
        "mfccMatrix": mfcc_norm.T.tolist(),   # (n_frames, 13)
        "chromaMatrix": chroma.T.tolist(),      # (n_frames, 12)
        "tempo": tempo,
        "duration": duration,
        "sampleRate": SAMPLE_RATE,
        "hopLength": HOP_LENGTH,
    }


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    a = np.array(v1, dtype=np.float64)
    b = np.array(v2, dtype=np.float64)
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
        return 0.0
    dist = scipy_cosine(a, b)
    # scipy_cosine returnează distanță în [0, 2]; normalizăm la similaritate în [0, 1]
    return float(np.clip(1.0 - dist / 2.0, 0.0, 1.0))


def dtw_distance(matrix_a: list[list[float]], matrix_b: list[list[float]]) -> float:
    a = np.array(matrix_a, dtype=np.float64)
    b = np.array(matrix_b, dtype=np.float64)

    # Sub-eșantionare la maxim 500 frames pentru performanță
    max_frames = 500
    if len(a) > max_frames:
        step = len(a) // max_frames
        a = a[::step]
    if len(b) > max_frames:
        step = len(b) // max_frames
        b = b[::step]

    D, wp = librosa.sequence.dtw(a.T, b.T, metric="euclidean")
    cost = float(D[-1, -1])
    path_len = float(len(wp))
    normalized_cost = cost / (path_len + 1e-8)
    similarity = 1.0 / (1.0 + normalized_cost / 10.0)
    return float(np.clip(similarity, 0.0, 1.0))


def find_similar_segments(
    suspect_matrix: list[list[float]],
    catalog_matrix: list[list[float]],
    sample_rate: int,
    hop_length: int,
    segment_sec: float = SEGMENT_DURATION_SEC,
) -> list[dict]:
    frames_per_segment = int(segment_sec * sample_rate / hop_length)
    step = max(frames_per_segment // 2, 1)

    suspect = np.array(suspect_matrix, dtype=np.float64)
    catalog = np.array(catalog_matrix, dtype=np.float64)

    results = []
    n_frames = len(suspect)

    for start in range(0, n_frames - frames_per_segment + 1, step):
        end = start + frames_per_segment
        seg = suspect[start:end]
        seg_mean = seg.mean(axis=0).tolist()

        best_score = 0.0
        catalog_n = len(catalog)
        for cat_start in range(0, catalog_n - frames_per_segment + 1, step):
            cat_seg = catalog[cat_start : cat_start + frames_per_segment]
            cat_mean = cat_seg.mean(axis=0).tolist()
            score = cosine_similarity(seg_mean, cat_mean)
            if score > best_score:
                best_score = score

        if best_score >= 0.85:
            start_sec = float(start * hop_length / sample_rate)
            end_sec = float(end * hop_length / sample_rate)
            results.append({"startSec": start_sec, "endSec": end_sec, "score": round(best_score, 4)})

    return results


def tempo_similarity(t1: float, t2: float) -> float:
    diff = abs(t1 - t2)
    if diff <= 5.0:
        return 1.0
    if diff >= 30.0:
        return 0.0
    return float(1.0 - (diff - 5.0) / 25.0)


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ok", "service": "SoundLedger Audio Service"}


@app.get("/health")
async def health():
    return {"status": "ok", "librosa_version": librosa.__version__}


@app.post("/extract", response_model=FingerprintResponse)
async def extract(file: UploadFile = File(...)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format neacceptat: {ext}. Acceptate: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        features = extract_features(tmp_path)
        return FingerprintResponse(**features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare extragere features: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.post("/compare", response_model=CompareResponse)
async def compare(
    file: UploadFile = File(...),
    catalog_json: str = Form(...),
    top_k: int = Form(default=3),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Format neacceptat: {ext}. Acceptate: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    try:
        catalog: list[dict] = json.loads(catalog_json)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"catalog_json invalid: {str(e)}")

    if not catalog:
        raise HTTPException(status_code=400, detail="Catalogul este gol.")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        suspect_features = extract_features(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Eroare extragere features suspect: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # Pre-filtrare cosine pe vectori medii — scor = 0.5 * mfcc + 0.5 * chroma
    scored: list[tuple[float, dict]] = []
    for track in catalog:
        mfcc_score = cosine_similarity(suspect_features["mfccMean"], track["mfccMean"])
        chroma_score = cosine_similarity(suspect_features["chromaMean"], track["chromaMean"])
        pre_score = 0.5 * mfcc_score + 0.5 * chroma_score
        scored.append((pre_score, track))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_candidates = [t for _, t in scored[: max(top_k, 1)]]

    matches: list[TrackMatch] = []
    for track in top_candidates:
        mfcc_dtw = dtw_distance(suspect_features["mfccMatrix"], track["mfccMatrix"])
        chroma_dtw = dtw_distance(suspect_features["chromaMatrix"], track["chromaMatrix"])
        tempo_score = tempo_similarity(suspect_features["tempo"], track["tempo"])

        overall = 0.5 * mfcc_dtw + 0.4 * chroma_dtw + 0.1 * tempo_score

        segments = find_similar_segments(
            suspect_features["chromaMatrix"],
            track["chromaMatrix"],
            SAMPLE_RATE,
            HOP_LENGTH,
        )

        matches.append(
            TrackMatch(
                trackId=track["trackId"],
                trackTitle=track["trackTitle"],
                artistName=track["artistName"],
                overallScore=round(overall, 4),
                mfccSimilarity=round(mfcc_dtw, 4),
                chromaSimilarity=round(chroma_dtw, 4),
                tempoMatch=round(tempo_score, 4),
                segments=[SegmentMatch(**s) for s in segments],
            )
        )

    matches.sort(key=lambda m: m.overallScore, reverse=True)

    top_match = matches[0] if matches else None
    return CompareResponse(
        suspectDuration=round(suspect_features["duration"], 2),
        suspectTempo=round(suspect_features["tempo"], 2),
        matches=matches,
        topMatchScore=round(top_match.overallScore, 4) if top_match else 0.0,
        topMatchTrackId=top_match.trackId if top_match else None,
    )
