import Link from 'next/link'
import styles from './landing.module.css'

const features = [
  {
    title: 'Protecție AI & Copyright',
    desc: 'Amprentă audio digitală (MFCC + DTW) care detectează dacă melodiile tale au fost reproduse sau folosite pentru antrenarea modelelor AI. Certificate Human-Made și notificări takedown automate.',
  },
  {
    title: 'Catalog Muzical Complet',
    desc: 'Organizează piese și albume cu metadate profesionale: ISRC, BPM, tonalitate, durată. Player audio integrat și fingerprint calculat pentru fiecare piesă din catalog.',
  },
  {
    title: 'Contracte Asistate AI',
    desc: 'Creează contracte cu analiză AI care identifică clauze neobișnuite, sugerează termeni echitabili și estimează riscurile juridice înainte de semnare.',
  },
  {
    title: 'Royalties & Finanțe',
    desc: 'Urmărești venituri per distribuitor, artist și piesă. Calcul automat royalties, rapoarte detaliate și predicții AI pentru veniturile perioadelor viitoare.',
  },
  {
    title: 'A&R Scouting',
    desc: 'Descoperă artiști noi cu pipeline Kanban vizual și rapoarte AI de evaluare a potențialului. De la identificare la semnare, totul într-un singur flux.',
  },
  {
    title: 'Lansări & Promovare',
    desc: 'Planifică lansările cu checklist complet, generează automat comunicate de presă și planuri de promovare pe social media cu ajutorul AI.',
  },
]

const plans = [
  {
    name: 'Gratuit',
    price: '0€',
    period: '30 zile trial',
    features: ['3 artiști', '20 piese', 'Dashboard de bază', 'Fingerprint 5 piese'],
    highlight: false,
    cta: 'Începe gratuit',
  },
  {
    name: 'Pro',
    price: '30€',
    period: '/ lună',
    features: [
      '50 artiști',
      'Piese nelimitate',
      'A&R Scouting complet',
      'Fingerprint audio nelimitat',
      'Certificate Human-Made',
      'Notificări takedown AI',
      'Suport prioritar',
    ],
    highlight: true,
    cta: 'Alege Pro',
  },
  {
    name: 'Enterprise',
    price: '70€',
    period: '/ lună',
    features: [
      'Artiști nelimitați',
      'Piese nelimitate',
      'Toate funcționalitățile',
      'API detecție AI',
      'Suport dedicat 24/7',
      'White-label (brand propriu)',
    ],
    highlight: false,
    cta: 'Contactează-ne',
  },
]

// Barcode pentru certificat — lățimi variabile ale barelor
const BARCODE_WIDTHS = [2,1,3,2,1,4,2,1,3,1,2,4,1,3,2,1,4,3,2,1,3,2,4,1,2,3,1,4,2,1,3,2,1,4,2,3,1,2,4,1]
const BARCODE_GAP = 4
const BARCODE_START_X = 99
const barcodeBars = (() => {
  let x = BARCODE_START_X
  return BARCODE_WIDTHS.map((w) => { const bar = { x, w }; x += w + BARCODE_GAP; return bar })
})()

