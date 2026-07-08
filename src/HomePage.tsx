import { ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Open Food Facts
        </h1>
        <p className="mx-auto max-w-md text-balance text-muted-foreground">
          A modern way to explore what&apos;s in your food.
        </p>
      </div>

      <Button asChild size="lg">
        <Link to="/scanner">
          <ScanLine className="size-5" />
          Open the scanner
        </Link>
      </Button>
    </main>
  )
}

export default HomePage
