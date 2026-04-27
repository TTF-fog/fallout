import { type CSSProperties, type ElementType, memo, useId, useMemo } from 'react'
import { AnimatePresence, motion, type Transition, type Variants } from 'motion/react'
import { cn } from '@/lib/utils'

export type TextMorphProps = {
  children: string
  as?: ElementType
  className?: string
  style?: CSSProperties
  variants?: Variants
  transition?: Transition
}

const defaultVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const defaultTransition: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 18,
  mass: 0.3,
}

function TextMorph({ children, as: Component = 'p', className, style, variants, transition }: TextMorphProps) {
  const uniqueId = useId()

  const characters = useMemo(() => {
    const chars = Array.from(children)

    const totalCharCounts = chars.reduce<Record<string, number>>((acc, char) => {
      const lowerChar = char.toLowerCase()
      acc[lowerChar] = (acc[lowerChar] || 0) + 1
      return acc
    }, {})

    const leftCharCounts: Record<string, number> = {}
    const rightCharCounts = { ...totalCharCounts }

    return chars.map((char) => {
      const lowerChar = char.toLowerCase()
      const leftCount = (leftCharCounts[lowerChar] = (leftCharCounts[lowerChar] || 0) + 1)
      const rightCount = rightCharCounts[lowerChar]

      if (rightCharCounts[lowerChar] !== undefined) {
        rightCharCounts[lowerChar] -= 1
      }

      return {
        id: `${uniqueId}-${lowerChar}-${leftCount}-${rightCount}`,
        label: char === ' ' ? '\u00A0' : char,
      }
    })
  }, [children, uniqueId])

  return (
    <Component className={cn(className)} aria-label={children} style={style}>
      <span className="relative inline-flex whitespace-pre" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          {characters.map((character) => (
            <motion.span
              key={character.id}
              layout="position"
              className="inline-block"
              initial="initial"
              animate="animate"
              exit="exit"
              variants={variants ?? defaultVariants}
              transition={transition ?? defaultTransition}
            >
              {character.label}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    </Component>
  )
}

export default memo(TextMorph)
