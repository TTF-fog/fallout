import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/admin/ui/tooltip'

function HourValue({ value, label }: { value: number; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default">{value}h</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default function HoursDisplay({
  publicHours,
  internalHours,
  className,
}: {
  publicHours: number | null
  internalHours: number | null
  className?: string
}) {
  if (publicHours == null) return <span className="text-muted-foreground">—</span>

  const internal = internalHours ?? publicHours

  return (
    <TooltipProvider>
      <span className={`font-mono ${className ?? ''}`}>
        <HourValue value={internal} label="Internal" />
        <span className="text-muted-foreground ml-1">
          (<HourValue value={publicHours} label="User facing" />)
        </span>
      </span>
    </TooltipProvider>
  )
}
