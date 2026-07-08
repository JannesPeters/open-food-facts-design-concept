import { ArrowLeft, ImageOff, ScanLine, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { searchProducts } from '@/lib/openFoodFacts'
import type { ProductSearchResult } from '@/types'

const exampleQueries = ['Nutella', 'Oat milk', 'Granola', 'Sparkling water']

const ratingClasses: Record<number, string> = {
  1: 'bg-rating-1 text-rating-1-foreground',
  2: 'bg-rating-2 text-rating-2-foreground',
  3: 'bg-rating-3 text-rating-3-foreground',
  4: 'bg-rating-4 text-rating-4-foreground',
  5: 'bg-rating-5 text-rating-5-foreground',
}

const nutriScoreRating: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
}

const novaRating: Record<number, number> = {
  1: 1,
  2: 3,
  3: 4,
  4: 5,
}

function ScoreBadge({ label, value, rating }: {
  label: string
  value: string
  rating: number
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
        ratingClasses[rating] ?? 'bg-secondary text-secondary-foreground',
      )}
    >
      <span className="opacity-80">{label}</span>
      <span>{value}</span>
    </span>
  )
}

function ResultCard({ product }: { product: ProductSearchResult }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = product.imageUrl && !imageFailed

  return (
    <li className="group flex overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-colors hover:border-primary focus-within:border-primary">
      <Link
        to={`/product/${product.barcode}`}
        className="flex flex-1 flex-col overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted">
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

          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {product.nutriScore && (
              <ScoreBadge
                label="Nutri"
                value={product.nutriScore}
                rating={nutriScoreRating[product.nutriScore] ?? 3}
              />
            )}
            {product.novaGroup !== null && (
              <ScoreBadge
                label="NOVA"
                value={String(product.novaGroup)}
                rating={novaRating[product.novaGroup] ?? 3}
              />
            )}
          </div>
        </div>
      </Link>
    </li>
  )
}

function ResultSkeleton() {
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-2 flex gap-1.5">
          <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
          <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </li>
  )
}

type Status = 'idle' | 'loading' | 'success' | 'error'

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeQuery = searchParams.get('q')?.trim() ?? ''

  const [inputValue, setInputValue] = useState(activeQuery)
  const [status, setStatus] = useState<Status>('idle')
  const [results, setResults] = useState<ProductSearchResult[]>([])
  const [count, setCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const requestIdRef = useRef(0)

  const runSearch = useCallback(async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setStatus('idle')
      setResults([])
      setCount(0)
      return
    }

    const requestId = ++requestIdRef.current
    setStatus('loading')
    setErrorMessage(null)

    try {
      const response = await searchProducts(trimmed)
      if (requestId !== requestIdRef.current) {
        return
      }
      setResults(response.results)
      setCount(response.count)
      setStatus('success')
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.',
      )
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    setInputValue(activeQuery)
    void runSearch(activeQuery)
  }, [activeQuery, runSearch])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = inputValue.trim()
    if (trimmed) {
      setSearchParams({ q: trimmed })
    } else {
      setSearchParams({})
    }
  }

  const handleClear = () => {
    setInputValue('')
    setSearchParams({})
  }

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

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-8 space-y-6">
          <div className="space-y-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to="/">
                <ArrowLeft className="size-4" />
                Home
              </Link>
            </Button>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Search &amp; browse
            </h1>
            <p className="text-muted-foreground">
              Explore millions of products by name, brand, or category.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Search for a product…"
                aria-label="Search for a product"
                autoFocus
                className="pl-9 pr-9"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button type="submit">Search</Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Try:</span>
            {exampleQueries.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setSearchParams({ q: example })}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <Search className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              Start typing to search the Open Food Facts database.
            </p>
          </div>
        )}

        {status === 'loading' && (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <ResultSkeleton key={index} />
            ))}
          </ul>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 py-16 text-center">
            <p className="max-w-md text-sm text-muted-foreground">
              {errorMessage}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void runSearch(activeQuery)}
            >
              Try again
            </Button>
          </div>
        )}

        {status === 'success' && results.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
            <p className="text-sm text-muted-foreground">
              No products found for{' '}
              <span className="font-medium text-foreground">
                “{activeQuery}”
              </span>
              . Try a different search.
            </p>
          </div>
        )}

        {status === 'success' && results.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {count.toLocaleString()}{' '}
              {count === 1 ? 'result' : 'results'} for{' '}
              <span className="font-medium text-foreground">
                “{activeQuery}”
              </span>
            </p>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((product) => (
                <ResultCard key={product.barcode} product={product} />
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}

export default SearchPage
