'use client'

import React, { useState } from 'react'

interface AiReport {
  id: string
  createdAt: Date | string
  message: string
}

interface AiReportPanelProps {
  latestAiReport: AiReport | null
  generateFinanceReportAction: () => Promise<void>
}

export function AiReportPanel({ latestAiReport, generateFinanceReportAction }: AiReportPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    try {
      await generateFinanceReportAction()
    } finally {
      setIsPending(false)
    }
  }

  return (
    <section className="card" style={{ marginBottom: 20, transition: 'all 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: (!isCollapsed && latestAiReport) ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingBottom: (!isCollapsed && latestAiReport) ? 12 : 0, marginBottom: (!isCollapsed && latestAiReport) ? 12 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            Raport financiar AI
          </h3>
          {latestAiReport && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="btn btn-secondary"
              style={{
                fontSize: 11,
                padding: '4px 8px',
                height: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {isCollapsed ? '▼ Extinde' : '▲ Micșorează'}
            </button>
          )}
        </div>
        <form onSubmit={handleGenerate}>
          <button className="btn btn-secondary" type="submit" disabled={isPending} style={{ fontSize: 13, background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(168,85,247,0.15) 100%)', border: '1px solid rgba(168,85,247,0.3)' }}>
            {isPending ? 'Se generează...' : (latestAiReport ? 'Regenerează' : 'Generează raport')}
          </button>
        </form>
      </div>

      {!isCollapsed && latestAiReport && (
        <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            Generat: {new Date(latestAiReport.createdAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          <div style={{ display: 'grid', gap: 14 }}>
            {latestAiReport.message.split(/\n(?=\*\*)/).map((section, i) => {
              const titleMatch = section.match(/^\*\*(.+?)\*\*\n?/)
              const title = titleMatch?.[1] ?? ''
              const body  = section.replace(/^\*\*.+?\*\*\n?/, '').trim()
              if (!body) return null
              return (
                <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--role-finance-dark)' }}>
                  {title && <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--role-finance-dark)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>}
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{body}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!latestAiReport && (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, margin: 0, paddingTop: 10 }}>
          Apasă "Generează raport" pentru o analiză AI a veniturilor: trend lunar, surse dominante, anomalii detectate și recomandări.
        </p>
      )}
    </section>
  )
}
