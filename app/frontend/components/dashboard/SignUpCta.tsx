import Frame from '@/components/shared/Frame'

type Props = {
  onSignUp: () => void
}

export default function SignUpCta({ onSignUp }: Props) {
  return (
    <Frame>
      <div className="flex flex-col items-center text-center space-y-4 py-4 mx-4">
        <div className="space-y-1">
          <h3 className="font-bold text-xl">Connect your account!</h3>
          <p className="text-sm">& get stickers shipped to you!</p>
        </div>
        <button
          onClick={onSignUp}
          className="py-1.5 px-4 bg-brown text-light-brown border-2 border-dark-brown font-bold w-full uppercase"
        >
          Sign up
        </button>
      </div>
    </Frame>
  )
}
