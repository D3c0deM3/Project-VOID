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
        </nav>
        <div className="nav-ops">
          <span className="status-dot" />
          <span>Secure Link</span>
        </div>
      </header>

      <main>
        <section
          id="home"
          className="section hero hero-primary is-visible"
          data-index="00"
        >
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
              <h1 className="intro-title">TIME KILLS CONTEXT</h1>
              <form
                className="intro-input"
                onSubmit={(event) => event.preventDefault()}
              >
                <label className="input-label" htmlFor="hero-email">
                  Request Secure Access
                </label>
                <div className="intro-input-row">
                  <input
                    id="hero-email"
                    name="email"
                    type="email"
                    placeholder="name@secure-node.io"
                    required
                  />
                  <button className="btn primary" type="submit">
                    Transmit
                  </button>
                </div>
                <div className="intro-input-foot">
                  <span>Encrypted Link</span>
                  <span>Response SLA 12h</span>
                </div>
              </form>
              <div className="intro-meta">
                <span>Alert Latency 06s</span>
                <span>Risk Level Alpha</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
