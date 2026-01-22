import { useEffect, useRef, useState } from 'react'
import IntroSequence from './IntroSequence'
import OrbitField from './OrbitField'
import './App.css'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const getInitialIntroState = () => {
  if (typeof window === 'undefined') {
    return 'done'
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) {
    return 'done'
  }
  const played = window.sessionStorage.getItem('introPlayed') === '1'
  return played ? 'done' : 'active'
}

function App() {
  const [introState, setIntroState] = useState(getInitialIntroState)
  const orbitHeroRef = useRef(null)

  useEffect(() => {
    const sections = document.querySelectorAll('.section')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting)
        })
      },
      { threshold: 0.2 },
    )
    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])


  useEffect(() => {
    if (introState !== 'done') {
      document.body.classList.add('intro-lock')
    } else {
      document.body.classList.remove('intro-lock')
    }
  }, [introState])

  useEffect(() => {
    const parallaxItems = document.querySelectorAll('[data-depth]')
    let frame = 0

    const update = () => {
      const scrollY = window.scrollY
      parallaxItems.forEach((item) => {
        const depth = Number(item.dataset.depth || 0)
        const offset = clamp(scrollY * depth * -0.08, -60, 60)
        item.style.setProperty('--parallax', `${offset}px`)
      })
      frame = 0
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const handleIntroHandoff = () => {
    setIntroState('handoff')
  }

  const handleIntroComplete = () => {
    setIntroState('done')
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('introPlayed', '1')
    }
  }

  const appClasses = ['app']
  if (introState === 'active') {
    appClasses.push('intro-active')
  }
  if (introState === 'handoff') {
    appClasses.push('intro-handoff')
  }

  return (
    <div className={appClasses.join(' ')}>
      {introState !== 'done' && (
        <IntroSequence
          onHandoff={handleIntroHandoff}
          onComplete={handleIntroComplete}
          targetRef={orbitHeroRef}
        />
      )}
      <div className="fx-layer fx-grid" aria-hidden="true" />
      <div className="fx-layer fx-scan" aria-hidden="true" />
      <div className="fx-layer fx-noise" aria-hidden="true" />

      <header className="top-nav">
        <div className="brand">
          <div className="brand-mark">VOID</div>
          <div className="brand-name">VOID</div>
        </div>
        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#overview">Overview</a>
          <a href="#platform">Platform</a>
          <a href="#matrix">Matrix</a>
          <a href="#response">Response</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="nav-ops">
          <span className="status-dot" />
          <span>Secure Link</span>
        </div>
      </header>

      <main>
        <section id="home" className="section hero hero-primary" data-index="00">
          <div className="section-grid intro-grid">
            <div className="intro-left">
              {/* <div className="micro-label subtle">VOID</div> */}
              <div
                className="orbit-hero parallax"
                data-depth="0.2"
                ref={orbitHeroRef}
              >
                <OrbitField />
              </div>
              <div className="intro-foot">
                <span>On Orbit</span>
                <span>Telemetry Cloud</span>
              </div>
            </div>
            <div className="intro-right">
              <div className="intro-kicker">CRO // 01</div>
              <h1 className="intro-title">Real-Time AI-Powered Alarms</h1>
              <p className="intro-body">
                CROO&apos;s AI monitors telemetry in near real time, detecting
                anomalies faster than human operators and triggering alarms
                within seconds. This response protects assets from intrusion
                attempts, subsystem breaches, and physical compromise.
              </p>
              <div className="intro-meta">
                <span>Alert Latency 06s</span>
                <span>Risk Level Alpha</span>
              </div>
            </div>
          </div>
        </section>

        <section id="overview" className="section hero" data-index="01">
          <div className="section-grid hero-grid">
            <div className="hero-left">
              <div className="micro-label">Cyber Ops // Orbital Sentinel</div>
              <h1>
                Real-Time AI
                <span> Threat Orbit</span>
              </h1>
              <p className="lede">
                Continuous telemetry fusion, anomaly prediction, and rapid
                containment built for defense-grade cyber operations. Every
                signal is monitored, weighted, and acted on in seconds.
              </p>
              <div className="cta-row">
                <a className="btn primary" href="#contact">
                  Request Access
                </a>
                <a className="btn ghost" href="#platform">
                  View Platform
                </a>
              </div>
              <div className="hero-meta">
                <div className="meta-item">
                  <span className="meta-label">Coverage</span>
                  <span className="meta-value">24/7</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Latency</span>
                  <span className="meta-value">38ms</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Recall</span>
                  <span className="meta-value">99.2%</span>
                </div>
              </div>
            </div>
            <div className="hero-right">
              <div className="panel panel-glow parallax" data-depth="0.25">
                <div className="panel-label">Live Telemetry Cloud</div>
                <p>
                  Thousands of orbital nodes form a real-time spherical mesh.
                  Cursor proximity bends the field, revealing hidden threat
                  vectors in motion.
                </p>
                <div className="panel-foot">
                  <span>Orbit Sweep 92%</span>
                  <span>Node Sync 11ms</span>
                </div>
              </div>
              <div className="panel panel-outline parallax" data-depth="0.15">
                <div className="panel-label">Threat Posture</div>
                <ul className="panel-list">
                  <li>Adaptive deception mesh</li>
                  <li>Quantum signal correlation</li>
                  <li>Distributed kill-chain lock</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="hero-rail">
            <span>Command Layer</span>
            <div className="rail-line" />
            <span>Node 07</span>
          </div>
        </section>

        <section id="platform" className="section platform" data-index="02">
          <div className="section-grid split-grid">
            <div className="section-heading parallax" data-depth="0.4">
              <div className="micro-label">Platform / Command Fabric</div>
              <h2>Defense-grade intelligence, built to dominate the dark net.</h2>
              <p>
                Nexus Orbit synchronizes raw telemetry, satellite vectors, and
                endpoint behavior into a single operational fabric with
                continuous validation and audit-grade traceability.
              </p>
              <div className="callout">
                <div className="callout-label">Active Modules</div>
                <div className="tag-row">
                  <span>Signal Forge</span>
                  <span>Ghost Sentinel</span>
                  <span>Pulse Vault</span>
                </div>
              </div>
            </div>
            <div className="panel-stack parallax" data-depth="0.2">
              <div className="panel">
                <div className="panel-label">Operational Stack</div>
                <ul className="panel-list">
                  <li>Orbit telemetry ingestion</li>
                  <li>Autonomous risk scoring</li>
                  <li>Adaptive response playbooks</li>
                  <li>Encrypted mission ledger</li>
                </ul>
              </div>
              <div className="panel panel-glow">
                <div className="panel-label">Field Integrity</div>
                <div className="metric-grid">
                  <div>
                    <span className="metric-value">6.4M</span>
                    <span className="metric-label">Signals / min</span>
                  </div>
                  <div>
                    <span className="metric-value">0.02</span>
                    <span className="metric-label">False Positives</span>
                  </div>
                  <div>
                    <span className="metric-value">183</span>
                    <span className="metric-label">Assets Protected</span>
                  </div>
                  <div>
                    <span className="metric-value">07</span>
                    <span className="metric-label">Orbit Rings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="matrix" className="section matrix" data-index="03">
          <div className="section-grid matrix-grid">
            <div className="section-heading">
              <div className="micro-label">Detection / Threat Matrix</div>
              <h2>Machine-fused anomalies before they breach containment.</h2>
              <p>
                Every packet, credential, and subsystem pulse is tracked against
                the orbital matrix, giving operators instant threat scoring with
                cinematic clarity.
              </p>
            </div>
            <div className="data-grid parallax" data-depth="0.3">
              <div className="data-tile">
                <span className="tile-label">Signal Drift</span>
                <span className="tile-value">-0.18%</span>
                <span className="tile-meta">Stability locked</span>
              </div>
              <div className="data-tile">
                <span className="tile-label">Hostile Echo</span>
                <span className="tile-value">03</span>
                <span className="tile-meta">Under watch</span>
              </div>
              <div className="data-tile">
                <span className="tile-label">Orbit Density</span>
                <span className="tile-value">7.2k</span>
                <span className="tile-meta">Nodes active</span>
              </div>
              <div className="data-tile">
                <span className="tile-label">Vector Score</span>
                <span className="tile-value">91.4</span>
                <span className="tile-meta">Threat posture</span>
              </div>
            </div>
          </div>
        </section>

        <section id="response" className="section response" data-index="04">
          <div className="section-grid response-grid">
            <div className="panel command-panel parallax" data-depth="0.2">
              <div className="panel-label">Response Protocol</div>
              <ol className="protocol-list">
                <li>Sensor fusion validates anomalies.</li>
                <li>Orbital mesh isolates attack vectors.</li>
                <li>Autonomous countermeasures deploy.</li>
                <li>Command logs lock and archive.</li>
              </ol>
              <div className="panel-foot">
                <span>Playbook: Black-Atlas</span>
                <span>Auto Engage: Armed</span>
              </div>
            </div>
            <div className="response-cards parallax" data-depth="0.45">
              <div className="panel panel-glow">
                <div className="panel-label">Operator Console</div>
                <p>
                  Cinematic, data-dense surfaces with inertial motion keep
                  analysts locked on mission-critical telemetry.
                </p>
              </div>
              <div className="panel panel-outline">
                <div className="panel-label">System Awareness</div>
                <p>
                  Depth-linked camera shifts track sector changes while HUD
                  sweeps confirm section transitions.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="section contact" data-index="05">
          <div className="section-grid contact-grid">
            <div className="section-heading">
              <div className="micro-label">Contact / Secure Channel</div>
              <h2>Request clearance. Activate the orbit.</h2>
              <p>
                Enter a secured contact channel and an operator will respond
                with onboarding protocols and system requirements.
              </p>
            </div>
            <form
              className="panel contact-form"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="panel-label">Encrypted Link</div>
              <label className="input-label" htmlFor="contact-email">
                Enter command email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                placeholder="name@secure-node.io"
                required
              />
              <button className="btn primary" type="submit">
                Transmit Request
              </button>
              <div className="form-foot">
                <span>Transmission: AES-256</span>
                <span>Response SLA: 12h</span>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>(c) 2026 Nexus Orbit. All rights reserved.</div>
        <div className="footer-links">
          <span>Privacy</span>
          <span>Terms</span>
          <span>Operations</span>
        </div>
      </footer>
    </div>
  )
}

export default App
