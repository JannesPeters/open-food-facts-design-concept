import { cn } from '@/lib/utils'
import { ratingClasses } from '@/lib/scores'

export type ScoreSegment = { value: string; rating: number }

function ScoreScale({
  label,
  segments,
  activeIndex,
  hideLabel = false,
  size = 'md',
}: {
  label: string
  segments: ScoreSegment[]
  activeIndex: number
  hideLabel?: boolean
  size?: 'sm' | 'md'
}) {
  const segmentClasses =
    size === 'sm'
      ? 'relative flex size-6 items-center justify-center text-[10px] font-semibold first:rounded-l-sm last:rounded-r-sm'
      : 'relative flex size-7 items-center justify-center text-xs font-semibold first:rounded-l-sm last:rounded-r-sm'

  const activeClasses =
    size === 'sm'
      ? 'z-10 scale-[1.15] rounded-sm font-bold shadow-sm ring-2 ring-background'
      : 'z-10 scale-[1.3] rounded-sm font-bold shadow-md ring-2 ring-background'

  return (
    <div className="space-y-1.5">
      {!hideLabel && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      )}
      <div className="inline-flex items-center rounded-sm">
        {segments.map((segment, index) => (
          <span
            key={segment.value}
            aria-current={index === activeIndex ? 'true' : undefined}
            className={cn(
              segmentClasses,
              ratingClasses[segment.rating] ??
                'bg-secondary text-secondary-foreground',
              index === activeIndex
                ? activeClasses
                : 'opacity-30',
            )}
          >
            {segment.value}
          </span>
        ))}
      </div>
    </div>
  )
}

export default ScoreScale
