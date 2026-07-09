import { Globe, ScanLine, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import SiteHeader from '@/components/SiteHeader'

function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader trailing={null} />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-12 px-6 py-16 text-center">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <Globe className="size-3.5" />
            The open food database
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Know what&apos;s in your food
          </h1>
          <p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground">
            Open Food Facts is a free, open, and collaborative database of food
            products from around the world. Anyone can explore ingredients,
            nutrition facts, and environmental impact — and anyone can
            contribute. This is a modern, consumer-first take on that mission.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/scanner">
              <ScanLine className="size-5" />
              Open the scanner
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/search">
              <Search className="size-5" />
              Search
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-6 text-center text-xs text-muted-foreground">
          A design concept built on public{' '}
          <a
            href="https://world.openfoodfacts.org/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Open Food Facts
          </a>{' '}
          data. Not affiliated with or endorsed by Open Food Facts.
        </div>
      </footer>
    </div>
  )
}

export default HomePage
