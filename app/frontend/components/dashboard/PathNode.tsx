import { useState, useEffect } from 'react'
// @ts-expect-error useModalStack lacks type declarations in this beta package
import { ModalLink, useModalStack } from '@inertiaui/modal-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/shared/Tooltip'

const BILLBOARD_IMAGES = ['/path/1.png', '/path/2.png', '/path/3.png']

export default function PathNode({
  index,
  interactive = true,
  hasProjects = false,
}: {
  index: number
  interactive?: boolean
  hasProjects?: boolean
}) {
  const showStarTooltip = index === 0 && !hasProjects
  const showDoneTooltip = index === 0 && hasProjects
  const showNode1Tooltip = index === 1 && hasProjects
  const { stack } = useModalStack()
  const modalOpen = stack.length > 0
  const [node1Ready, setNode1Ready] = useState(false)

  // Delay showing node 1 tooltip so it appears after modal fade-out
  useEffect(() => {
    if (!showNode1Tooltip) return
    const timer = setTimeout(() => setNode1Ready(true), 500)
    return () => clearTimeout(timer)
  }, [showNode1Tooltip])

  const starImage = (
    <img
      src="/path/star.png"
      fetchPriority="high"
      style={{ width: '100%', display: 'block', transform: `translateY(20px)` }}
    />
  )

  const content = (
    <div style={{ pointerEvents: 'auto' }} className="cursor-pointer">
      {index === 0 && interactive && !hasProjects && (
        <ModalLink href="/projects/onboarding" className="outline-0">
          {starImage}
        </ModalLink>
      )}
      {index === 0 && (!interactive || hasProjects) && starImage}
      {index === 3 && <img src="/path/slack.png" fetchPriority="high" style={{ width: '100%', display: 'block' }} />}

      {index === 1 && interactive && hasProjects && (
        <ModalLink href="/journal_entries/new" className="outline-0">
          <img
            src={BILLBOARD_IMAGES[index % BILLBOARD_IMAGES.length]}
            fetchPriority="high"
            style={{ width: '100%', display: 'block' }}
          />
        </ModalLink>
      )}
      {index !== 0 && index !== 3 && !(index === 1 && interactive && hasProjects) && (
        <img
          src={BILLBOARD_IMAGES[index % BILLBOARD_IMAGES.length]}
          fetchPriority="high"
          style={{ width: '100%', display: 'block' }}
        />
      )}
    </div>
  )

  if (!interactive) return content

  if (showStarTooltip) {
    return (
      <Tooltip side="top" gap={12} trackScroll alwaysShow={!modalOpen}>
        <TooltipTrigger>{content}</TooltipTrigger>
        <TooltipContent>Start here!</TooltipContent>
      </Tooltip>
    )
  }

  if (showDoneTooltip) {
    return (
      <Tooltip side="top" gap={12} trackScroll>
        <TooltipTrigger>{content}</TooltipTrigger>
        <TooltipContent>Already done!</TooltipContent>
      </Tooltip>
    )
  }

  if (showNode1Tooltip) {
    return (
      <Tooltip side="top" gap={12} trackScroll alwaysShow={node1Ready && !modalOpen}>
        <TooltipTrigger>{content}</TooltipTrigger>
        <TooltipContent>Here next!</TooltipContent>
      </Tooltip>
    )
  }

  const isLocked = (!hasProjects && index >= 1) || (hasProjects && index >= 2)
  if (isLocked) {
    return (
      <Tooltip side="top" gap={12} trackScroll>
        <TooltipTrigger>{content}</TooltipTrigger>
        <TooltipContent>Locked</TooltipContent>
      </Tooltip>
    )
  }

  return content
}
