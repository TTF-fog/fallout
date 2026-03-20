import { usePage, router } from '@inertiajs/react'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { SharedProps } from '@/types'
import Frame from '@/components/shared/Frame'
import FlashMessages from '@/components/FlashMessages'
import { HalftoneBg } from '@/components/HalftoneBg'
import { notify } from '@/lib/notifications'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SpeechBubble from '@/components/onboarding/SpeechBubble'
import { consoleLoggingIntegration } from '@sentry/react'

export default function LandingIndex() {
  const shared = usePage<SharedProps>().props
  const containerRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<HTMLCanvasElement>(null)
  const cloudsRef = useRef<HTMLDivElement>(null)
  const card1Ref = useRef<HTMLDivElement>(null)
  const card2Ref = useRef<HTMLDivElement>(null)
  const card3Ref = useRef<HTMLDivElement>(null)
  const hoveredCardRef = useRef<number | null>(null)
  const falloutLettersRef = useRef<HTMLDivElement>(null)
  const falloutFallenRef = useRef(false)
  const belowFoldRef = useRef<HTMLDivElement>(null)
  const howSectionRef = useRef<HTMLElement>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const cursorFollowerRef = useRef<HTMLDivElement>(null)
  const customCursorRef = useRef<HTMLDivElement>(null)
  const pointerCursorRef = useRef<HTMLDivElement>(null)
  const preloaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      const qualifyOuter = document.querySelector<HTMLElement>(".qualify-outer");
      const qWrappers = gsap.utils.toArray<HTMLElement>(".qualify-card-wrapper");
      const qCards = gsap.utils.toArray<HTMLElement>(".qualify-card");

      if (qualifyOuter && qWrappers.length > 1) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: qualifyOuter,
            start: "top top",
            end: "bottom bottom",
            scrub: 2,
            invalidateOnRefresh: true,
          },
        });

        for (let i = 1; i < qWrappers.length; i++) {
          const STACK_OFFSET = i * 80;
          tl.to(qWrappers[i], {
            y: () => -(qWrappers[i].offsetTop - qWrappers[0].offsetTop - STACK_OFFSET),
            ease: "none",
          }).to(qCards[i - 1], {
            scale: 0.9 + 0.025 * (i - 1),
            ease: "none",
          }, "<");
        }
      }

      const hero = document.getElementById('hero')!

      ScrollTrigger.create({
        trigger: hero,
        pin: true,
        start: 'cemter top',
      })


      const el = falloutLettersRef.current
      const container = containerRef.current
      gsap.set(el, { y: -500 })

      const dropFallout = () => {
        gsap
          .timeline()
          .set(el, { y: -500, scaleX: 1, scaleY: 1 })
          .to(el, { y: 0, duration: 0.3, ease: 'power2.in' })
          .to(el, { scaleX: 1.1, scaleY: 0.6, duration: 0.1, ease: 'power1.out' })
          .call(() => {
            const shake = gsap.timeline()
            for (let i = 0; i < 8; i++) {
              shake.to(container, {
                x: (Math.random() - 0.5) * 14,
                y: (Math.random() - 0.5) * 10,
                duration: 0.04,
                ease: 'none',
              })
            }
            shake.to(container, { x: 0, y: 0, duration: 0.08, ease: 'power2.out', clearProps: 'x,y' })
          })
          .to(el, { scaleX: 0.85, scaleY: 1.2, duration: 0.15, ease: 'power2.out' })
          .to(el, { scaleX: 1, scaleY: 1, duration: 0.2, ease: 'elastic.out(1, 0.5)' })
      }

      gsap.to(preloaderRef.current, {
        opacity: 0,
        duration: 0.4,
        delay: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          if (preloaderRef.current) preloaderRef.current.style.display = 'none'
          dropFallout()
        },
      })

      ;[highlight1Ref.current, highlight2Ref.current].forEach((span) => {
        if (!span) return
        gsap.fromTo(
          span,
          { backgroundSize: '0% 100%' },
          {
            backgroundSize: '100% 100%',
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: span, start: 'top 85%' },
          }
        )
      })
    })

    // Sticker behavior: proximity drift — sticker drifts in the direction the cursor is moving when nearby, springs back on leave
    const stickerCleanups: (() => void)[] = []
    document.querySelectorAll<HTMLElement>('.sticker').forEach((el) => {
      let ox = 0, oy = 0
      let prevX = 0, prevY = 0
      let active = false

      const onDocMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dist = Math.hypot(e.clientX - cx, e.clientY - cy)
        const proximity = 160

        if (dist < proximity) {
          if (!active) {
            active = true
            prevX = e.clientX
            prevY = e.clientY
          }
          const dx = e.clientX - prevX
          const dy = e.clientY - prevY
          const cap = 28
          ox = Math.max(-cap, Math.min(cap, ox + dx * 0.28))
          oy = Math.max(-cap, Math.min(cap, oy + dy * 0.28))
          gsap.to(el, { x: ox, y: oy, duration: 0.6, ease: 'power2.out', overwrite: 'auto' })
        } else if (active) {
          active = false
          ox = 0
          oy = 0
          gsap.to(el, { x: 0, y: 0, duration: 1.8, ease: 'elastic.out(0.4, 0.28)', overwrite: 'auto' })
        }
        prevX = e.clientX
        prevY = e.clientY
      }

      document.addEventListener('mousemove', onDocMove)
      stickerCleanups.push(() => document.removeEventListener('mousemove', onDocMove))
    })

    // Magnetic letters — each letter drifts toward cursor while hovered, springs back on leave
    falloutLettersRef.current?.querySelectorAll<HTMLElement>('span').forEach((span) => {
      const springBack = () => {
        if (falloutFallenRef.current) return
        gsap.to(span, { x: 0, y: 0, duration: 1.5, ease: 'elastic.out(0.5, 0.35)', overwrite: 'auto' })
      }
      const onMove = (e: MouseEvent) => {
        if (falloutFallenRef.current) return
        const rect = span.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const cap = 18
        const px = Math.max(-cap, Math.min(cap, (e.clientX - cx) * 0.3))
        const py = Math.max(-cap, Math.min(cap, (e.clientY - cy) * 0.3))
        gsap.to(span, { x: px, y: py, duration: 0.5, ease: 'power3.out', overwrite: 'auto' })
      }
      span.addEventListener('mousemove', onMove)
      span.addEventListener('mouseleave', springBack)
      stickerCleanups.push(() => {
        span.removeEventListener('mousemove', onMove)
        span.removeEventListener('mouseleave', springBack)
      })
    })

    const customCursor = customCursorRef.current
    const pointerCursor = pointerCursorRef.current
    if (customCursor && !('ontouchstart' in window)) {
      const onCursorMove = (e: MouseEvent) => {
        const isClickable = !!(e.target as Element)?.closest('.clickme, a, button, [role="button"]')
        // Arrow: tip at ~9,6 in rendered 36x48 (viewBox tip ~6,3 scaled by 1.5x/2x)
        gsap.set(customCursor, { x: e.clientX - 9, y: e.clientY - 6, opacity: isClickable ? 0 : 1 })
        if (pointerCursor) {
          // Hand: index finger tip at ~15,10 in rendered 36x36 (viewBox ~10,7 scaled by 1.5x)
          gsap.set(pointerCursor, { x: e.clientX - 15, y: e.clientY - 10, opacity: isClickable ? 1 : 0 })
        }
      }
      window.addEventListener('mousemove', onCursorMove)
      stickerCleanups.push(() => window.removeEventListener('mousemove', onCursorMove))
    }

    const follower = cursorFollowerRef.current
    if (follower && !('ontouchstart' in window)) {
      gsap.set(follower, { opacity: 0 })
      const onMouseMove = (e: MouseEvent) => {
        const isOverCards = (e.target as Element)?.closest('.clickme')
        gsap.to(follower, { x: e.x + 3, y: e.y + 3, duration: 0.7, ease: 'power4', opacity: isOverCards ? 1 : 0 })
      }
      const onMouseLeave = () => gsap.to(follower, { opacity: 0, duration: 0.7 })
      window.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseleave', onMouseLeave)
      stickerCleanups.push(() => {
        window.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseleave', onMouseLeave)
      })
    }

    const hero = document.getElementById('hero')!
    gsap.set(navRef.current, { y: -80 })
    const navTrigger = ScrollTrigger.create({
      trigger: hero,
      start: 'bottom top',
      onEnter: () => {
        gsap.to(navRef.current, { y: 0, duration: 0.5, ease: 'power2.out' })
        if (falloutFallenRef.current) {
          falloutFallenRef.current = false
          falloutLettersRef.current?.querySelectorAll<HTMLElement>('span').forEach((span) => {
            gsap.to(span, { x: 0, y: 0, rotation: 0, duration: 0.6, ease: 'power3.out', overwrite: true })
          })
        }
      },
      onLeaveBack: () => gsap.to(navRef.current, { y: -80, duration: 0.4, ease: 'power2.in' }),
    })

    return () => {
      ctx.revert()
      navTrigger.kill()
      stickerCleanups.forEach((fn) => fn())
    }
  }, [])

  const [videoOpen, setVideoOpen] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentSection, setCurrentSection] = useState('overview')
  const [cardOrder, setCardOrder] = useState([0, 1, 2])
  const faqPanelContainerRef = useRef<HTMLDivElement>(null)
  const highlight1Ref = useRef<HTMLSpanElement>(null)
  const highlight2Ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const container = faqPanelContainerRef.current
    if (!container) return
    const lock = () => {
      container.style.minHeight = ''
      container.style.minHeight = `${container.offsetHeight}px`
    }
    lock()
    window.addEventListener('resize', lock)
    return () => window.removeEventListener('resize', lock)
  }, [])

  function handleFalloutClick() {
    if (falloutFallenRef.current) return
    falloutFallenRef.current = true
    const container = falloutLettersRef.current
    const hero = document.getElementById('hero')
    if (!container || !hero) return
    const heroBottom = hero.getBoundingClientRect().bottom
    container.querySelectorAll<HTMLElement>('span').forEach((span) => {
      const spanRect = span.getBoundingClientRect()
      const fallY = heroBottom - spanRect.bottom - 20
      gsap.to(span, {
        y: fallY,
        x: (Math.random() - 0.5) * 220,
        rotation: (Math.random() - 0.5) * 120,
        duration: 0.7 + Math.random() * 0.8,
        delay: Math.random() * 0.3,
        ease: 'bounce.out',
      })
    })
  }

  function animateHowCards(hoveredIndex: number, entering: boolean) {
    const cards = [card1Ref.current, card2Ref.current, card3Ref.current]
    const angles = [-8, 5, -6]

    if (entering) {
      hoveredCardRef.current = hoveredIndex
      cards.forEach((card, i) => {
        if (i === hoveredIndex) {
          gsap.to(card, { y: -70, rotation: angles[i], scale: 1.04, zIndex: 20, duration: 0.35, ease: 'back.out(1.2)' })
        } else {
          const dir = Math.sign(i - hoveredIndex)
          gsap.to(card, { x: dir * 55, y: 20, rotation: dir * 6, scale: 0.95, duration: 0.3, ease: 'back.out(1.2)' })
        }
      })
    } else {
      // Defer reset so a card-to-card transition doesn't briefly snap back
      setTimeout(() => {
        if (hoveredCardRef.current !== hoveredIndex) return
        hoveredCardRef.current = null
        cards.forEach((card) => {
          gsap.to(card, { x: 0, y: 0, rotation: 0, scale: 1, zIndex: 1, duration: 0.4, ease: 'back.out(1.4)' })
        })
      }, 20)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.post(
      shared.trial_session_path,
      { email },
      {
        onStart: () => setSubmitting(true),
        onFinish: () => setSubmitting(false),
        onSuccess: (page) => {
          const flash = (page.props as unknown as SharedProps).flash
          if (flash.notice) {
            notify('notice', flash.notice)
            setEmail('')
          }
          if (flash.alert) notify('alert', flash.alert)
        },
        onError: () => notify('alert', 'Something went wrong. Please try again.'),
      },
    )
  }

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'qualifying', label: 'Qualifying' },
    { id: 'requirements', label: 'What counts' },
    { id: 'shipping', label: 'Submitting' },
    { id: 'travel', label: 'Travel & Event' },
    { id: 'parents', label: 'For Parents' },
  ]

  return (
    <>
    <div ref={preloaderRef} className="fixed inset-0 bg-blue z-50 pointer-events-none" />
    <div ref={containerRef} className="w-screen h-full flex flex-col justify-center bg-beige overflow-hidden cursor-none">
      
      <title>Fallout: Hardware Hackathon</title>
      <meta
        name="description"
        content="A seven-day hardware hackathon in ShenZhen, China in 2026. Design hardware projects, build them, & qualify!"
      />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Fallout: Hardware Hackathon" />
      <meta
        property="og:description"
        content="A seven-day hardware hackathon in ShenZhen, China in 2026. Design hardware projects, build them, & qualify!"
      />
      <meta property="og:site_name" content="Fallout" />

      <section
        id="hero"
        className="bg-blue relative min-h-svh md:h-[120vh] flex flex-col items-center pt-4 md:p-5 gap-4 overflow-hidden"
      >
        {/* <img src="/landing/flag.svg" className="w-20 absolute top-4 -translate-x-1/2 left-1/2 z-20" /> */}
        <div
          ref={cloudsRef}
          className="w-full flex justify-center items-center lg:items-start h-full top-0 absolute gap-[10%] pointer-events-none"
        >
          <img src="/landing/cloud_1.webp" alt="" className="h-auto lg:h-[80%] w-auto pointer-events-none" />
          <img src="/landing/cloud_2.webp" alt="" className=" h-auto lg:h-[80%] w-auto pointer-events-none" />
        </div>
        <HalftoneBg
          ref={bgRef}
          src="/landing/bg.png"
          className="absolute inset-0 w-full h-full -top-10 pointer-events-none"
          halftoneOpacity={0.1}
          bleed={0.08}
        />
        <div className="flex h-8 gap-4"></div>

        <div className="relative z-10 flex flex-col items-center w-full px-4 md:px-0 mt-6 sm:mt-14 xl:mt-18 gap-3 sm:gap-4">
          <div className="text-white text-lg md:text-xl lg:text-2xl tracking-[5%] text-center">JULY 1-7, 2026</div>
          <div ref={falloutLettersRef} className="text-[9rem] font-bells text-white cursor-pointer select-none -my-10" onDoubleClick={handleFalloutClick}>
            <span className="inline-block pr-1">F</span>
            <span className="inline-block px-1">A</span>
            <span className="inline-block px-1">L</span>
            <span className="inline-block">L</span>
            <span className="inline-block">O</span>
            <span className="inline-block px-1">U</span>
            <span className="inline-block pl-1">T</span>
          </div>
          <h1 className="shake text-white text-center tracking-[5%] text-shadow-md text-shadow-blue text-4xl">
            Build 60h of hardware... Go to Shenzhen!
          </h1>
          <Frame className="w-full max-w-[calc(100%-1rem)] sm:max-w-150 ml-1">
            <form
              className="w-full h-full flex px-2 sm:px-4 py-2 text-xl items-center justify-between gap-2"
              onSubmit={handleSubmit}
            >
              <input
                className="flex-1 min-w-0 py-2 md:py-3 text-lg sm:text-xl md:text-3xl placeholder-brown outline-none bg-transparent"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@shenzhen.com"
                required
              />
              <button
                className="cursor-pointer disabled:opacity-50 w-fit h-fit shrink-0 border-2 border-dark-brown bg-brown text-light-brown font-bold whitespace-nowrap text-sm sm:text-xl md:text-2xl px-3 py-2"
                aria-label="Submit"
                disabled={submitting}
              >
                {submitting ? '...' : 'START NOW'}
              </button>
            </form>
          </Frame>
          <FlashMessages />
          <p className="text-white text-base -mt-4 text-shadow-lg">For teenagers 13-18</p>
          <a href={shared.sign_in_path} className="text-white text-sm underline -mt-2 text-shadow-lg">Sign in with HCA</a>
        </div>
        
      </section>

      <div ref={belowFoldRef} className="relative z-10">
      <div className="w-screen  relative">
        <img src="/landing/clouds/banner.png" className="object-cover object-bottom select-none" />
        {/* <img className="w-60 absolute bottom-0 left-0 object-contain" src="/landing/stickers/sticker1.png" alt="" />
        <img className="w-60 absolute bottom-0 right-0 object-contain" src="/landing/stickers/sticker2.png" alt="" />
        <img className="w-60 absolute bottom-10 left-1/2 object-contain" src="/landing/stickers/sticker3.png" alt="" /> */}
      </div>

 
      <div className="w-screen bg-beige p-10 pt-20 lg:px-30 xl:px-60 ">
        <section className="bg-dark-brown border-2 border-dark-brown rounded-xs text-beige p-10 flex justify-center items-center gap-4 relative">
          <div className="absolute -bottom-22 right-10 bg-white  w-100 shadow-md border-2 border-dark-brown z-10 text-dark-brown p-4 text-2xl">
            <p>We've organized events like this in the past!</p>
          </div>

        <div className="flex flex-col text-2xl xl:text-3xl font-normal py-6">
          <span className="text-4xl font-medium">WHAT IS</span>
          <span className="text-7xl xl:text-9xl font-black">FALLOUT?</span>
          <p className="">Hack Club Fallout is a three-month program leading to a 7-day, <span ref={highlight1Ref} style={{ backgroundImage: 'linear-gradient(var(--color-green), var(--color-green))', backgroundRepeat: 'no-repeat', backgroundPosition: 'left center', backgroundSize: '0% 100%' }}>free hardware hackathon in Shenzhen, China.</span></p>
          <p className="mt-8">Students qualify by designing and <span ref={highlight2Ref} style={{ backgroundImage: 'linear-gradient(var(--color-green), var(--color-green))', backgroundRepeat: 'no-repeat', backgroundPosition: 'left center', backgroundSize: '0% 100%' }}>building 60h</span>, with components funded by us!</p>
        </div>
        <div className="clickme w-400 h-100 grid grid-cols-1 grid-rows-1 place-items-center cursor-none" onClick={() => setCardOrder(prev => [...prev.slice(1), prev[0]])}>
          {cardOrder.map(i => (
            <div key={i} className={`col-start-1 row-start-1 border-2 border-browns h-full aspect-3/4 bg-gray ${['rotate-0', '-rotate-6', 'rotate-9'][i]}`} />
          ))}
        </div>
        {/* <div className=""></div> */}
      </section>

      <div className="pt-40 qualify-outer h-calc[(30rem + 4000px)]">
        <section className="qualify-section sticky top-[calc(50svh-15rem)] flex justify-between w-full  text-beige gap-4 h-120 overflow-hidden">
          <div className="flex-3/4 lg:flex-1/2 w-full">
          <div className="qualify-scroll-wrapper">
            <div className="qualify-card-wrapper h-80" style={{ perspective: '500px' }}>
              <HalftoneBg src="/landing/comic1.png" className="qualify-card w-full h-full" objectFit="contain" background="" halftoneOpacity={0.12} />
            </div>
            <div className="qualify-card-wrapper h-80" style={{ perspective: '500px' }}>
              <HalftoneBg src="/landing/comic2.png" className="qualify-card w-full h-full -translate-y-1" objectFit="contain" background=""  halftoneOpacity={0.12} />
            </div>
            <div className="qualify-card-wrapper h-80 pt-1" style={{ perspective: '500px' }}>
              <HalftoneBg src="/landing/comic3.png" className="qualify-card w-full h-full" objectFit="contain" background="" halftoneOpacity={0.12} />
            </div>
          </div>
        </div>
        <div className="grow flex flex-col bg-blue border-2 border-dark-brown p-8 h-fit mt-10">
          <span className="text-6xl font-bold text-left whitespace-nowrap pb-4">QUALIFY</span>
          <ol className="ml-8 list-decimal leading-8 text-2xl xl:text-3xl space-y-2">
            <li>Design your project</li>
            <li>Track all of your time by journaling & timelapsing</li>
            <li>Submit for feedback!</li>
            <li>We give you up to $350 USD to buy parts -&gt; You build it!</li>
            <li>Publish + Share online</li>
          </ol>
        </div>
        </section>
      </div>
      </div>


      <section className="lg:px-30 xl:px-50 flex justify-center items-center w-full">
        <h2 className="text-9xl lg:text-[10rem] font-bold">
          60H
        </h2>
        <HalftoneBg src="/landing/person.png" objectFit="contain" background="" halftoneOpacity={0.25} className="w-full max-w-200 -mx-20 aspect-[637/576]" />
        <div className="flex flex-col text-center text-4xl">
          {/* <h4>shen zhen</h4> */}
          <h2 className="text-9xl lg:text-[10rem] font-bold whitespace-nowrap">深圳
          </h2>
          {/* <h4>China</h4> */}
        </div>
 
      </section>
      <section className="-mt-20 w-full h-auto relative">
        {/* <div className="w-full">
          <div className="w-full flex justify-center grid grid-cols-1 grid-rows-1 items-center h-0">
            <div className="px-20 col-start-1 row-start-1 flex justify-between h-30 xl:h-50">
              <img src="/landing/stickers/sticker2.png" className="h-full rotate-3" />
              <img src="/landing/stickers/sticker4.png" className="h-full rotate-3" />
              <img src="/landing/stickers/sticker6.png" className="h-full rotate-3" />
            </div>
            <div className="col-start-1 row-start-1 w-full flex justify-between h-40 xl:h-50">
              <img src="/landing/stickers/sticker1.png" className="h-full rotate-3 -ml-10" />
              <img src="/landing/stickers/sticker3.png" className="h-full rotate-3" />
              <img src="/landing/stickers/sticker5.png" className="h-full w-auto rotate-3" />
              <img src="/landing/stickers/sticker7.png" className="h-full rotate-3 -mr-10" />
            </div>
              <div className="col-start-1 row-start-1 w-full flex justify-center h-20 xl:h-50">
            <img src="/landing/stickers/sticker8.png" className="h-20 rotate-3" />
          </div>
          </div>
        </div> */}
        <div className="px-2 md:px-8 lg:px-18 xl:px-36 2xl:px-54 py-40">
          <div className="w-full h-[60vh]">
            <div className="w-full h-full flex flex-col sm:flex-row justify-between text-brown gap-x-0">
              <div>
              <div className="flex flex-col pl-6 py-10 h-full bg-dark-brown border-2 border-dark-brown">
                <div
                  role="tablist"
                  className="relative w-full flex flex-row sm:flex-col flex-wrap items-start justify-between whitespace-nowrap gap-2 md:gap-6 min-w-[230px] mt-1 h-full text-beige"
                >
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      role="tab"
                      aria-selected={currentSection === section.id}
                      aria-controls={`panel-${section.id}`}
                      id={`tab-${section.id}`}
                      onClick={() => setCurrentSection(section.id)}
                      className={`text-base md:text-2xl cursor-pointer 
                      ${currentSection === section.id ? 'font-bold uppercase w-full text-left cursor-default' : 'hover:ml-4 transition-all ease-in-out '}`}
                            >
                      {section.label}
                    </button>
                  ))}
                  <p className="sm:mt-20 md:mt-auto text-base md:text-2xl cursor-pointer">
                    Read {' '}
                    <a className="underline font-medium" href="https://fallout.hackclub.com/docs" target="_self">
                      our Docs
                    </a>
                  </p>
                 <img className="sticker absolute bottom-6 -left-40 h-40 object-contain rotate-10" src="/landing/stickers/sticker8.png" />

                </div>

              </div>
              </div>

              <div ref={faqPanelContainerRef} className="relative w-full text-left" style={{ display: 'grid' }}>
                {sections.map((section) => (
                  <div
                    key={section.id}
                    role="tabpanel"
                    id={`panel-${section.id}`}
                    aria-labelledby={`tab-${section.id}`}
                    aria-hidden={currentSection !== section.id}
                    className={`px-2 md:px-10 py-10 text-lg md:text-2xl space-y-3 border-2 border-dark-brown bg-white relative text-dark-brown ${currentSection !== section.id ? ' invisible pointer-events-none' : ''}`}
                    style={{ gridArea: '1 / 1' }}
                  >
                    {section.id === 'overview' && (
                      <>
                        <p>Welcome to...</p>
                        <span className="font-bells text-6xl tracking-[4%]">FALLOUT</span>
                        <p className="pt-4">
                          Imagine kicking off summer in <strong>Shenzhen</strong>, the{' '}
                          <em>hardware capital of the world</em>.
                        </p>
                        <p>Never tried hardware before? <strong>This is your chance to start.</strong></p>
                        <p>
                          <span className="bg-green text-white px-0.5">
                            <strong>Build any hardware project you want. We'll fund the parts.</strong>
                          </span>{' '}
                          Level up your hardware skills. Join us for a{' '}
                          <strong>7-day hardware hackathon in Shenzhen</strong>.
                        </p>
                        <p>
                          (← click on the tabs <span className="hidden md:inline">on the left</span>
                          <span className="inline md:hidden">up top</span> to learn more!)
                        </p>
                      </>
                    )}
                    {section.id === 'qualifying' && (
                      <>
                        <p>
                          Spend <span className="bg-green text-white px-0.5"><strong>60h</strong></span> designing and
                          building hardware projects to get invited to Fallout!
                        </p>
                        <p>The premise is simple:</p>
                        <ol className="list-decimal list-outside ml-7 space-y-1">
                          <li>Design your hardware project <em>digitally</em></li>
                          <li>Track your time through timelapses/screen recordings & journals</li>
                          <li>
                            Ship it!{' '}
                            <span className="bg-green text-white px-0.5">
                              <strong>We'll fund up to $5 per hour</strong>
                            </span>{' '}
                            you work to buy parts
                          </li>
                          <li>Build your project IRL</li>
                          <li>Repeat!</li>
                        </ol>
                      </>
                    )}
                    {section.id === 'requirements' && (
                      <>
                        <p>
                          Build a hardware project you've always wanted to make.{' '}
                          <span className="bg-green text-white px-0.5">
                            <strong>We value effort more than technical ability.</strong>
                          </span>{' '}
                          It can be really simple, but the end result should feel closer to{' '}
                          <em>a product than a demo</em> — a breadboarded project doesn't count.
                        </p>
                        <p>
                          We're not here to fund you to build a PC. Your goal is to{' '}
                          <strong>design something really cool from the ground up</strong>, and not to assemble
                          expensive parts others have made.
                        </p>
                        <p>
                          Don't know what to build, or what counts? You'll be part of a greater community where you can
                          ask for help!
                        </p>
                      </>
                    )}
                    {section.id === 'shipping' && (
                      <>
                        <p>
                          Shipping is making your project <em>real</em>. Putting it out into the world and making it
                          re-creatable for someone else. For Fallout, you need to:
                        </p>
                        <ol className="list-decimal pl-7">
                          <li>Document what your project is and its story</li>
                          <li>Make a one page poster for the <strong>Fallout magazine</strong></li>
                          <li>Publish all files so it's easily accessible & organized</li>
                        </ol>
                        <p>
                          When you make your repository nothing but a dump of files and 2 sentences for a README —{' '}
                          <span className="bg-green text-white px-0.5">
                            it's hard for people to recognize your work or learn from it.
                          </span>{' '}
                          It only lives in your head.
                        </p>
                      </>
                    )}
                    {section.id === 'travel' && (
                      <>
                        <p>
                          We're running Fallout at the center of the world's tech manufacturing,{' '}
                          <strong>ShenZhen China</strong>. For the week of{' '}
                          <span className="bg-green text-white px-0.5"><strong>July 1–7</strong></span>, you'll be able to
                          browse the world's largest hardware and electronics market,{' '}
                          <em>Huaqiangbei</em>, to build whatever creation you dream up, with friends you meet along
                          the way.
                        </p>
                        <p>
                          We'll be releasing more information about the logistics and schedule of the event closer to
                          July.
                        </p>
                      </>
                    )}
                    {section.id === 'parents' && (
                      <>
                        <p>
                          We understand that letting your teen travel to a foreign country can be intimidating. You
                          probably have a lot of questions, and are wondering if this is a good idea. We'll be releasing a
                          parent's guide closer to the event.
                        </p>
                        <p>
                          We completely understand your worries, and we want to do everything we can to help you feel more
                          comfortable. We have experience running programs very similar to this, and would be happy to
                          answer any questions over a <strong>Zoom call</strong>!
                        </p>
                        <p>
                          Hack Club operates on the principle of{' '}
                          <span className="bg-green text-white px-0.5"><strong>radical transparency</strong></span> and we
                          promise to communicate with you frequently and transparently.
                        </p>
                        <p>
                          If you have any questions or concerns, please do not hesitate to reach out to us at{' '}
                          <a href="mailto:fallout@hackclub.com" className="underline">
                            fallout@hackclub.com
                          </a>
                          .
                        </p>
                      </>
                    )}
                  </div>
                ))}
                <img className="sticker absolute -bottom-10 right-20 h-26 object-contain" src="/landing/stickers/sticker2.png" />
                <img className="sticker absolute bottom-0 -right-10 h-40 object-contain" src="/landing/stickers/sticker3.png" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-2 md:px-8 lg:px-18 xl:px-36 
      2xl:px-54 bg-beige text-dark-brown pb-8 relative flex items-end gap-4">
        <div className="space-y-2 text-xl xl:text-2xl">
          <p className="font-medium mt-2 leading-6 ">Fallout is made with ♡ by teenagers, for teenagers</p>
          <div className="space-x-4">
            <a href="https://hackclub.com" target="_blank" rel="noreferrer" className="underline">
              Hack Club
            </a>
            <a href="https://hackclub.com/slack" target="_blank" rel="noreferrer" className="underline">
              Join Our Slack
            </a>
          </div>
        </div>
        {/* <div className="ml-auto flex items-end gap-4">
          <div className="bg-white outline-2 outline-dark-brown h-24 aspect-5/3">
            <p className="text-center">07-01-2026</p>
          </div>
          <div className="flex flex-col gap-2">
            <a href="mailto:fallout@hackclub.com" className="underline ml-auto text-xl">
              fallout@hackclub.com
            </a>
            <div className="outline-2 outline-dark-brown h-34 aspect-2/1 border-4 border-green bg-light-green flex items-center justify-center overflow-hidden">
              <img src="/koifish.webp" className="p-2 h-full w-full object-contain cursor-pointer" />
            </div>
          </div>
        </div> */}
      </footer>


      </div>
      <div ref={customCursorRef} className="fixed top-0 left-0 z-[9999] pointer-events-none select-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 24 24">
          <path fill="#FCF2E5" stroke="#412E27" strokeWidth="2.25" d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z" />
        </svg>
      </div>
      <div ref={pointerCursorRef} className="fixed top-0 left-0 z-[9999] pointer-events-none select-none" style={{ opacity: 0 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
          <path fill="#FCF2E5" stroke="#412E27" strokeWidth="2.25" strokeLinejoin="round" d="M10 11V8.99c0-.88.59-1.64 1.44-1.86h.05A1.99 1.99 0 0 1 14 9.05V12v-2c0-.88.6-1.65 1.46-1.87h.05A1.98 1.98 0 0 1 18 10.06V13v-1.94a2 2 0 0 1 1.51-1.94h0A2 2 0 0 1 22 11.06V14c0 .6-.08 1.27-.21 1.97a7.96 7.96 0 0 1-7.55 6.48 54.98 54.98 0 0 1-4.48 0 7.96 7.96 0 0 1-7.55-6.48C2.08 15.27 2 14.59 2 14v-1.49c0-1.11.9-2.01 2.01-2.01h0a2 2 0 0 1 2.01 2.03l-.01.97v-10c0-1.1.9-2 2-2h0a2 2 0 0 1 2 2V11Z" />
        </svg>
      </div>
      <div ref={cursorFollowerRef} className="click fixed top-0 left-0 z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-beige border-2 border-dark-brown flex items-center justify-center text-dark-brown text-md font-semibold select-none" style={{ opacity: 0 }}>
        click
      </div>
    </div>

</>
  )
}

LandingIndex.layout = (page: ReactNode) => page
