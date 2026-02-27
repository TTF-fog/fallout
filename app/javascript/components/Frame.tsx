import type { ReactNode } from 'react'

const Frame = ({ children }: { children: ReactNode }) => (
  <div className="relative pl-5.75 pt-5 pr-8.25 pb-7.5">
    <div className="bg-light-brown p-5">{children}</div>
    <img className="absolute top-0 left-0 w-30 h-26.75 pointer-events-none" src="/border/top_left.png" alt="" />
    <img className="absolute top-0 right-0 w-30 h-26.75 pointer-events-none" src="/border/top_right.png" alt="" />
    <img className="absolute bottom-0 left-0 w-30 h-26.75 pointer-events-none" src="/border/bottom_left.png" alt="" />
    <img className="absolute bottom-0 right-0 w-30 h-26.75 pointer-events-none" src="/border/bottom_right.png" alt="" />
    <div
      className="absolute top-26.75 left-0 bottom-26.75 w-30 pointer-events-none"
      style={{ backgroundImage: 'url(/border/left.png)', backgroundSize: '100% 100%' }}
    />
    <div
      className="absolute top-26.75 right-0 bottom-26.75 w-30 pointer-events-none"
      style={{ backgroundImage: 'url(/border/right.png)', backgroundSize: '100% 100%' }}
    />
    <div
      className="absolute top-0 left-30 right-30 h-26.75 pointer-events-none"
      style={{ backgroundImage: 'url(/border/top.png)', backgroundSize: '100% 100%' }}
    />
    <div
      className="absolute bottom-0 left-30 right-30 h-26.75 pointer-events-none"
      style={{ backgroundImage: 'url(/border/bottom.png)', backgroundSize: '100% 100%' }}
    />
  </div>
)

export default Frame
