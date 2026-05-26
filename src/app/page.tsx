import Link from 'next/link'
import styles from './landing.module.css'


export default function LandingPage() {
  return (
    <div className={styles.landing}>

      {/* BUTON FLOTANT dreapta */}
      <div className={styles.floatingCtaWrapper}>
        <Link href="/register" className={styles.floatingCta}>
          Înregistrează-ți casa de discuri!
        </Link>
      </div>

      {/* NAVBAR */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <img src="/LOGO/logo3.svg" alt="SoundLedger" height={160} style={{ objectFit: 'contain', display: 'block', marginTop: 14.5 }} />
          </div>
          <div className={styles.navLinks}>
            <Link href="#features" className={styles.navLink}>Funcționalități</Link>
            <Link href="#pricing" className={styles.navLink}>Prețuri</Link>
            <Link href="/login" className={styles.navLink}>Conectare</Link>
            <Link href="/register" className={`btn btn-primary`}>
              Începe gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroBlob1} />
        <div className={styles.heroBlob2} />

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Gestionează-ți cu inteligență
            <span className={styles.heroGradient}>casa de discuri</span>
          </h1>
          <p className={styles.heroSubtitle}>
            De la semnarea contractului până la primul royalty. Tot ce contează, într-un singur loc.
          </p>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>5</span>
              <span className={styles.heroStatLabel}>Roluri de utilizator</span>
            </div>
            <div className={styles.heroDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>AI</span>
              <span className={styles.heroStatLabel}>Insights inteligente</span>
            </div>
            <div className={styles.heroDivider} />
            <div className={styles.heroStat}>
              <span className={styles.heroStatValue}>360°</span>
              <span className={styles.heroStatLabel}>Management complet</span>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Tot ce ai nevoie, într-un singur loc</h2>
        <p className={styles.sectionSubtitle}>Funcționalități complete pentru managementul casei tale de discuri</p>
        <div className={styles.featuresGrid}>
          {[
            { title: 'Gestiune Artiști', desc: 'Profiluri detaliate, statistici de streaming, și analiză AI a potențialului fiecărui artist.' },
            { title: 'Catalog Muzical', desc: 'Organizează piese și albume, cu metadate complete, coduri ISRC, și player audio integrat.' },
            { title: 'Contracte Smart', desc: 'Creează contracte asistate de AI care evidențiază clauze neobișnuite și sugerează termeni echitabili.' },
            { title: 'Royalties & Finanțe', desc: 'Calcul automat al royalties, rapoarte de plată, predicții de venituri cu AI.' },
            { title: 'A&R Scouting', desc: 'Descoperă artiști noi cu pipeline Kanban și rapoarte AI de scouting automate.' },
          ].map((f, i) => (
            <div
              key={i}
              className={styles.featureCard}
            >
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className={styles.pricing}>
        <h2 className={styles.sectionTitle}>Planuri flexibile</h2>
        <p className={styles.sectionSubtitle}>Alege planul potrivit pentru dimensiunea casei tale de discuri</p>
        <div className={styles.pricingGrid}>
          {[
            { name: 'Gratuit', price: '0€', period: '30 zile', features: ['Max 3 artiști', 'Max 20 piese', 'Dashboard de bază', 'Fără AI insights'], highlight: false },
            { name: 'Pro', price: '30€', period: '/ lună', features: ['Max 50 artiști', 'Piese nelimitate', 'A&R Scouting', 'AI complet', 'Suport prioritar'], highlight: true },
            { name: 'Enterprise', price: '70€', period: '/ lună', features: ['Artiști nelimitați', 'Piese nelimitate', 'Toate funcționalitățile', 'Suport dedicat', 'API access'], highlight: false },
          ].map((p, i) => (
            <div key={i} className={`${styles.pricingCard} ${p.highlight ? styles.pricingHighlight : ''}`}>
              {p.highlight && <div className={styles.pricingBadge}>Cel mai popular</div>}
              <h3 className={styles.pricingName}>{p.name}</h3>
              <div className={styles.pricingPrice}>
                <span className={styles.priceValue}>{p.price}</span>
                <span className={styles.pricePeriod}>{p.period}</span>
              </div>
              <ul className={styles.pricingFeatures}>
                {p.features.map((f, j) => (
                  <li key={j}>{f}</li>
                ))}
              </ul>
              <Link href="/register" className={`btn ${p.highlight ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%' }}>
                {p.name === 'Gratuit' ? 'Începe gratuit' : 'Alege planul'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <img src="/LOGO/logo3.svg" alt="SoundLedger" height={160} style={{ objectFit: 'contain', display: 'block', marginTop: 14.5 }} />
          </div>
          <p className={styles.footerText}>
            © 2026 SoundLedger.
          </p>
        </div>
      </footer>
    </div>
  )
}
