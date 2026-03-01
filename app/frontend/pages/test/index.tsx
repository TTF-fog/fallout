import { useState, useEffect, useMemo } from 'react'

const HORIZON_PCT = 0
const PERSPECTIVE = 800
const MAX_WIDTH = 1152 // 6xl
const GROUND_ANGLE = 60 // degrees
const LANES = 3
const BILLBOARD_COUNT = 20
const BILLBOARD_H = 300
const BILLBOARD_Y_OFFSET = 60 // vertical offset for billboard content (px)
const BILLBOARD_SPACING = 400 // px between rows on the ground plane
const INFLECTION_PCT = 20 // % from top of screen where billboard bottoms peak
const SCROLL_SPEED = 1.5
const DEBUG = false

const GRASS_DENSITY = 4 // blades per 1000px of ground depth
const GRASS_X_MIN = -100 // % of ground plane width
const GRASS_X_MAX = 200 // % of ground plane width
const GRASS_W = 80
const GRASS_H = 120
const GRASS_Y_OFFSET = 20
const GRASS_BASE_SCALE = 0.5
const GRASS_SCALE_RANGE = 0.1 // scale varies ± this from base
const GRASS_BASE_ROTATION = 0 // degrees (rotateZ lean)
const GRASS_ROTATION_RANGE = 15 // rotation varies ± this from base
const GRASS_IMAGES = Array.from({ length: 11 }, (_, i) => `/grass/${i + 1}.svg`)

const BILLBOARD_IMAGES = ['/path/1.png', '/path/2.png', '/path/3.png']

const LANE_PATTERN = [1, 2, 1, 0] // middle, right, middle, left

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generateGrass() {
  const rng = mulberry32(42)
  const maxY = BILLBOARD_COUNT * BILLBOARD_SPACING + 200
  const count = Math.round((GRASS_DENSITY * maxY) / 1000)
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: GRASS_X_MIN + rng() * (GRASS_X_MAX - GRASS_X_MIN),
    y: rng() * maxY,
    src: GRASS_IMAGES[Math.floor(rng() * GRASS_IMAGES.length)],
    scale: GRASS_BASE_SCALE + (rng() - 0.5) * 2 * GRASS_SCALE_RANGE,
    rotation: GRASS_BASE_ROTATION + (rng() - 0.5) * 2 * GRASS_ROTATION_RANGE,
    flipX: rng() > 0.5 ? -1 : 1,
  }))
}

function generateBillboards() {
  return Array.from({ length: BILLBOARD_COUNT }, (_, i) => ({
    id: i,
    lane: LANE_PATTERN[i % LANE_PATTERN.length],
    y: i * BILLBOARD_SPACING + 200,
    src: BILLBOARD_IMAGES[i % BILLBOARD_IMAGES.length],
  }))
}

// With rotateX < 90°, edges converge d*cot(θ) pixels ABOVE perspectiveOrigin.
// Offset perspectiveOrigin down so the visual vanishing point lands at the horizon.
const COT_ANGLE = Math.cos((GROUND_ANGLE * Math.PI) / 180) / Math.sin((GROUND_ANGLE * Math.PI) / 180)
const PERSPECTIVE_OFFSET_PX = Math.round(PERSPECTIVE * COT_ANGLE)

