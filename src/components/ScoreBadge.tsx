import { cn } from '@/lib/utils'
import { ratingClasses } from '@/lib/scores'

const sizeClasses = {
  sm: 'gap-1 px-2 py-0.5 text-xs',
  md: 'gap-1.5 px-3 py-1 text-sm',
} as const

function ScoreBadge({
  label,
  value,
  rating,
  size = 'md',
}: {
  label: string
  value: string
  rating: number
  size?: keyof typeof sizeClasses
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        sizeClasses[size],
        ratingClasses[rating] ?? 'bg-secondary text-secondary-foreground',
      )}
    >
      <span className="opacity-80">{label}</span>
      <span>{value}</span>
    </span>
  )
}

export default ScoreBadge