export default function LandingPage() {
  return (
    <div className={styles.landing}>

      {/* BUTON FLOTANT dreapta — fix pe scroll */}
      <div className={styles.floatingCtaWrapper}>
        <Link href="/register" className={styles.floatingCta}>
          Protejează-ți catalogul →
        </Link>
      </div>

      {/* NAVBAR */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <img
              src="/LOGO/logo3.svg"
              alt="SoundLedger"
              height={160}
              style={{ objectFit: 'contain', display: 'block', marginTop: 14.5 }}
            />
          </div>
          <div className={styles.navLinks}>
            <Link href="#features" className={styles.navLink}>Funcționalități</Link>
            <Link href="#pricing" className={styles.navLink}>Prețuri</Link>
            <Link href="/login" className={styles.navLink}>Conectare</Link>
            <Link href="/register" className="btn btn-primary">
              Începe gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <section className={styles.hero}>
        {/* Ambient blobs */}
        <div className={styles.heroBlob1} />
        <div className={styles.heroBlob2} />
        <div className={styles.heroBlob3} />

        <div className={styles.heroInner}>

          {/* TEXT — stânga */}
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Muzica ta.<br />
              <span className={styles.heroGradient}>Protejată.</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Prima platformă care combină managementul complet al casei de discuri
              cu detecție audio prin amprentare digitală.
            </p>

            <div className={styles.heroCta}>
              <Link href="/register" className={styles.ctaPrimary}>
                Protejează-ți catalogul
              </Link>
              <Link href="#features" className={styles.ctaSecondary}>
                Descoperă funcționalitățile
              </Link>
            </div>

          </div>

          {/* VISUAL — dreapta: Certificat Digital SVG */}
          <div className={styles.heroVisual} aria-hidden="true">
            <svg
              className={styles.heroSvg}
              viewBox="0 0 480 430"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Ambient glows */}
                <radialGradient id="cert_bv" cx="30%" cy="65%" r="55%">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="cert_bg" cx="72%" cy="28%" r="48%">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </radialGradient>
                {/* Card glow */}
                <filter id="cert_glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="12" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Subtle shadow for depth */}
                <filter id="cert_shadow" x="-10%" y="-10%" width="120%" height="130%">
                  <feDropShadow dx="0" dy="8" stdDeviation="18" floodColor="#000" floodOpacity="0.55" />
                </filter>
              </defs>

              {/* Ambient atmosphere */}
              <rect width="480" height="430" fill="url(#cert_bv)" />
              <rect width="480" height="430" fill="url(#cert_bg)" />

              {/* ── Card spate (rotit, decorativ) ── */}
              <rect
                x="82" y="56" width="308" height="306" rx="16"
                fill="rgba(139,92,246,0.06)"
                stroke="rgba(139,92,246,0.14)"
                strokeWidth="1"
                transform="rotate(5, 236, 209)"
              />

              {/* ── Card principal — corp ── */}
              <rect
                x="66" y="44" width="310" height="308" rx="16"
                fill="rgba(8,6,20,0.90)"
                stroke="rgba(139,92,246,0.30)"
                strokeWidth="1.5"
                filter="url(#cert_shadow)"
              />

              {/* Highlight interior sus (glassmorphism) */}
              <line x1="84" y1="45" x2="358" y2="45" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />

              {/* Tintă header */}
              <path
                d="M82,44 L358,44 Q376,44 376,60 L376,102 L66,102 L66,60 Q66,44 82,44 Z"
                fill="rgba(139,92,246,0.07)"
              />

              {/* ── HEADER ── */}
              {/* Diamant icon */}
              <text x="84" y="80" fill="#8B5CF6" fontSize="17" opacity="0.85">◈</text>
              {/* Titlu */}
              <text x="107" y="70" fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="monospace" letterSpacing="3">SOUNDLEDGER</text>
              <text x="107" y="84" fill="#8B5CF6" fontSize="9.5" fontFamily="monospace" letterSpacing="2" fontWeight="bold">CERTIFICATE</text>
              {/* Nr. certificat */}
              <text x="368" y="78" fill="rgba(255,255,255,0.22)" fontSize="8.5" fontFamily="monospace" textAnchor="end">#SL-2847</text>

              {/* Divider */}
              <line x1="66" y1="102" x2="376" y2="102" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

              {/* ── TRACK INFO ── */}
              <text x="84" y="130" fill="rgba(255,255,255,0.92)" fontSize="18" fontWeight="700">Noapte de vară</text>
              <text x="84" y="148" fill="rgba(200,198,188,0.45)" fontSize="11">The Motans · StefyMusic</text>

              {/* Badge ISRC */}
              <rect x="84" y="156" width="142" height="19" rx="5"
                fill="rgba(139,92,246,0.10)" stroke="rgba(139,92,246,0.28)" strokeWidth="0.8" />
              <text x="155" y="169" fill="rgba(139,92,246,0.88)" fontSize="9" fontFamily="monospace" textAnchor="middle">
                ISRC: ROA2024847201
              </text>

              {/* Divider */}
              <line x1="66" y1="184" x2="376" y2="184" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

              {/* ── BARCODE ── */}
              {barcodeBars.map(({ x, w }, i) => (
                <rect key={i} x={x} y={193} width={w} height={27}
                  fill="rgba(255,255,255,0.72)" rx={0.3} />
              ))}
              {/* Număr cod de bare */}
              <text x="221" y="231" fill="rgba(255,255,255,0.18)" fontSize="7.5"
                fontFamily="monospace" textAnchor="middle" letterSpacing="4">
                1 2 3 4 5 6 7 8 9 0 1 2
              </text>

              {/* Divider */}
              <line x1="66" y1="238" x2="376" y2="238" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

              {/* ── STATUS ROWS ── */}
              {/* Row 1 — EU AI ACT */}
              <circle cx="84" cy="260" r="9" fill="rgba(16,185,129,0.10)" stroke="#10B981" strokeWidth="0.8" strokeOpacity="0.5" />
              <path d="M80,260 L83,263 L89,257" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <text x="100" y="264" fill="rgba(255,255,255,0.88)" fontSize="11.5" fontWeight="600">EU AI ACT: COMPLIANT</text>
              <text x="368" y="264" fill="rgba(16,185,129,0.65)" fontSize="8.5" fontFamily="monospace" textAnchor="end">✓ VERIFIED</text>

              {/* Row 2 — OPT-OUT */}
              <circle cx="84" cy="284" r="9" fill="rgba(16,185,129,0.10)" stroke="#10B981" strokeWidth="0.8" strokeOpacity="0.5" />
              <path d="M80,284 L83,287 L89,281" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <text x="100" y="288" fill="rgba(255,255,255,0.88)" fontSize="11.5" fontWeight="600">OPT-OUT ACTIVE</text>
              <text x="368" y="288" fill="rgba(16,185,129,0.65)" fontSize="8.5" fontFamily="monospace" textAnchor="end">✓ VERIFIED</text>

              {/* Row 3 — HUMAN-MADE */}
              <circle cx="84" cy="308" r="9" fill="rgba(16,185,129,0.10)" stroke="#10B981" strokeWidth="0.8" strokeOpacity="0.5" />
              <path d="M80,308 L83,311 L89,305" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <text x="100" y="312" fill="rgba(255,255,255,0.88)" fontSize="11.5" fontWeight="600">HUMAN-MADE VERIFIED</text>
              <text x="368" y="312" fill="rgba(16,185,129,0.65)" fontSize="8.5" fontFamily="monospace" textAnchor="end">✓ VERIFIED</text>

              {/* Divider */}
              <line x1="66" y1="324" x2="376" y2="324" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

              {/* ── FOOTER ── */}
              <text x="84" y="342" fill="rgba(255,255,255,0.22)" fontSize="8.5" fontFamily="monospace">
                Emis: 27.05.2026 · SoundLedger
              </text>
              <text x="368" y="342" fill="rgba(139,92,246,0.42)" fontSize="8.5" fontFamily="monospace" textAnchor="end">
                0x7f3a...b9d2
              </text>

              {/* ── Elemente decorative externe ── */}
              {/* Accent dots — dreapta sus */}
              <circle cx="408" cy="72" r="4.5" fill="#F59E0B" fillOpacity="0.5" />
              <circle cx="422" cy="86" r="3" fill="#F59E0B" fillOpacity="0.32" />
              <circle cx="432" cy="66" r="2" fill="#F59E0B" fillOpacity="0.22" />

              {/* Accent dots — stânga jos */}
              <circle cx="44" cy="348" r="3.5" fill="#8B5CF6" fillOpacity="0.45" />
              <circle cx="32" cy="334" r="2.5" fill="#8B5CF6" fillOpacity="0.30" />
              <circle cx="54" cy="362" r="2" fill="#8B5CF6" fillOpacity="0.22" />

              {/* Badge plutitor "PROTECTED" — colț dreapta sus */}
              <rect x="322" y="22" width="110" height="24" rx="7"
                fill="rgba(245,158,11,0.08)" stroke="#F59E0B" strokeWidth="0.8" strokeOpacity="0.38" />
              <text x="377" y="38" fill="#F59E0B" fontSize="9.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                🛡 PROTECTED
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Instrumentele de care o casă de discuri modernă are nevoie</h2>
        <p className={styles.sectionSubtitle}>
          De la protecția drepturilor față de AI până la managementul zilnic. Totul într-un singur loc
        </p>
        <div className={styles.featuresGrid}>
          {features.map((f, i) => (
            <div key={i} className={styles.featureCard}>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── PRICING ───── */}
      <section id="pricing" className={styles.pricing}>
        <h2 className={styles.sectionTitle}>Investiție clară, valoare reală</h2>
        <p className={styles.sectionSubtitle}>Planuri adaptate pentru orice dimensiune de casă de discuri</p>
        <div className={styles.pricingGrid}>
          {plans.map((p, i) => (
            <div key={i} className={`${styles.pricingCard} ${p.highlight ? styles.pricingHighlight : ''}`}>
              {p.highlight && <div className={styles.pricingBadge}>Cel mai popular</div>}
              <h3 className={styles.pricingName}>{p.name}</h3>
              <div className={styles.pricingPrice}>
                <span className={styles.priceValue}>{p.price}</span>
                <span className={styles.pricePeriod}>{p.period}</span>
              </div>
              <ul className={styles.pricingFeatures}>
                {p.features.map((feat, j) => (
                  <li key={j}>{feat}</li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`btn ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <img
              src="/LOGO/logo3.svg"
              alt="SoundLedger"
              height={160}
              style={{ objectFit: 'contain', display: 'block', marginTop: 14.5 }}
            />
          </div>
          <p className={styles.footerText}>
            © 2026 SoundLedger · Protecție AI pentru muzica ta.
          </p>
        </div>
      </footer>
    </div>
  )
}
