/*
 * AI Provider: Google Gemini (gemini-2.5-flash)
 *
 * Arhitectură agnostică față de provider-ul AI:
 * - Interfața publică: doar funcția `generateText(prompt: string): Promise<string>`
 * - Toată logica specifică provider-ului este izolată în acest fișier
 * - Pentru a schimba provider-ul (ex: Groq, Claude, OpenAI), modifici doar:
 *     1. Importul SDK-ului
 *     2. Inițializarea clientului
 *     3. Corpul funcției `generateText`
 *   Restul aplicației (actions/ai.ts și orice alt apelant) rămâne nemodificat.
 *
 * De ce Gemini 2.5 Flash:
 * - 1500 cereri/zi gratuit (Google AI Studio)
 * - Calitate superioară pentru analiză text complexă
 * - Multimodal (poate procesa imagini/audio în versiuni viitoare)
 *
 * Obține cheia API: https://aistudio.google.com/apikey
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export const AI_MODEL = 'gemini-2.5-flash'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

export async function generateText(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: AI_MODEL })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

// Generează clauze contractuale „Human First" pentru protecția drepturilor în era AI
export async function generateAIClauses(context: {
  artistName: string
  labelName: string
  royaltyPercent: number
}): Promise<string> {
  const prompt = `Ești un avocat specializat în drepturile artiștilor în era inteligenței artificiale. Generează clauze contractuale clare și echitabile care să protejeze artistul împotriva utilizării neautorizate a muzicii sale pentru antrenarea modelelor AI.

Context contract:
- Artist: ${context.artistName}
- Label: ${context.labelName}
- Royalty actual: ${context.royaltyPercent}%

Generează EXACT 4 clauze numerotate, în română, care acoperă:
1. Consimțământul explicit și revocabil pentru utilizarea muzicii în sisteme AI
2. Compensația minimă în cazul utilizării pentru antrenare AI (procent sau sumă fixă)
3. Transparența — dreptul artistului de a ști cum și unde este folosită muzica sa
4. Mecanismul de retragere a consimțământului și ștergerea datelor

Fiecare clauză: titlu + 2-3 propoziții juridice clare. Scrie în română, stil contractual formal.`

  const model = genAI.getGenerativeModel({ model: AI_MODEL })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

// Analizează o piesă suspectă și o compară cu catalogul labelului pentru detecție utilizare AI neautorizată
// NOTĂ: Într-o implementare de producție, această funcție ar folosi un serviciu de audio fingerprinting
// precum AudD sau ACRCloud. Pentru scopul demo, AI-ul generează un raport pe baza metadata.
export async function analyzeSuspectTrack(input: {
  suspectUrl: string
  suspectTitle?: string
  suspectArtist?: string
  catalogTracks: Array<{ id: string; title: string; artist: string; genre?: string }>
}): Promise<{ similarityScore: number; matchedTrackIds: string[]; aiAnalysis: string }> {
  const catalogList = input.catalogTracks
    .map((t) => `- ID:${t.id} | "${t.title}" de ${t.artist}${t.genre ? ` (${t.genre})` : ''}`)
    .join('\n')

  const prompt = `Ești un expert în proprietate intelectuală și protecția drepturilor muzicale în era AI.

Un label muzical raportează că o piesă externă ar putea fi generată cu AI folosind muzica din catalogul lor fără consimțământ. Analizează probabilitatea și generează un raport.

PIESA SUSPECTĂ:
URL: ${input.suspectUrl}
${input.suspectTitle ? `Titlu: ${input.suspectTitle}` : '(titlu necunoscut)'}
${input.suspectArtist ? `Artist: ${input.suspectArtist}` : '(artist necunoscut)'}

CATALOGUL LABELULUI (${input.catalogTracks.length} piese):
${catalogList || '(catalog gol)'}

Răspunde cu EXACT acest format (respectă etichetele):
SCOR: [număr 0-100]
PIESE_SIMILARE: [ID1,ID2 din lista de mai sus, sau gol dacă niciuna]
RAPORT:
[3-5 propoziții în română despre: evaluarea riscului, ce elemente sunt vulnerabile, recomandări pentru pașii următori — takedown DMCA, solicitare compensație, documentare]`

  const model = genAI.getGenerativeModel({ model: AI_MODEL })
  const result = await model.generateContent(prompt)
  const text = result.response.text()

  const scoreMatch = text.match(/SCOR:\s*(\d+)/i)
  const similarityScore = scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1]))) : 50

  const matchedMatch = text.match(/PIESE_SIMILARE:\s*([^\n]*)/i)
  const matchedRaw = matchedMatch ? matchedMatch[1].trim() : ''
  const validIds = new Set(input.catalogTracks.map((t) => t.id))
  const matchedTrackIds = matchedRaw
    ? matchedRaw.split(',').map((s) => s.trim()).filter((id) => validIds.has(id))
    : []

  const aiAnalysis = text.replace(/SCOR:\s*\d+\n?/i, '').replace(/PIESE_SIMILARE:[^\n]*\n?/i, '').replace(/^RAPORT:\n?/im, '').trim()

  return { similarityScore, matchedTrackIds, aiAnalysis }
}
