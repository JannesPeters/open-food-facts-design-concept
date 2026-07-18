import { Clock3, ImageOff, ScanLine, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ScoreBadge from '@/components/ScoreBadge'
import { Button } from '@/components/ui/button'
import { readRecentlyViewedProducts } from '@/lib/recentlyViewed'
import { ecoScoreRating, novaRating, nutriScoreRating } from '@/lib/scores'
import { cn } from '@/lib/utils'
import type { RecentlyViewedProduct } from '@/lib/recentlyViewed'

function formatViewedAt(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const minuteMs = 60 * 1000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.round(diffMs / minuteMs))
    return `${minutes}m ago`
  }

  if (diffMs < dayMs) {
    return `${Math.round(diffMs / hourMs)}h ago`
  }

  if (diffMs < 7 * dayMs) {
    return `${Math.round(diffMs / dayMs)}d ago`
  }

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function RecentlyViewedCard({ product }: { product: RecentlyViewedProduct }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = product.imageUrl && !imageFailed

  return (
    <li className="group flex overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-colors hover:border-primary focus-within:border-primary">
      <Link
        to={`/product/${product.barcode}`}
        className="flex flex-1 flex-col overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex aspect-[2/1] items-center justify-center overflow-hidden bg-muted">
          {showImage ? (
            <img
              src={product.imageUrl ?? ''}
              alt={product.name ?? 'Product'}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="size-full object-contain p-3 transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <ImageOff className="size-8 text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">
              {product.name ?? 'Unnamed product'}
            </h3>
            {product.brands && (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {product.brands}
              </p>
            )}
          </div>

          {product.quantity && (
            <p className="text-xs text-muted-foreground">{product.quantity}</p>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {product.nutriScore && (
                <ScoreBadge
                  label="Nutri"
                  value={product.nutriScore}
                  rating={nutriScoreRating[product.nutriScore] ?? 3}
                  size="sm"
                />
              )}
              {product.ecoScore && (
                <ScoreBadge
                  label="Eco"
                  value={product.ecoScore}
                  rating={ecoScoreRating[product.ecoScore] ?? 3}
                  size="sm"
                />
              )}
              {product.novaGroup !== null && (
                <ScoreBadge
                  label="NOVA"
                  value={String(product.novaGroup)}
                  rating={novaRating[product.novaGroup] ?? 3}
                  size="sm"
                />
              )}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" />
              {formatViewedAt(product.viewedAt)}
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}

function HomePage() {
  const [recentProducts, setRecentProducts] = useState<RecentlyViewedProduct[]>([])

  useEffect(() => {
    setRecentProducts(readRecentlyViewedProducts())
  }, [])

  return (
    <div className="flex min-h-dvh flex-col">
      <main
        className={cn(
          'mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-12 px-6 text-center',
          recentProducts.length > 0 ? 'py-12' : 'justify-center py-16',
        )}
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <img
              src="/off-logo.svg"
              alt="Open Food Facts"
              className="h-12 w-auto dark:hidden sm:h-14"
            />
            <img
              src="/off-logo-dark.svg"
              alt="Open Food Facts"
              className="hidden h-12 w-auto dark:block sm:h-14"
            />
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
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

        {recentProducts.length > 0 && (
          <section className="w-full space-y-4 text-left">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Recently viewed
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/search">Search more</Link>
              </Button>
            </div>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {recentProducts.map((product) => (
                <RecentlyViewedCard key={product.barcode} product={product} />
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-6 text-center text-xs text-muted-foreground">
          <p>
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
          </p>
          <p className="mt-2">
            Are you a producer?{' '}
            <Link
              to="/producers"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Share your products
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
