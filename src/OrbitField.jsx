import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const OrbitField = () => {
  const mountRef = useRef(null)

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
        uCursor: { value: new THREE.Vector3(0, 0, 2.8) },
        uForce: { value: 0.35 },
        uNoiseStrength: { value: 0.12 },
        uColor: { value: new THREE.Color('#ff3b4d') },
        uSize: { value: 12.5 },
        uImpactPos: { value: new THREE.Vector3(0, 0, 0) },
        uImpactStrength: { value: 0 },
        uImpactRadius: { value: 0.35 },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec3 uCursor;
        uniform float uForce;
        uniform float uNoiseStrength;
        uniform float uSize;
        uniform vec3 uImpactPos;
        uniform float uImpactStrength;
        uniform float uImpactRadius;

        attribute float aScale;
        attribute float aSeed;

        varying float vDepth;
        varying float vNoise;
        varying float vImpact;

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
          float n = noise(pos * 1.7 + uTime * 0.35 + aSeed * 8.0);
          vNoise = n;
          vec3 radial = normalize(pos);
          pos += radial * (n - 0.5) * uNoiseStrength;

          float dist = distance(pos, uCursor);
          float influence = smoothstep(1.0, 0.2, dist);
          vec3 repel = normalize(pos - uCursor) * influence * uForce;
          pos += repel;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vDepth = clamp(1.7 - (-mvPosition.z) * 0.22, 0.0, 1.0);
          float impactDist = distance(pos, uImpactPos);
          vImpact = smoothstep(uImpactRadius, 0.0, impactDist) * uImpactStrength;
          gl_PointSize = uSize * aScale * (1.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vDepth;
        varying float vNoise;
        varying float vImpact;

        void main() {
          float dist = distance(gl_PointCoord, vec2(0.5));
          float alpha = smoothstep(0.7, 0.0, dist);
          float glow = smoothstep(0.75, 0.0, dist);
          vec3 color = uColor + vNoise * vec3(0.18, 0.05, 0.04);
          gl_FragColor = vec4(color, alpha * vDepth);
          gl_FragColor.rgb *= 1.2 + glow * (1.1 + vImpact * 0.9);
        }
      `,
    })

    const points = new THREE.Points(geometry, material)
    group.add(points)

    const clock = new THREE.Clock()
    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const pointer = new THREE.Vector2()
    const cursorTarget = new THREE.Vector3(0, 0, 2.8)
    const cursor = new THREE.Vector3(0, 0, 2.8)
    const intersection = new THREE.Vector3()
    const scroll = { target: 0, current: 0 }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let impactStrength = 0
    const impactPos = new THREE.Vector3()

    const updateScrollTarget = () => {
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1)
      scroll.target = window.scrollY / maxScroll
    }
    updateScrollTarget()

    const onPointerMove = (event) => {
      const rect = mount.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        cursorTarget.set(0, 0, 2.8)
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
      pointer.x = (x / rect.width) * 2 - 1
      pointer.y = -(y / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.ray.intersectPlane(plane, intersection)
      if (!hit) {
        return
      }
      impactPos.copy(intersection)
      impactStrength = 1

      const radius = 0.35
      const strength = 1.4
      for (let i = 0; i < count; i += 1) {
        const index = i * 3
        const px = positions[index]
        const py = positions[index + 1]
        const pz = positions[index + 2]
        const dx = px - impactPos.x
        const dy = py - impactPos.y
        const dz = pz - impactPos.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist > radius) {
          continue
        }
        const falloff = 1 - dist / radius
        const dirScale = dist < 0.001 ? 1 : 1 / dist
        velocities[index] += dx * dirScale * strength * falloff
        velocities[index + 1] += dy * dirScale * strength * falloff
        velocities[index + 2] += dz * dirScale * strength * falloff
      }
    }

    const onPointerLeave = () => {
      cursorTarget.set(0, 0, 2.8)
    }

    const onResize = () => {
      width = mount.clientWidth
      height = mount.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      updateScrollTarget()
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', updateScrollTarget, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('blur', onPointerLeave)
    document.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('pointercancel', onPointerLeave)

    let frameId = 0
    const animate = () => {
      const delta = clock.getDelta()
      const elapsed = clock.getElapsedTime()
      const scrollEase = reducedMotion ? 0.03 : 0.08
      const cursorEase = reducedMotion ? 0.05 : 0.1

      scroll.current += (scroll.target - scroll.current) * scrollEase
      cursor.lerp(cursorTarget, cursorEase)

      material.uniforms.uTime.value = elapsed
      material.uniforms.uCursor.value.copy(cursor)
      material.uniforms.uForce.value = 0.32 + scroll.current * 0.12
      material.uniforms.uImpactPos.value.copy(impactPos)
      material.uniforms.uImpactStrength.value = impactStrength

      if (impactStrength > 0) {
        impactStrength = Math.max(impactStrength - delta * 1.2, 0)
      }

      const spring = reducedMotion ? 5.2 : 7.4
      const damping = reducedMotion ? 0.88 : 0.84

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

        offsets[index] += velocities[index] * delta
        offsets[index + 1] += velocities[index + 1] * delta
        offsets[index + 2] += velocities[index + 2] * delta

        positions[index] = basePositions[index] + offsets[index]
        positions[index + 1] = basePositions[index + 1] + offsets[index + 1]
        positions[index + 2] = basePositions[index + 2] + offsets[index + 2]
      }

      geometry.attributes.position.needsUpdate = true

      const baseRotation = reducedMotion ? 0.04 : 0.12
      group.rotation.y = elapsed * baseRotation + scroll.current * 0.3
      group.rotation.x = -0.2 + Math.sin(elapsed * 0.2) * 0.08 - scroll.current * 0.2
      group.position.y = -scroll.current * 0.2
      camera.position.z = 3.4 + scroll.current * 0.4
      camera.position.y = scroll.current * 0.18
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', updateScrollTarget)
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
