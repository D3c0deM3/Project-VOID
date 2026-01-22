import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const OrbitField = () => {
  const mountRef = useRef(null)
  const hoverRef = useRef(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) {
      return undefined
    }

    let width = mount.clientWidth
    let height = mount.clientHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 40)
    camera.position.set(0, 0, 3.4)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    const count = 4800
    const basePositions = new Float32Array(count * 3)
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const seeds = new Float32Array(count)
    const offsets = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)

    for (let i = 0; i < count; i += 1) {
      const radius = 0.65 + Math.random() * 0.32
      const u = Math.random()
      const v = Math.random()
      const theta = u * Math.PI * 2
      const phi = Math.acos(2 * v - 1)
      const r = radius + Math.sin(u * 12.0) * 0.02
      const index = i * 3
      const px = r * Math.sin(phi) * Math.cos(theta)
      const py = r * Math.sin(phi) * Math.sin(theta)
      const pz = r * Math.cos(phi)
      basePositions[index] = px
      basePositions[index + 1] = py
      basePositions[index + 2] = pz
      positions[index] = px
      positions[index + 1] = py
      positions[index + 2] = pz
      scales[i] = 0.55 + Math.random() * 1.1
      seeds[i] = Math.random()
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uNoiseStrength: { value: 0.06 },
        uColor: { value: new THREE.Color('#ff3b4d') },
        uCold: { value: new THREE.Color('#4aa3ff') },
        uSize: { value: 12.5 },
        uHover: { value: 0 },
        uDrag: { value: 0 },
        uHoverTime: { value: 0 },
        uCursor: { value: new THREE.Vector3() },
        uCursorRadius: { value: 0.5 },
        uDragRadius: { value: 0.32 },
        uImpactPos: { value: new THREE.Vector3(0, 0, 0) },
        uImpactStrength: { value: 0 },
        uImpactRadius: { value: 0.35 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uNoiseStrength;
        uniform float uSize;
        uniform float uHover;
        uniform float uDrag;
        uniform float uHoverTime;
        uniform vec3 uCursor;
        uniform float uCursorRadius;
        uniform float uDragRadius;
        uniform vec3 uImpactPos;
        uniform float uImpactStrength;
        uniform float uImpactRadius;

        attribute float aScale;
        attribute float aSeed;

        varying float vDepth;
        varying float vNoise;
        varying float vImpact;
        varying float vSeed;
        varying float vVoid;

        float hash(vec3 p) {
          return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
        }

        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float n = mix(
            mix(
              mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
              mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x),
              f.y
            ),
            mix(
              mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
              mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x),
              f.y
            ),
            f.z
          );
          return n;
        }

        void main() {
          vec3 pos = position;
          float orbitSpeed = mix(0.05, 0.18, aSeed);
          float orbitAngle = uTime * orbitSpeed;
          mat2 orbitRot = mat2(cos(orbitAngle), -sin(orbitAngle), sin(orbitAngle), cos(orbitAngle));
          pos.xz = orbitRot * pos.xz;
          vec3 radial = normalize(pos);
          float breath = sin(uTime * 0.9 + aSeed * 6.0) * 0.018;
          pos += radial * breath;

          float noiseFreq = mix(1.7, 1.9, uHover);
          float n = noise(pos * noiseFreq + uTime * 0.2 + aSeed * 8.0);
          vNoise = n;
          float noiseStrength = uNoiseStrength + uHover * 0.05;
          pos += radial * (n - 0.5) * noiseStrength;

          vec3 tangent = normalize(cross(radial, vec3(0.0, 1.0, 0.0)));
          float drift = sin(uHoverTime * 1.6 + aSeed * 10.0) * uHover;
          pos += tangent * drift * 0.05;

          float chaos = uHover * 0.05;
          vec3 chaosVec = vec3(
            sin(uHoverTime * 2.1 + aSeed * 9.0),
            cos(uHoverTime * 1.7 + aSeed * 7.0),
            sin(uHoverTime * 1.9 + aSeed * 11.0)
          );
          pos += chaosVec * chaos;

          float cursorDist = distance(pos, uCursor);
          float cursorInfluence = smoothstep(uCursorRadius, 0.0, cursorDist) * uHover;
          vec3 cursorDir = normalize(pos - uCursor + 0.001);
          vec3 repel = cursorDir * cursorInfluence * 0.22;
          vec3 orbitSwirl = normalize(cross(cursorDir, vec3(0.0, 1.0, 0.0)));
          pos += orbitSwirl * cursorInfluence * 0.08;
          pos += repel;

          float dragInfluence = smoothstep(uDragRadius, 0.0, cursorDist) * uDrag;
          pos += (uCursor - pos) * dragInfluence * 0.55;

          float voidRadius = uCursorRadius * 0.6;
          vVoid = smoothstep(voidRadius, voidRadius * 1.25, cursorDist);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vDepth = clamp(1.7 - (-mvPosition.z) * 0.22, 0.0, 1.0);
          float impactDist = distance(pos, uImpactPos);
          vImpact = smoothstep(uImpactRadius, 0.0, impactDist) * uImpactStrength;
          vSeed = aSeed;
          gl_PointSize = uSize * aScale * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uCold;
        uniform float uTime;
        uniform float uHover;
        varying float vDepth;
        varying float vNoise;
        varying float vImpact;
        varying float vSeed;
        varying float vVoid;

        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          float alpha = smoothstep(0.7, 0.0, dist);
          float glow = smoothstep(0.75, 0.0, dist);
          float breathe = 0.5 + 0.5 * sin(uTime * 2.1 + vSeed * 6.0);
          vec3 activeColor = mix(uColor, uCold, uHover * 0.7);
          vec3 color = activeColor * (0.95 + 0.2 * breathe);
          color += uCold * (uHover * 0.18 + vNoise * 0.12);
          float finalAlpha = alpha * vDepth * vVoid;
          gl_FragColor = vec4(color, finalAlpha);
          gl_FragColor.rgb *= 1.15 + glow * (1.0 + vImpact * 0.8 + uHover * 0.2) * vVoid;
        }
      `,
    })

    const points = new THREE.Points(geometry, material)
    group.add(points)

    const clock = new THREE.Clock()
    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const pointer = new THREE.Vector2()
    const intersection = new THREE.Vector3()
    const cursorTarget = new THREE.Vector3()
    const cursor = new THREE.Vector3()
    const cursorLocal = new THREE.Vector3()
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let impactStrength = 0
    const impactPos = new THREE.Vector3()
    let hoverLevel = 0
    let hoverClock = 0
    let isDragging = false
    let activePointerId = null

    const onPointerMove = (event) => {
      const rect = mount.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const cx = rect.width / 2
      const cy = rect.height / 2
      const dx = x - cx
      const dy = y - cy
      const radius = Math.min(rect.width, rect.height) * 0.52
      const insideOrbit = dx * dx + dy * dy <= radius * radius
      hoverRef.current = insideOrbit
      if (!insideOrbit && !isDragging) {
        return
      }
      pointer.x = (x / rect.width) * 2 - 1
      pointer.y = -(y / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.ray.intersectPlane(plane, intersection)
      if (hit) {
        cursorTarget.copy(intersection)
      }
    }

    const onPointerDown = (event) => {
      if (event.button !== 0) {
        return
      }
      const rect = mount.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        return
      }
      const cx = rect.width / 2
      const cy = rect.height / 2
      const dx = x - cx
      const dy = y - cy
      const radius = Math.min(rect.width, rect.height) * 0.52
      if (dx * dx + dy * dy > radius * radius) {
        return
      }
      pointer.x = (x / rect.width) * 2 - 1
      pointer.y = -(y / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.ray.intersectPlane(plane, intersection)
      if (!hit) {
        return
      }
      isDragging = true
      activePointerId = event.pointerId
      mount.setPointerCapture(event.pointerId)
      hoverRef.current = true
      cursorTarget.copy(intersection)
      impactPos.copy(intersection)
      group.updateMatrixWorld()
      group.worldToLocal(impactPos)
      impactStrength = 0.7
    }

    const onPointerLeave = () => {
      hoverRef.current = false
    }

    const onPointerUp = (event) => {
      if (event.pointerId !== activePointerId) {
        return
      }
      isDragging = false
      activePointerId = null
      if (mount.hasPointerCapture(event.pointerId)) {
        mount.releasePointerCapture(event.pointerId)
      }
    }

    const onResize = () => {
      width = mount.clientWidth
      height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('resize', onResize)
    window.addEventListener('blur', onPointerLeave)
    document.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('pointercancel', onPointerLeave)

    let frameId = 0
    const animate = () => {
      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()
      const hovering = hoverRef.current || isDragging
      const hoverTarget = hovering ? 1 : 0
      const hoverEase = reducedMotion ? 0.03 : 0.08
      hoverLevel += (hoverTarget - hoverLevel) * hoverEase
      const hoverStrength = hoverLevel
      if (hovering) {
        hoverClock += delta
      } else {
        hoverClock = Math.max(hoverClock - delta * 2.4, 0)
      }

      const baseRotation = reducedMotion ? 0.04 : 0.1
      group.rotation.y = elapsed * baseRotation
      group.rotation.x = -0.2 + Math.sin(elapsed * 0.2) * 0.08
      group.updateMatrixWorld()

      if (hovering) {
        const cursorEase = reducedMotion ? 0.06 : 0.12
        cursor.lerp(cursorTarget, cursorEase)
        cursorLocal.copy(cursor)
        group.worldToLocal(cursorLocal)
      }

      material.uniforms.uTime.value = elapsed
      material.uniforms.uNoiseStrength.value = 0.05 + hoverStrength * 0.04
      material.uniforms.uHover.value = hoverStrength
      material.uniforms.uDrag.value = isDragging ? 1 : 0
      material.uniforms.uHoverTime.value = hoverClock
      material.uniforms.uCursor.value.copy(cursorLocal)
      material.uniforms.uImpactPos.value.copy(impactPos)
      material.uniforms.uImpactStrength.value = impactStrength

      if (impactStrength > 0) {
        impactStrength = Math.max(impactStrength - delta * 1.2, 0)
      }

      const spring = reducedMotion ? 5.6 : 7.8
      const damping = reducedMotion ? 0.88 : 0.85
      const maxOffset = 0.26
      const maxVelocity = 2.2

      for (let i = 0; i < count; i += 1) {
        const index = i * 3
        const ox = offsets[index]
        const oy = offsets[index + 1]
        const oz = offsets[index + 2]

        velocities[index] += -ox * spring * delta
        velocities[index + 1] += -oy * spring * delta
        velocities[index + 2] += -oz * spring * delta

        velocities[index] *= damping
        velocities[index + 1] *= damping
        velocities[index + 2] *= damping

        const velMag = Math.sqrt(
          velocities[index] * velocities[index] +
            velocities[index + 1] * velocities[index + 1] +
            velocities[index + 2] * velocities[index + 2],
        )
        if (velMag > maxVelocity) {
          const scale = maxVelocity / velMag
          velocities[index] *= scale
          velocities[index + 1] *= scale
          velocities[index + 2] *= scale
        }

        offsets[index] += velocities[index] * delta
        offsets[index + 1] += velocities[index + 1] * delta
        offsets[index + 2] += velocities[index + 2] * delta

        const offMag = Math.sqrt(
          offsets[index] * offsets[index] +
            offsets[index + 1] * offsets[index + 1] +
            offsets[index + 2] * offsets[index + 2],
        )
        if (offMag > maxOffset) {
          const scale = maxOffset / offMag
          offsets[index] *= scale
          offsets[index + 1] *= scale
          offsets[index + 2] *= scale
        }

        positions[index] = basePositions[index] + offsets[index]
        positions[index + 1] = basePositions[index + 1] + offsets[index + 1]
        positions[index + 2] = basePositions[index + 2] + offsets[index + 2]
      }

      geometry.attributes.position.needsUpdate = true

      camera.position.z = 3.4
      camera.position.y = 0
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('blur', onPointerLeave)
      document.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('pointercancel', onPointerLeave)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div className="orbit-layer" ref={mountRef} aria-hidden="true" />
}

export default OrbitField
