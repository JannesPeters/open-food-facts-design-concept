import { Globe, ScanLine, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const highlights = [
  {
    icon: Search,
    title: 'Search & browse',
    description:
      'Explore millions of products by name, brand, category, and label.',
  },
  {
    icon: Sparkles,
    title: 'Scores at a glance',
    description: 'Nutri-Score, NOVA, and Eco-Score shown clearly and visually.',
  },
  {
    icon: ScanLine,
    title: 'Scan a barcode',
    description: 'Use your camera to jump straight to a product page.',
  },
]

function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/off-logo.svg"
              alt="Open Food Facts"
              className="h-9 w-auto dark:hidden"
            />
            <img
              src="/off-logo-dark.svg"
              alt="Open Food Facts"
              className="hidden h-9 w-auto dark:block"
            />
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              Concept
            </span>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/scanner">
              <ScanLine className="size-4" />
              Scanner
            </Link>
          </Button>
        </div>
      </header>

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

        <Button asChild size="lg">
          <Link to="/scanner">
            <ScanLine className="size-5" />
            Open the scanner
          </Link>
        </Button>

        <ul className="grid w-full gap-4 text-left sm:grid-cols-3">
          {highlights.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="rounded-xl border border-border bg-card p-5 text-card-foreground"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Icon className="size-4.5" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                {title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </li>
          ))}
        </ul>
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
