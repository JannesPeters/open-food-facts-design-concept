import {
  ArrowRight,
  Camera,
  Code2,
  Heart,
  Languages,
  Megaphone,
  Palette,
  PencilLine,
  ScanLine,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import SiteHeader, { HeaderBackButton } from '@/components/SiteHeader'
import { cn } from '@/lib/utils'

const scanAction = (
  <Button asChild size="sm">
    <Link to="/scanner">
      Add a product
      <ScanLine className="size-4" />
    </Link>
  </Button>
)

const steps: Array<{
  icon: typeof ScanLine
  title: string
  description: string
}> = [
  {
    icon: ScanLine,
    title: 'Scan a product',
    description:
      'Point your camera at any barcode. If the product isn’t in the database yet, you can add it in seconds.',
  },
  {
    icon: Camera,
    title: 'Take a few photos',
    description:
      'Snap the front, the ingredients list, and the nutrition table. Clear photos are the single most useful thing you can add.',
  },
  {
    icon: PencilLine,
    title: 'Fill in the blanks',
    description:
      'Add a name, category, or missing detail — or fix something that looks wrong. Every small edit makes the data better for everyone.',
  },
]

const otherWays: Array<{
  icon: typeof Languages
  title: string
  description: string
  href: string
  cta: string
}> = [
  {
    icon: Languages,
    title: 'Translate',
    description:
      'Help make Open Food Facts readable in your language, from the app to ingredient and category names.',
    href: 'https://translate.openfoodfacts.org/',
    cta: 'Start translating',
  },
  {
    icon: Code2,
    title: 'Code',
    description:
      'Build the app, the website, the API, or one of the many open-source SDKs. It’s all on GitHub.',
    href: 'https://github.com/openfoodfacts',
    cta: 'Explore on GitHub',
  },
  {
    icon: Palette,
    title: 'Design',
    description:
      'Improve the user experience, the visuals, and the way the project presents itself to the world.',
    href: 'https://github.com/openfoodfacts/openfoodfacts-design',
    cta: 'Join the design effort',
  },
  {
    icon: Megaphone,
    title: 'Spread the word',
    description:
      'Tell friends, start a local community, or help with media and outreach so more people can join in.',
    href: 'https://world.openfoodfacts.org/',
    cta: 'Get the word out',
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

function ContributorsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader leading={<HeaderBackButton />} trailing={scanAction} />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
            <div className="max-w-2xl space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                <Sparkles className="size-3.5 text-primary" />
                For everyone who eats
              </span>
              <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Open Food Facts is built by people like you
              </h1>
              <p className="max-w-xl text-balance text-lg text-muted-foreground">
                Every product and every fact was added by a volunteer. With your
                phone and a couple of minutes, you can help build the world’s
                largest open database of food — free and open for all.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/scanner">
                    Scan &amp; add a product
                    <ScanLine className="size-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <a href="#how-to-help">See how to help</a>
                </Button>
              </div>
              <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
                {[
                  ['Free', 'no account needed to start'],
                  ['A few minutes', 'is all it takes'],
                  ['Open data', 'used by 100+ apps'],
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

        {/* How to help */}
        <section
          id="how-to-help"
          className="mx-auto w-full max-w-5xl scroll-mt-8 px-6 py-16 sm:py-20"
        >
          <SectionHeading
            eyebrow="The easiest way to help"
            title="Add and improve products in three steps"
            description="You don’t need to be an expert. If you can take a photo, you can contribute."
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
        </section>

        {/* Why it matters */}
        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto w-full max-w-5xl px-6 py-14 sm:py-16">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
              <SectionHeading
                eyebrow="Why it matters"
                title="Small edits, big impact"
              />
              <p className="text-base text-muted-foreground">
                Open Food Facts is a non-profit database powered entirely by
                volunteers. The data you add helps shoppers compare products,
                avoid allergens, and eat better — and it flows into more than 100
                apps, researchers, and public-health projects around the world.
              </p>
            </div>
          </div>
        </section>

        {/* More ways to contribute */}
        <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
          <SectionHeading
            eyebrow="More ways to contribute"
            title="Have other skills to share?"
            description="Data entry is just the start. However you like to help, there’s a place for you in the community."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {otherWays.map((way) => {
              const Icon = way.icon
              return (
                <div
                  key={way.title}
                  className="flex flex-col rounded-2xl border border-border bg-card p-6"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {way.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm text-muted-foreground">
                    {way.description}
                  </p>
                  <a
                    href={way.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {way.cta}
                    <ArrowRight className="size-4" />
                  </a>
                </div>
              )
            })}
          </div>
        </section>

        {/* Support */}
        <section className="mx-auto w-full max-w-5xl px-6 pb-16 sm:pb-20">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Heart className="size-5" />
                </span>
                <div className="max-w-xl space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    Prefer to support with a donation?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Open Food Facts is a non-profit that runs on donations. If
                    you can’t contribute time, a gift helps keep the data free
                    and independent for everyone.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline">
                <a
                  href="https://world.openfoodfacts.org/donate-to-open-food-facts"
                  target="_blank"
                  rel="noreferrer"
                >
                  Donate
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
              Ready to add your first product?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-balance text-muted-foreground">
              Grab your phone, scan something in your kitchen, and see how easy
              it is to make the database a little better.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link to="/scanner">
                  Start scanning
                  <ScanLine className="size-5" />
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

export default ContributorsPage
