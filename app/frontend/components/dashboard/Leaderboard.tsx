import Frame from '@/components/shared/Frame'

type User = {
  user: string
  hours: number
}

type Props = {
  users: User[]
}

export default function Leaderboard({ users }: Props) {
  return (
    <Frame>
      <div className="flex flex-col space-y-4 mx-4 py-4 w-45">
        <h3 className="text-xl font-bold text-center uppercase">Leaderboard</h3>
        <ul className="space-y-1">
          {users.map((user) => (
            <li key={user.user} className="flex justify-between font-light">
              <span className="text-lg">@{user.user}</span>
              <span className="text-lg">{user.hours}h</span>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  )
}
