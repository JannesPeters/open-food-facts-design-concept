import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Camera,
  ChevronDown,
  Globe2,
  ScrollText,
  Sparkles,
  UploadCloud,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import SiteHeader, { HeaderBackButton } from '@/components/SiteHeader'
import { cn } from '@/lib/utils'

const proAction = (
  <Button asChild size="sm">
    <Link to="/pro">
      Producer platform
      <ArrowRight className="size-4" />
    </Link>
  </Button>
)

const benefits: Array<{
  icon: typeof BadgeCheck
  title: string
  description: string
}> = [
  {
    icon: BadgeCheck,
    title: 'Accurate, up-to-date data',
    description:
      'Publish straight from the source. No transcription errors, no stale nutrition tables — the facts come directly from you.',
  },
  {
    icon: Camera,
    title: 'Studio-quality photos',
    description:
      'Replace variable crowd photos with your own clean pack shots of the front, ingredients, and nutrition panel.',
  },
  {
    icon: Globe2,
    title: 'Seen in 100+ apps',
    description:
      'Your data flows into Open Food Facts and the 100+ apps, retailers, and services that build on the open database.',
  },
  {
    icon: BarChart3,
    title: 'Free stats & scores',
    description:
      'Get Nutri-Score, Eco-Score, and NOVA computed for your catalogue, plus coverage statistics — at no cost.',
  },
]

const steps: Array<{
  icon: typeof UserPlus
  title: string
  description: string
}> = [
  {
    icon: UserPlus,
    title: 'Create a producer account',
    description:
      'Sign up in minutes and tell us which brands are yours so your products are marked as verified by the manufacturer.',
  },
  {
    icon: UploadCloud,
    title: 'Send photos & data',
    description:
      'Add a few products by hand, or bulk-import your whole catalogue from a spreadsheet you already have.',
  },
  {
    icon: Sparkles,
    title: 'Go live everywhere',
    description:
      'Your products appear across Open Food Facts and every app built on it — enriched with scores and indicators.',
  },
]

const trustedBy = [
  'Carrefour',
  'System U',
  'Casino',
  'Fleury Michon',
  'Sodebo',
  'Monoprix',
  'Franprix',
]

const dataFields: Array<{ group: string; fields: string }> = [
  {
    group: 'Identity',
    fields: 'Barcode, product & generic name, brands, quantity, categories',
  },
  {
    group: 'Ingredients',
    fields: 'Ingredient list, allergens, traces, labels, origins',
  },
  {
    group: 'Nutrition (per 100 g / 100 ml)',
    fields: 'Energy, fat, saturates, carbs, sugars, fibre, protein, salt',
  },
  {
    group: 'Sustainability',
    fields: 'Packaging, materials, recycling, carbon footprint',
  },
]

function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('max-w-2xl space-y-3', className)}>
      <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
        {eyebrow}
      </span>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="text-base text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

function DataDisclosure() {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <ScrollText className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-foreground">
              What data can I send?
            </span>
            <span className="block text-xs text-muted-foreground">
              Send as much or as little as you have — every field helps.
            </span>
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && (
        <dl className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
          {dataFields.map((item) => (
            <div key={item.group} className="bg-card px-5 py-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {item.group}
              </dt>
              <dd className="mt-1 text-sm text-foreground">{item.fields}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

function ProducersPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader leading={<HeaderBackButton />} trailing={proAction} />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
            <div className="max-w-2xl space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                For producers, brands & retailers
              </span>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Put your products in front of the world
              </h1>
              <p className="max-w-xl text-balance text-lg text-muted-foreground">
                Share your product data with Open Food Facts and reach millions
                of shoppers across 100+ apps — accurate, on-brand, and always up
                to date. It&apos;s free, and the data stays open.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/pro">
                    Explore the platform
                    <ArrowRight className="size-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
              <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
                {[
                  ['Free', 'to join & use'],
                  ['Open data', 'ODbL licensed'],
                  ['100+ apps', 'reuse your data'],
                ].map(([value, label]) => (
                  <div key={value}>
                    <dt className="text-lg font-semibold text-foreground">
                      {value}
                    </dt>
                    <dd className="text-xs text-muted-foreground">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Why join */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="Why join"
            title="The easiest way to control how your products show up"
            description="When the data comes from you, everyone downstream gets it right — from shoppers comparing shelves to the apps and retailers building on the database."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Trusted by */}
        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto w-full max-w-5xl px-6 py-12 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Trusted by leading producers &amp; distributors
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {trustedBy.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground"
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-5xl scroll-mt-8 px-6 py-16 sm:py-20"
        >
          <SectionHeading
            eyebrow="How it works"
            title="Live in three simple steps"
            description="Whether you have five products or fifty thousand, the path is the same."
          />
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <li
                  key={step.title}
                  className="relative rounded-2xl border border-border bg-card p-6"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Step {index + 1}
                  </span>
                  <span className="mt-4 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              )
            })}
          </ol>
          <div className="mt-6">
            <DataDisclosure />
          </div>
        </section>

        {/* Licence & trust */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-16 sm:pb-20">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Open by design, yours to reuse
                </h2>
                <p className="text-sm text-muted-foreground">
                  Data you share is published under the Open Database License
                  (ODbL) and photos under Creative Commons (CC-BY-SA) — freely
                  reusable by everyone, including you. Verifiable against real
                  pack photos, the way Open Food Facts has always worked.
                </p>
              </div>
              <Button asChild variant="outline">
                <a
                  href="https://world.openfoodfacts.org/terms-of-use"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the terms
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-border bg-accent/40">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 text-center sm:py-20">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
              Ready to share your products?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-balance text-muted-foreground">
              Join the producers already reaching millions of shoppers through
              the open database.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link to="/pro">
                  Explore the producer platform
                  <ArrowRight className="size-5" />
                </Link>
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

export default ProducersPage
