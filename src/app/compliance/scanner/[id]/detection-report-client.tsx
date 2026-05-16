'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  updateDetectionStatusFromReportAction,
  generateDetectionAnalysisAction,
} from '@/app/actions/scanner'

// ── Types ──────────────────────────────────────────────────────────────────────

export type ParsedMatch = {
  trackId: string
  trackTitle: string
  artistName: string
  overallScore: number
  mfccSimilarity: number
  chromaSimilarity: number
  tempoMatch: number
  segments: Array<{ startSec: number; endSec: number; score: number }>
  permissionStatus: 'allowed' | 'denied' | 'no_permission_set'
}

type DetectionData = {
  id: string
  suspectTitle: string | null
  suspectArtist: string | null
  platform: string | null
  suspectUrl: string | null
  suspectAudioFile: string | null
  suspectDuration: number | null
  status: string
  topMatchScore: number | null
  aiAnalysis: string | null
  notes: string | null
  analyzedAt: string | null
  createdAt: string
  reportedByName: string | null
  hasError: boolean
  analysisError: string | null
}

type TrackInfo = {
  id: string
  title: string
  audioFile: string | null
  artistName: string
}

type Props = {
  detection: DetectionData
  matches: ParsedMatch[]
  topTrack: TrackInfo | null
  canManage: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING:   'În analiză',
  CONFIRMED: 'Confirmat',
  DISMISSED: 'Respins',
  RESOLVED:  'Rezolvat',
}

const STATUS_VARIANT: Record<string, 'warning' | 'error' | 'neutral' | 'success'> = {
  PENDING:   'warning',
  CONFIRMED: 'error',
  DISMISSED: 'neutral',
  RESOLVED:  'success',
}

function scoreColor(score: number): string {
  if (score >= 0.8) return '#fca5a5'
  if (score >= 0.6) return '#fde68a'
  return '#6ee7b7'
}

