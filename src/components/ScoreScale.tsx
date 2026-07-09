import { cn } from '@/lib/utils'
import { ratingClasses } from '@/lib/scores'

export type ScoreSegment = { value: string; rating: number }

function ScoreScale({
  label,
  segments,
  activeIndex,
}: {
  label: string
  segments: ScoreSegment[]
  activeIndex: number
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="inline-flex items-center rounded-md">
        {segments.map((segment, index) => (
          <span
            key={segment.value}
            aria-current={index === activeIndex ? 'true' : undefined}
            className={cn(
              'relative flex size-7 items-center justify-center text-xs font-semibold first:rounded-l-md last:rounded-r-md',
              ratingClasses[segment.rating] ??
                'bg-secondary text-secondary-foreground',
              index === activeIndex
                ? 'z-10 scale-125 rounded-md font-bold shadow-md ring-2 ring-background'
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
