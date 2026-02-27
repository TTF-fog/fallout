type Props = {
  koiBalance: number
  mail: boolean
}

export default function Header({ koiBalance, mail }: Props) {
  return (
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
  )
}
