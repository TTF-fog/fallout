import { useRef } from 'react'

const items = [...Array(10)]
const FREQUENCY = 1.4
const imagePath = (i: number): string => {
  if (i === 0) return '/path/star.png'
  if (i === 2) return '/path/slack.png'
  if (i % 2 === 0) return '/path/2.png'
  if (i % 3 === 0) return '/path/3.png'
  return '/path/1.png'
}

export default function Path() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} className="w-[80%] max-w-150" style={{ position: 'relative', margin: '0 auto' }}>
      {items.map((_, i) => {
        const containerWidth = containerRef.current?.offsetWidth ?? 300
        const AMPLITUDE = containerWidth * -0.3
        const x = Math.sin(i * FREQUENCY) * AMPLITUDE
        const src = imagePath(i)
        return (
          <div
            key={i}
            className="relative w-10 md:w-40 flex items-center justify-center text-blue font-bold mb-30"
            style={{ left: `calc(50% + ${x}px)`, transform: 'translateX(-50%)' }}
          >
            <img src={src} width="100%" height="auto" />
          </div>
        )
      })}
    </div>
  )
}