function scoreMessage(score: number): string {
  if (score >= 0.8) return 'Similaritate foarte ridicată — posibilă extragere din catalog'
  if (score >= 0.6) return 'Similaritate semnificativă — necesită investigație'
  return 'Similaritate scăzută — probabil coincidență'
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('ro-RO', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

// ── Component ──────────────────────────────────────────────────────────────────

export function DetectionReportClient({ detection, matches, topTrack, canManage }: Props) {
  const router = useRouter()
  const [showAnalysis, setShowAnalysis] = useState(Boolean(detection.aiAnalysis))
  const [isPending,    startTransition]  = useTransition()

  const top = matches[0] ?? null
  const scoreVal = detection.topMatchScore ?? (top ? top.overallScore : null)

  // Chart data — top 3 matches
  const chartData = matches.slice(0, 3).map((m) => ({
    name:              truncate(m.trackTitle, 22),
    'MFCC (timbru)':   Math.round(m.mfccSimilarity   * 100),
    'Chroma (armonie)': Math.round(m.chromaSimilarity * 100),
    'Overall':          Math.round(m.overallScore     * 100),
  }))

  function handleGenerateAnalysis() {
    startTransition(async () => {
      await generateDetectionAnalysisAction(detection.id)
      router.refresh()
      setShowAnalysis(true)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── A) Header raport ─────────────────────────────────────────────── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Link
          href="/compliance/scanner"
          style={{ color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          ← Înapoi la Scanner
        </Link>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
              {detection.suspectTitle ?? 'Piesă necunoscută'}
            </h2>
            <div style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {detection.suspectArtist && <span>Artist: <strong>{detection.suspectArtist}</strong></span>}
              {detection.platform      && <span>Platformă: <strong>{detection.platform}</strong></span>}
              {detection.suspectUrl    && (
                <a
                  href={detection.suspectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--primary)' }}
                >
                  Link piesă ↗
                </a>
              )}
            </div>
          </div>
          <StatusBadge
            label={STATUS_LABELS[detection.status] ?? detection.status}
            variant={STATUS_VARIANT[detection.status] ?? 'neutral'}
          />
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>Raportat la: {fmtDate(detection.createdAt)}</span>
          {detection.reportedByName && <span>De: {detection.reportedByName}</span>}
          {detection.analyzedAt     && <span>Analizat la: {fmtDate(detection.analyzedAt)}</span>}
          {detection.suspectDuration && <span>Durată: {detection.suspectDuration.toFixed(1)}s</span>}
        </div>

        {detection.notes && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Note: {detection.notes}
          </p>
        )}

        {detection.hasError && detection.analysisError && (
          <div style={{ borderLeft: '3px solid var(--role-artist-dark)', paddingLeft: 10, fontSize: 12, color: 'var(--role-artist-dark)' }}>
            ⚠ Eroare analiză: {detection.analysisError}
          </div>
        )}
      </div>

      {/* ── B) Scor principal ────────────────────────────────────────────── */}
      {scoreVal !== null && (
        <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1, color: scoreColor(scoreVal) }}>
            {Math.round(scoreVal * 100)}%
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
            Similaritate cu catalogul
          </div>
          <div style={{
            marginTop: 12,
            fontSize: 13,
            color: scoreColor(scoreVal),
            fontWeight: 500,
          }}>
            {scoreMessage(scoreVal)}
          </div>
          {top && (
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              Cea mai similară piesă:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {top.trackTitle}
              </strong>{' '}
              de {top.artistName}
            </div>
          )}
        </div>
      )}

      {/* ── C) Audio players ─────────────────────────────────────────────── */}
      {(detection.suspectAudioFile || topTrack) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Player suspect */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: 'var(--text-primary)' }}>
              🎵 Piesă suspectă
            </div>
            {detection.suspectAudioFile ? (
              <audio
                controls
                style={{ width: '100%' }}
                src={`/uploads/suspects/${detection.suspectAudioFile}`}
              />
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                Fișier audio indisponibil
              </p>
            )}
          </div>

          {/* Player catalog */}
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: 'var(--text-primary)' }}>
              🎵 {topTrack ? `${topTrack.title} — ${topTrack.artistName}` : 'Top match din catalog'}
            </div>
            {topTrack?.audioFile ? (
              <audio
                controls
                style={{ width: '100%' }}
                src={`/uploads/catalog/${topTrack.audioFile}`}
              />
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                Fișier audio indisponibil în catalog
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── D) Grafic top matches ─────────────────────────────────────────── */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15 }}>Comparație top {chartData.length} match-uri</h3>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
                <Tooltip
                  formatter={(v: unknown) => [`${v}%`]}
                  contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: 6, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="MFCC (timbru)"   fill="#fde68a" radius={[0, 3, 3, 0]} />
                <Bar dataKey="Chroma (armonie)" fill="#6ee7b7" radius={[0, 3, 3, 0]} />
                <Bar dataKey="Overall"          fill="#9B94F0" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── E) Detalii per match ─────────────────────────────────────────── */}
      {matches.slice(0, 3).map((m, i) => (
        <div key={m.trackId} className="card">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--bg-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)',
                flexShrink: 0,
              }}>
                #{i + 1}
              </span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{m.trackTitle}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.artistName}</div>
              </div>
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: scoreColor(m.overallScore) }}>
              {pct(m.overallScore)}
            </span>
          </div>

          {/* Metrici */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
            {[
              { label: 'MFCC (timbru)',     value: m.mfccSimilarity },
              { label: 'Chroma (armonie)',   value: m.chromaSimilarity },
              { label: 'Tempo',             value: m.tempoMatch },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor(value) }}>
                  {pct(value)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Permisiuni */}
          {m.permissionStatus === 'denied' && (
            <div style={{ fontSize: 12, background: 'rgba(252,165,165,0.1)', border: '1px solid rgba(252,165,165,0.25)', borderRadius: 6, padding: '6px 10px', marginBottom: 10, color: '#fca5a5' }}>
              ⚠ AI Training interzis — posibilă încălcare drepturi
            </div>
          )}
          {m.permissionStatus === 'allowed' && (
            <div style={{ fontSize: 12, background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.25)', borderRadius: 6, padding: '6px 10px', marginBottom: 10, color: '#6ee7b7' }}>
              ✓ AI Training permis
            </div>
          )}
          {m.permissionStatus === 'no_permission_set' && (
            <div style={{ fontSize: 12, background: 'rgba(253,230,138,0.1)', border: '1px solid rgba(253,230,138,0.25)', borderRadius: 6, padding: '6px 10px', marginBottom: 10, color: '#fde68a' }}>
              ⚠ Permisiuni AI nesetate
            </div>
          )}

          {/* Segmente */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Segmente similare detectate (prag cosine ≥ 85%)
            </div>
            {m.segments && m.segments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {m.segments.map((s, si) => (
                  <div key={si} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                      {s.startSec.toFixed(1)}s – {s.endSec.toFixed(1)}s
                    </span>
                    <span>→ similaritate {Math.round(s.score * 100)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Nu s-au detectat segmente similare cu prag &gt; 85%
              </span>
            )}
          </div>
        </div>
      ))}

      {/* ── F) Raport AI ─────────────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>✦ Raport AI</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            {detection.aiAnalysis && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAnalysis((v) => !v)}
              >
                {showAnalysis ? 'Ascunde raport AI' : 'Vezi raport AI'}
              </button>
            )}
            {!detection.aiAnalysis && canManage && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleGenerateAnalysis}
                disabled={isPending}
              >
                {isPending ? 'Se generează…' : '✦ Generează raport AI'}
              </button>
            )}
          </div>
        </div>

        {showAnalysis && detection.aiAnalysis && (
          <div style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            background: 'var(--bg-tertiary)',
            borderRadius: 6,
            padding: '14px 16px',
          }}>
            {detection.aiAnalysis}
          </div>
        )}

        {!detection.aiAnalysis && !canManage && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Nu există raport AI generat pentru această detecție.
          </p>
        )}
      </div>

      {/* ── G) Acțiuni ───────────────────────────────────────────────────── */}
      {canManage && detection.status === 'PENDING' && (
        <div className="card">
          <h3 style={{ margin: '0 0 14px 0', fontSize: 15 }}>Actualizează status</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <form action={updateDetectionStatusFromReportAction}>
              <input type="hidden" name="id"     value={detection.id} />
              <input type="hidden" name="status" value="CONFIRMED" />
              <button type="submit" className="btn btn-primary btn-sm">
                ✓ Confirmă — încălcare reală
              </button>
            </form>
            <form action={updateDetectionStatusFromReportAction}>
              <input type="hidden" name="id"     value={detection.id} />
              <input type="hidden" name="status" value="DISMISSED" />
              <button type="submit" className="btn btn-secondary btn-sm">
                ✗ Respinge — fals pozitiv
              </button>
            </form>
            <form action={updateDetectionStatusFromReportAction}>
              <input type="hidden" name="id"     value={detection.id} />
              <input type="hidden" name="status" value="RESOLVED" />
              <button type="submit" className="btn btn-ghost btn-sm">
                ✓ Rezolvat
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
