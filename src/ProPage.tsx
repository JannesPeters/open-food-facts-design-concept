import {
  ArrowRight,
  CheckCircle2,
  Columns3,
  Database,
  FileSpreadsheet,
  Gauge,
  LayoutGrid,
  Rocket,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import SiteHeader from '@/components/SiteHeader'
import { cn } from '@/lib/utils'

const producersAction = (
  <Button asChild variant="outline" size="sm">
    <Link to="/producers">Why join</Link>
  </Button>
)

const features: Array<{
  icon: typeof FileSpreadsheet
  title: string
  description: string
}> = [
  {
    icon: FileSpreadsheet,
    title: 'Bring any spreadsheet',
    description:
      'Upload the XLSX, ODS, or CSV you already keep. No need to reformat — the platform adapts to your file.',
  },
  {
    icon: Columns3,
    title: 'Match columns once',
    description:
      'Map your column names to Open Food Facts fields with a guided matcher. Save the mapping and reuse it every time.',
  },
  {
    icon: Database,
    title: 'Import at scale',
    description:
      'Push five products or your entire catalogue in one go, with clear validation before anything goes live.',
  },
  {
    icon: Gauge,
    title: 'Coverage insights',
    description:
      'See how complete your data is, which fields are missing, and how your products score — all in one dashboard.',
  },
]

const importSteps: Array<{
  icon: typeof UploadCloud
  label: string
  caption: string
}> = [
  { icon: UploadCloud, label: 'Upload', caption: 'Drop in your spreadsheet' },
  { icon: Columns3, label: 'Match', caption: 'Map columns to OFF fields' },
  { icon: Rocket, label: 'Publish', caption: 'Go live across the ecosystem' },
]

const columnMatches: Array<{ yours: string; off: string }> = [
  { yours: 'EAN', off: 'code' },
  { yours: 'Product title', off: 'product_name' },
  { yours: 'Net weight', off: 'quantity' },
  { yours: 'Ingredients (EN)', off: 'ingredients_text_en' },
]

function ImportPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Stepper */}
      <div className="grid grid-cols-3 gap-px bg-border">
        {importSteps.map((step, index) => {
          const Icon = step.icon
          const active = index === 1
          return (
            <div
              key={step.label}
              className={cn(
                'flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:gap-3',
                active ? 'bg-accent' : 'bg-card',
              )}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground',
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-semibold',
                    active ? 'text-accent-foreground' : 'text-foreground',
                  )}
                >
                  {step.label}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {step.caption}
                </span>
              </span>
            </div>
          )
        })}
      </div>

      {/* Column matcher mock */}
      <div className="space-y-3 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Match your columns
        </p>
        <ul className="space-y-2">
          {columnMatches.map((match) => (
            <li
              key={match.off}
              className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {match.yours}
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-right font-mono text-xs text-muted-foreground">
                {match.off}
              </span>
              <CheckCircle2
                className="size-4 shrink-0 text-success"
                aria-label="Matched"
              />
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between rounded-xl bg-success-subtle px-3 py-2">
          <span className="text-xs font-medium text-success-strong">
            4 of 4 required fields matched
          </span>
          <span className="text-xs font-semibold text-success-strong">
            Ready to publish
          </span>
        </div>
      </div>
    </div>
  )
}

function ProPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader trailing={producersAction} />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                <LayoutGrid className="size-3.5 text-primary" />
                The producer platform
              </span>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Manage your whole catalogue in one place
              </h1>
              <p className="max-w-xl text-balance text-lg text-muted-foreground">
                Import your products from a spreadsheet, keep them accurate, and
                watch your reach and scores — the free workspace built for food
                producers on Open Food Facts.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/producers">
                    Get started
                    <ArrowRight className="size-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <a href="#platform-features">See what you get</a>
                </Button>
              </div>
            </div>
            <div className="lg:pl-4">
              <ImportPreview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="platform-features"
          className="mx-auto w-full max-w-5xl scroll-mt-8 px-6 py-16 sm:py-20"
        >
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              What you get
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Built for real product catalogues
            </h2>
            <p className="text-base text-muted-foreground">
              From a handful of SKUs to tens of thousands, the platform keeps
              importing simple and your data trustworthy.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Credibility */}
        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto w-full max-w-5xl px-6 py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-card text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <h2 className="max-w-xl text-balance text-xl font-semibold text-foreground sm:text-2xl">
                Join international groups, retailers, and up-and-coming food
                startups
              </h2>
              <p className="max-w-xl text-balance text-sm text-muted-foreground">
                Producers and distributors of every size already share their
                product data with the world through Open Food Facts. Your data
                stays open and reusable — and so does theirs.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
          <div className="rounded-3xl border border-border bg-accent/40 px-6 py-14 text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
              Start with a single spreadsheet
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-balance text-muted-foreground">
              Bring the file you already have. We&apos;ll help you map it, check
              it, and share it with millions of shoppers.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/producers">
                  Get started
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/producers">Learn how it works</Link>
              </Button>
            </div>
          </div>
        </section>
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

export default ProPage