export default function TestIndex() {
  const [billboards] = useState(generateBillboards)
  const [grass] = useState(generateGrass)
  const [scrollY, setScrollY] = useState(0)

  // Derive planet radius so billboard bottoms peak at INFLECTION_PCT% from top
  const { planetRadius, inflectionScreenY, inflectionGroundY, middleGroundY } = useMemo(() => {
    const H = typeof window !== 'undefined' ? window.innerHeight : 900
    const O = PERSPECTIVE_OFFSET_PX
    const P = PERSPECTIVE
    const cosA = Math.cos((GROUND_ANGLE * Math.PI) / 180)
    const sinA = Math.sin((GROUND_ANGLE * Math.PI) / 180)
    const targetScreenY = (INFLECTION_PCT / 100) * H

    const screenYAt = (d: number, R: number) => {
      const cZ = (d * d) / (2 * R)
      const yw = H - d * cosA + cZ * sinA
      const zw = -d * sinA - cZ * cosA
      return O + ((yw - O) * P) / (P - zw)
    }

    // For a given R, find the ground distance where billboard bottoms peak
    const findPeakD = (R: number) => {
      let dLo = 0,
        dHi = 50000
      for (let i = 0; i < 60; i++) {
        const mid = (dLo + dHi) / 2
        const eps = 0.5
        const deriv = (screenYAt(mid + eps, R) - screenYAt(mid - eps, R)) / (2 * eps)
        if (deriv < 0) dLo = mid
        else dHi = mid
      }
      return (dLo + dHi) / 2
    }

    // Bisect on R to land the peak screenY at targetScreenY
    let rLo = 100,
      rHi = 1000000
    for (let i = 0; i < 60; i++) {
      const rMid = (rLo + rHi) / 2
      const peakD = findPeakD(rMid)
      const peakScreenY = screenYAt(peakD, rMid)
      if (peakScreenY < targetScreenY) rHi = rMid
      else rLo = rMid
    }
    const radius = (rLo + rHi) / 2
    const peakD = findPeakD(radius)
    const screenY = screenYAt(peakD, radius)

    const middleScreenY = (screenY + H) / 2
    let mLo = 0,
      mHi = peakD
    for (let i = 0; i < 60; i++) {
      const mid = (mLo + mHi) / 2
      if (screenYAt(mid, radius) > middleScreenY) mLo = mid
      else mHi = mid
    }

    return {
      planetRadius: radius,
      inflectionScreenY: screenY,
      inflectionGroundY: peakD,
      middleGroundY: (mLo + mHi) / 2,
    }
  }, [])

  const firstBillboardY = billboards[0].y
  const lastBillboardY = billboards[billboards.length - 1].y
  const maxScroll = (lastBillboardY - firstBillboardY) / SCROLL_SPEED
  const scrollOffset = scrollY * SCROLL_SPEED + middleGroundY - lastBillboardY

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <div style={{ height: `calc(100vh + ${maxScroll}px)` }} />
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
        {/* Sky */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: `${INFLECTION_PCT}%`,
            background: 'var(--color-light-blue)',
          }}
        />

        {/* Ground */}
        <div
          style={{
            position: 'absolute',
            top: `${INFLECTION_PCT}%`,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#acc094',
          }}
        />

        {DEBUG && (
          <div
            style={{
              position: 'absolute',
              top: `${INFLECTION_PCT}%`,
              left: 0,
              right: 0,
              height: '2px',
              background: 'rgba(255,255,255,0.3)',
              zIndex: 1,
            }}
          />
        )}

        {/* 3D scene — billboards PAST inflection (behind cover) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            perspective: `${PERSPECTIVE}px`,
            perspectiveOrigin: `50% calc(${HORIZON_PCT}% + ${PERSPECTIVE_OFFSET_PX}px)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-10000%',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: MAX_WIDTH,
              margin: '0 auto',
              transformOrigin: 'bottom center',
              transformStyle: 'preserve-3d',
              transform: 'rotateX(60deg)',
            }}
          >
            {billboards.map((b) => {
              const effectiveY = Math.max(0, b.y + scrollOffset)
              const pastInflection = effectiveY >= inflectionGroundY
              const curveZ = (effectiveY * effectiveY) / (2 * planetRadius)
              return (
                <div
                  key={b.id}
                  style={{
                    position: 'absolute',
                    bottom: b.y + scrollOffset,
                    left: `${(b.lane * 100) / LANES}%`,
                    width: `${100 / LANES}%`,
                    height: BILLBOARD_H,
                    transformOrigin: 'bottom center',
                    transform: `translateZ(${-curveZ}px) rotateX(-${GROUND_ANGLE}deg)`,
                    visibility: pastInflection ? 'visible' : 'hidden',
                  }}
                >
                  <div style={{ width: '100%', height: '100%', transform: `translateY(${BILLBOARD_Y_OFFSET}px)` }}>
                    <img
                      src={b.src}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom center' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div
            style={{
              position: 'absolute',
              top: '-10000%',
              bottom: 0,
              left: 0,
              right: 0,
              transformOrigin: 'bottom center',
              transformStyle: 'preserve-3d',
              transform: 'rotateX(60deg)',
            }}
          >
            {grass.map((g) => {
              const effectiveY = Math.max(0, g.y + scrollOffset)
              const pastInflection = effectiveY >= inflectionGroundY
              const curveZ = (effectiveY * effectiveY) / (2 * planetRadius)
              return (
                <div
                  key={`g${g.id}`}
                  style={{
                    position: 'absolute',
                    bottom: g.y + scrollOffset,
                    left: `${g.x}%`,
                    width: GRASS_W,
                    height: GRASS_H,
                    transformOrigin: 'bottom center',
                    transform: `translateZ(${-curveZ}px) rotateX(-${GROUND_ANGLE}deg) rotateZ(${g.rotation}deg) scale(${g.flipX * g.scale}, ${g.scale})`,
                    visibility: pastInflection ? 'visible' : 'hidden',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ width: '100%', height: '100%', transform: `translateY(${GRASS_Y_OFFSET}px)` }}>
                    <img
                      src={g.src}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom center' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Hill cover at inflection screen Y */}
        <div
          style={{
            position: 'absolute',
            top: inflectionScreenY,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--color-light-green)',
            pointerEvents: 'none',
          }}
        />

        {/* 3D scene — billboards BEFORE inflection (in front of cover) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            perspective: `${PERSPECTIVE}px`,
            perspectiveOrigin: `50% calc(${HORIZON_PCT}% + ${PERSPECTIVE_OFFSET_PX}px)`,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-10000%',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: MAX_WIDTH,
              margin: '0 auto',
              transformOrigin: 'bottom center',
              transformStyle: 'preserve-3d',
              transform: 'rotateX(60deg)',
              ...(DEBUG
                ? {
                    border: '1px solid rgba(255,255,255,0.1)',
                    backgroundColor: 'rgba(0,0,0,0.1)',
                  }
                : {}),
            }}
          >
            {DEBUG && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 5000,
                  transform: `translateY(${-scrollOffset}px)`,
                  backgroundImage:
                    'linear-gradient(to right, hotpink 2px, transparent 2px), linear-gradient(to bottom, hotpink 2px, transparent 2px)',
                  backgroundSize: '100px 100px',
                }}
              />
            )}
            {billboards.map((b) => {
              const effectiveY = Math.max(0, b.y + scrollOffset)
              const pastInflection = effectiveY >= inflectionGroundY
              const curveZ = (effectiveY * effectiveY) / (2 * planetRadius)
              return (
                <div
                  key={b.id}
                  style={{
                    position: 'absolute',
                    bottom: b.y + scrollOffset,
                    left: `${(b.lane * 100) / LANES}%`,
                    width: `${100 / LANES}%`,
                    height: BILLBOARD_H,
                    transformOrigin: 'bottom center',
                    transform: `translateZ(${-curveZ}px) rotateX(-${GROUND_ANGLE}deg)`,
                    visibility: pastInflection ? 'hidden' : 'visible',
                  }}
                >
                  <div style={{ width: '100%', height: '100%', transform: `translateY(${BILLBOARD_Y_OFFSET}px)` }}>
                    <img
                      src={b.src}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom center' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div
            style={{
              position: 'absolute',
              top: '-10000%',
              bottom: 0,
              left: 0,
              right: 0,
              transformOrigin: 'bottom center',
              transformStyle: 'preserve-3d',
              transform: 'rotateX(60deg)',
            }}
          >
            {grass.map((g) => {
              const effectiveY = Math.max(0, g.y + scrollOffset)
              const pastInflection = effectiveY >= inflectionGroundY
              const curveZ = (effectiveY * effectiveY) / (2 * planetRadius)
              return (
                <div
                  key={`g${g.id}`}
                  style={{
                    position: 'absolute',
                    bottom: g.y + scrollOffset,
                    left: `${g.x}%`,
                    width: GRASS_W,
                    height: GRASS_H,
                    transformOrigin: 'bottom center',
                    transform: `translateZ(${-curveZ}px) rotateX(-${GROUND_ANGLE}deg) rotateZ(${g.rotation}deg) scale(${g.flipX * g.scale}, ${g.scale})`,
                    visibility: pastInflection ? 'hidden' : 'visible',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ width: '100%', height: '100%', transform: `translateY(${GRASS_Y_OFFSET}px)` }}>
                    <img
                      src={g.src}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom center' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 14,
            zIndex: 9999,
            pointerEvents: 'none',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}
        >
          Try scrolling
        </div>
      </div>
    </>
  )
}
