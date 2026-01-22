import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const IntroSequence = ({ onComplete, onHandoff, targetRef }) => {
  const mountRef = useRef(null)
  const overlayRef = useRef(null)
  const completeTriggered = useRef(false)
  const handoffTriggered = useRef(false)
  const doodleShown = useRef(false)
  const blinkTriggered = useRef(false)
  const scatterTriggered = useRef(false)
  const lockTriggered = useRef(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) {
      return undefined
    }

    let width = mount.clientWidth
    let height = mount.clientHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 80)
    camera.position.set(0, 0, 6.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const buildDoodlePoints = (total) => {
      const size = 220
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const positions = new Float32Array(total * 3)
      const delays = new Float32Array(total)

      const fallback = () => {
        for (let i = 0; i < total; i += 1) {
          const angle = Math.random() * Math.PI * 2
          const radius = 0.35 + Math.random() * 0.45
          const index = i * 3
          positions[index] = Math.cos(angle) * radius
          positions[index + 1] = Math.sin(angle) * radius
          positions[index + 2] = (Math.random() - 0.5) * 0.08
          delays[i] = Math.random() * 0.3
        }
      }

      if (!ctx) {
        fallback()
        return { positions, delays }
      }

      ctx.clearRect(0, 0, size, size)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 10
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      ctx.arc(size * 0.5, size * 0.5, size * 0.34, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(size * 0.42, size * 0.5, size * 0.03, 0, Math.PI * 2)
      ctx.arc(size * 0.58, size * 0.5, size * 0.03, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(size * 0.4, size * 0.67)
      ctx.quadraticCurveTo(size * 0.5, size * 0.72, size * 0.6, size * 0.67)
      ctx.stroke()

      const data = ctx.getImageData(0, 0, size, size).data
      const samples = []
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const alpha = data[(y * size + x) * 4 + 3]
          if (alpha > 12) {
            samples.push([x, y])
          }
        }
      }

      if (!samples.length) {
        fallback()
        return { positions, delays }
      }

      const originX = size * 0.6
      const originY = size * 0.5
      const maxDist = Math.hypot(size * 0.5, size * 0.5)
      const scale = 1.1

      for (let i = 0; i < total; i += 1) {
        const pick = samples[Math.floor(Math.random() * samples.length)]
        const px = pick[0]
        const py = pick[1]
        const index = i * 3
        const nx = (px / size - 0.5) * 2
        const ny = (0.5 - py / size) * 2
        positions[index] = nx * scale
        positions[index + 1] = ny * scale
        positions[index + 2] = (Math.random() - 0.5) * 0.08
        const dist = Math.hypot(px - originX, py - originY)
        delays[i] = (dist / maxDist) * 0.32 + Math.random() * 0.04
      }

      return { positions, delays }
    }

    const count = 9200
    const { positions: doodlePositions, delays: doodleDelays } = buildDoodlePoints(count)
    const basePositions = new Float32Array(count * 3)
    const directions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const seeds = new Float32Array(count)

    for (let i = 0; i < count; i += 1) {
      const radius = 0.95 + Math.random() * 0.55
      const u = Math.random()
      const v = Math.random()
      const theta = u * Math.PI * 2
      const phi = Math.acos(2 * v - 1)
      const index = i * 3
      basePositions[index] = radius * Math.sin(phi) * Math.cos(theta)
      basePositions[index + 1] = radius * Math.sin(phi) * Math.sin(theta)
      basePositions[index + 2] = radius * Math.cos(phi)

      const dirU = Math.random()
      const dirV = Math.random()
      const dirTheta = dirU * Math.PI * 2
      const dirPhi = Math.acos(2 * dirV - 1)
      directions[index] = Math.sin(dirPhi) * Math.cos(dirTheta)
      directions[index + 1] = Math.sin(dirPhi) * Math.sin(dirTheta)
      directions[index + 2] = Math.cos(dirPhi)

      scales[i] = 0.85 + Math.random() * 1.7
      seeds[i] = Math.random()
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(doodlePositions, 3))
    geometry.setAttribute('aBase', new THREE.BufferAttribute(basePositions, 3))
    geometry.setAttribute('aDoodle', new THREE.BufferAttribute(doodlePositions, 3))
    geometry.setAttribute('aDir', new THREE.BufferAttribute(directions, 3))
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geometry.setAttribute('aDelay', new THREE.BufferAttribute(doodleDelays, 1))

    const doodleTime = 0.55
    const blinkTime = 1.35
    const scatterTime = 1.7
    const lockTime = 3.3
    const handoffTime = 4.4
    const completeTime = 6.2

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ff2d3d') },
        uSize: { value: 19.0 },
        uScatter: { value: scatterTime },
        uTilt: { value: 0 },
        uYaw: { value: 0 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uSize;
        uniform float uScatter;
        uniform float uTilt;
        uniform float uYaw;

        attribute vec3 aBase;
        attribute vec3 aDoodle;
        attribute vec3 aDir;
        attribute float aScale;
        attribute float aSeed;
        attribute float aDelay;

        varying float vAlpha;
        varying float vGlow;

        float easeOutCubic(float t) {
          return 1.0 - pow(1.0 - t, 3.0);
        }

        float easeInOutCubic(float t) {
          return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
        }

        vec3 rotateZ(vec3 v, float angle) {
          float s = sin(angle);
          float c = cos(angle);
          return vec3(c * v.x - s * v.y, s * v.x + c * v.y, v.z);
        }

        vec3 rotateY(vec3 v, float angle) {
          float s = sin(angle);
          float c = cos(angle);
          return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z);
        }

        void main() {
          float t = max(uTime - uScatter - aDelay, 0.0);
          float ignite = smoothstep(0.0, 0.7, t);
          float burst = smoothstep(0.0, 0.45, t);
          float spread = smoothstep(0.18, 0.75, t);
          float regroup = smoothstep(0.55, 1.25, t);
          float settle = smoothstep(1.0, 1.6, t);

          float burstEase = easeOutCubic(burst);
          float spreadEase = easeOutCubic(spread);
          float regroupEase = easeInOutCubic(regroup);
          float settleEase = easeInOutCubic(settle);
          float variance = mix(0.85, 1.15, aSeed);

          vec3 doodlePos = aDoodle;
          float tilt = uTilt * (1.0 - regroupEase);
          float yaw = uYaw * (1.0 - regroupEase);
          doodlePos = rotateZ(doodlePos, tilt);
          doodlePos = rotateY(doodlePos, yaw);

          vec3 dir = normalize(mix(aDir, normalize(doodlePos + 0.001), 0.35));

          float explodeRadius = mix(0.02, 6.4, burstEase);
          float spreadRadius = mix(6.4, 10.2, spreadEase);
          float travelRadius = mix(explodeRadius, spreadRadius, spreadEase);

          vec3 explosionPos = dir * travelRadius * variance;
          vec3 pos = mix(doodlePos, explosionPos, burstEase);
          pos = mix(pos, explosionPos, spreadEase);

          float escapeMask = step(0.7, aSeed);
          float returnMask = 1.0 - escapeMask;
          float escapeDrift = smoothstep(0.8, 2.2, t);
          vec3 escapePos = explosionPos + dir * (spreadRadius * 0.9 + escapeDrift * 4.0);

          vec3 regroupTarget = mix(escapePos, aBase, returnMask);
          pos = mix(pos, regroupTarget, regroupEase);
          pos = mix(pos, aBase, settleEase * returnMask);

          float orbitScale = mix(1.85, 1.0, settleEase);
          pos *= mix(1.0, orbitScale, returnMask);

          vec3 swirlAxis = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
          float swirl = (1.0 - regroupEase) * sin(t * 1.2 + aSeed * 8.0) * 0.35;
          pos += swirlAxis * swirl;

          float jitter = sin(t * 1.1 + aSeed * 10.0) * 0.025;
          pos += normalize(pos + 0.001) * jitter * (1.0 - regroupEase);

          float winkKick = (1.0 - aDelay) * smoothstep(0.0, 0.5, t) * (1.0 - regroupEase);
          pos += normalize(vec3(0.8, 0.2, 0.1)) * winkKick * 0.3;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float depthFade = clamp(2.4 - (-mvPosition.z) * 0.2, 0.0, 1.0);
          float appear = smoothstep(-0.1, 0.35, t);
          float burstMask = smoothstep(0.0, 0.3, t);
          vAlpha = min(depthFade * appear * 1.6, 1.0) * burstMask;
          vGlow = ignite;
          float sizeBoost = mix(1.5, 1.0, settleEase);
          gl_PointSize = uSize * aScale * sizeBoost * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;

        varying float vAlpha;
        varying float vGlow;

        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          float core = smoothstep(0.75, 0.0, dist);
          float glow = smoothstep(1.0, 0.0, dist);
          vec3 color = uColor;
          float alpha = core * vAlpha;
          gl_FragColor = vec4(color, alpha);
          gl_FragColor.rgb += color * glow * (0.5 + 0.7 * vGlow);
        }
      `,
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false
    scene.add(points)

    const clock = new THREE.Clock()

    const handleResize = () => {
      width = mount.clientWidth
      height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    window.addEventListener('resize', handleResize)

    let frameId = 0

    const setHandoffTransform = () => {
      const overlay = overlayRef.current
      const target = targetRef?.current
      if (!overlay || !target) {
        return
      }
      const overlayRect = overlay.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      const overlayCenterX = overlayRect.left + overlayRect.width / 2
      const overlayCenterY = overlayRect.top + overlayRect.height / 2
      const targetCenterX = targetRect.left + targetRect.width / 2
      const targetCenterY = targetRect.top + targetRect.height / 2
      const translateX = targetCenterX - overlayCenterX
      const translateY = targetCenterY - overlayCenterY
      const scale = Math.min(
        targetRect.width / overlayRect.width,
        targetRect.height / overlayRect.height,
      )
      overlay.style.setProperty('--intro-x', `${translateX}px`)
      overlay.style.setProperty('--intro-y', `${translateY}px`)
      overlay.style.setProperty('--intro-scale', `${scale}`)
    }

    const animate = () => {
      const elapsed = clock.getElapsedTime()
      material.uniforms.uTime.value = elapsed

      const orbitTime = Math.max(elapsed - scatterTime, 0)
      points.rotation.y = orbitTime * 0.08
      points.rotation.x = Math.sin(orbitTime * 0.2) * 0.1

      const winkStart = blinkTime - 0.1
      const winkEnd = blinkTime + 0.4
      const winkProgress = Math.min(
        Math.max((elapsed - winkStart) / (winkEnd - winkStart), 0),
        1,
      )
      const winkCurve = Math.sin(winkProgress * Math.PI)
      material.uniforms.uTilt.value = winkCurve * 0.08
      material.uniforms.uYaw.value = winkCurve * 0.05

      const overlay = overlayRef.current
      if (overlay) {
        if (!doodleShown.current && elapsed > doodleTime) {
          doodleShown.current = true
          overlay.classList.add('intro-show-doodle')
        }
        if (!blinkTriggered.current && elapsed > blinkTime) {
          blinkTriggered.current = true
          overlay.classList.add('intro-blink')
        }
        if (!scatterTriggered.current && elapsed > scatterTime) {
          scatterTriggered.current = true
          overlay.classList.add('intro-scatter')
        }
        if (!lockTriggered.current && elapsed > lockTime) {
          lockTriggered.current = true
          overlay.classList.add('intro-lock')
        }
      }

      if (!handoffTriggered.current && elapsed > handoffTime) {
        handoffTriggered.current = true
        if (onHandoff) {
          onHandoff()
        }
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(setHandoffTransform)
        })
      }

      if (!completeTriggered.current && elapsed > completeTime) {
        completeTriggered.current = true
        if (onComplete) {
          onComplete()
        }
      }

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [onComplete, onHandoff, targetRef])

  return (
    <div className="intro-overlay" ref={overlayRef} aria-hidden="true">
      <div className="intro-noise" />
      <div className="intro-scanline" />
      <div className="intro-orbit">
        <div className="intro-canvas" ref={mountRef} />
        <div className="intro-void">VOID</div>
        <div className="intro-void-snap" />
      </div>
      <div className="intro-doodle">
        <div className="intro-pulse" />
        <div className="intro-dust" />
        <div className="intro-dust intro-dust-secondary" />
        <div className="intro-doodle-face">
          <div className="intro-doodle-tilt">
            <svg viewBox="0 0 120 120" role="presentation" aria-hidden="true">
              <circle cx="60" cy="60" r="44" className="doodle-stroke" />
              <circle cx="42" cy="58" r="5" className="doodle-eye-left" />
              <circle cx="78" cy="58" r="5" className="doodle-eye-right" />
              <line x1="72" y1="58" x2="88" y2="58" className="doodle-eye-wink" />
              <path
                d="M48 80 Q60 86 72 80"
                className="doodle-stroke doodle-mouth"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IntroSequence
