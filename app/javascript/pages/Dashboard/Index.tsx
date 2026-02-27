import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import Frame from '@/components/Frame'
import Shop from '@/components/Shop'
import Projects from '@/components/Projects'
import Path from '@/components/Path'

type User = {
  user: string
  hours: number
}

export default function DashboardIndex() {
  const [koiBalance] = useState<number>(11)
  const [mail] = useState<boolean>(true)
  const [notPressed] = useState<boolean>(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [users] = useState<User[]>([
    { user: 'John Cena', hours: 100 },
    { user: 'Bobberson', hours: 45 },
    { user: 'randy', hours: 6 },
    { user: 'hi', hours: 2 },
    { user: 'bingbong', hours: 2 },
  ])
  const [shopOpen, setShopOpen] = useState<boolean>(false)
  const [projectsOpen, setProjectsOpen] = useState<boolean>(false)

  useEffect(() => {
    const isMobile = window.innerWidth < 640
    if (!loggedIn && isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [loggedIn])

  return (
    <div className="relative w-screen min-h-screen flex flex-col">
      <div className="relative w-full h-50 bg-light-blue overflow-x-hidden">
        <img src="/clouds/4.png" alt="" className="absolute bottom-0 left-0 h-30 md:h-50 -translate-x-1/3 z-0" />
        <img src="/clouds/1.png" alt="" className="absolute bottom-0 left-40 h-30 translate-x-1/3 z-0" />
        <img src="/clouds/2.png" alt="" className="absolute bottom-0 right-0 -translate-x-5/6 h-30 z-0" />
        <img src="/clouds/3.png" alt="" className="absolute bottom-0 right-0 h-30 md:h-50 w-auto translate-x-1/3 z-0" />
      </div>
      <main className="min-h-screen w-full bg-light-green pt-8">
        <Path />
      </main>
      <div className="w-screen min-h-screen fixed p-2 lg:p-8 flex flex-col">
        <header className="flex justify-between z-1 relative">
          <img src="" alt="" className="rounded-full aspect-[1/1] h-10 h-16 bg-brown w-fit" />
          <div className="flex h-10 xl:h-14 gap-2 items-center">
            <img src="/koifish.png" alt="koi" className="w-auto h-full" />
            <span className="text-coral text-4xl xl:text-5xl font-bold">{koiBalance}</span>
            <div className="relative h-full ml-4">
              <img src="/envelope.png" alt="mail" className="w-auto h-full" />
              {mail && (
                <span className="absolute top-1 right-0 rounded-full w-3 md:w-4 aspect-1/1 bg-blue border-1 border-dark-brown" />
              )}
            </div>
          </div>
        </header>
        <section className="flex justify-between w-full items-end mt-auto">
          <nav className="flex flex-row-reverse md:flex-col gap-y-4">
            <button className="relative hover:scale-110">
              <img src="/icon/guide.png" alt="guide" className="h-20 md:h-30 w-auto cursor-pointer" />
              {notPressed && (
                <span className="absolute top-4 left-4 rounded-full w-4 aspect-1/1 bg-pink border-1 border-dark-brown" />
              )}
            </button>
            <button onClick={() => setShopOpen(true)}>
              <img src="/icon/shop.png" alt="Shop" className="h-20 md:h-36 w-auto hover:scale-110 cursor-pointer" />
            </button>
            <button onClick={() => setProjectsOpen(true)}>
              <img
                src="/icon/project.png"
                alt="Projects"
                className="h-20 md:h-30 w-auto hover:scale-110 cursor-pointer"
              />
            </button>
            <button>
              <img
                src="/icon/clearing.png"
                alt="Clearing"
                className="h-20 md:h-60 w-auto hover:scale-110 cursor-pointer"
              />
            </button>
          </nav>
          <aside className="gap-4 hidden md:flex md:flex-col items-center">
            <Frame>
              <div className="flex flex-col items-center text-center gap-y-3 py-6 w-60 mx-8">
                <h3 className="font-bold">Connect your account!</h3>
                <p>& get stickers shipped to you!</p>
                <button
                  onClick={() => setLoggedIn(true)}
                  className="py-2 px-12 bg-brown text-light-brown w-fit border-2 border-dark-brown text-3xl xl:text-4xl font-bold whitespace-nowrap"
                >
                  SIGN UP
                </button>
              </div>
            </Frame>
            <Frame>
              <div className="flex flex-col gap-y-4 w-60 mx-8 py-6">
                <h3 className="font-bold text-center">LEADERBOARD</h3>
                <ul className="space-y-4">
                  {users.map((user) => (
                    <li key={user.user} className="flex justify-between font-light">
                      <span className="text-2xl">@{user.user}</span>
                      <span className="text-2xl">{user.hours}h</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Frame>
          </aside>
        </section>
      </div>
      {shopOpen && <Shop onClose={() => setShopOpen(false)} />}
      {projectsOpen && <Projects onClose={() => setProjectsOpen(false)} />}
    </div>
  )
}

DashboardIndex.layout = (page: ReactNode) => page
