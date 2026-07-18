import { ArrowLeft, ImageOff, PackageSearch } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import SiteHeader from '@/components/SiteHeader'
import { fetchPriceHistory, fetchProductDetails } from '@/lib/openFoodFacts'
import { sanitizeBarcode } from '@/lib/scores'
import type { PriceRecord, ProductDetails } from '@/types'

const formatPriceValue = (value: number, currency: string | null): string => {
  if (!currency) {
    return value.toFixed(2)
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

const formatPriceDate = (value: string | null): string | null => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatLocation = (record: PriceRecord): string | null => {
  const parts = [
    record.locationName,
    record.locationCity,
    record.locationCountry,
  ].filter((part): part is string => Boolean(part))

  if (parts.length === 0) {
    return null
  }

  // Avoid repeating the city when it already appears in the name.
  return parts.join(' · ')
}

function BackButton({ barcode }: { barcode: string }) {
  const navigate = useNavigate()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2"
      onClick={() => {
        if (window.history.length > 1) {
          navigate(-1)
        } else {
          navigate(`/product/${barcode}`)
        }
      }}
    >
      <ArrowLeft className="size-4" />
      Back
    </Button>
  )
}

type Status = 'loading' | 'success' | 'error'

function PricesPage() {
  const params = useParams<{ barcode: string }>()
  const barcode = sanitizeBarcode(params.barcode ?? '')

  const [status, setStatus] = useState<Status>('loading')
  const [records, setRecords] = useState<PriceRecord[]>([])
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const requestIdRef = useRef(0)

  const loadPrices = useCallback(async (code: string) => {
    if (!code) {
      setStatus('error')
      setErrorMessage('No valid barcode was provided.')
      return
    }

    const requestId = ++requestIdRef.current
    setStatus('loading')
    setErrorMessage(null)
    setImageFailed(false)

    try {
      const [history, details] = await Promise.all([
        fetchPriceHistory(code),
        fetchProductDetails(code).catch(() => null),
      ])
      if (requestId !== requestIdRef.current) {
        return
      }
      setRecords(history)
      setProduct(details && details.isProductFound ? details : null)
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
    void loadPrices(barcode)
  }, [barcode, loadPrices])

  const showImage = Boolean(product?.imageUrl) && !imageFailed

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader leading={<BackButton barcode={barcode} />} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-10 pt-6">
        <div className="flex gap-4">
          {showImage ? (
            <div className="flex aspect-square w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card sm:w-24">
              <img
                src={product?.imageUrl ?? ''}
                alt={product?.name ?? 'Product'}
                onError={() => setImageFailed(true)}
                className="size-full object-contain p-2"
              />
            </div>
          ) : product ? (
            <div className="flex aspect-square w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card sm:w-24">
              <ImageOff className="size-6 text-muted-foreground" />
            </div>
          ) : null}

          <div className="min-w-0 space-y-1">
            <Link
              to={`/product/${barcode}`}
              className="font-mono text-xs text-muted-foreground hover:underline"
            >
              {barcode}
            </Link>
            {product?.name && (
              <h2 className="text-lg font-semibold leading-tight text-foreground">
                {product.name}
              </h2>
            )}
            {product?.brands && (
              <p className="text-sm text-muted-foreground">{product.brands}</p>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Price history
          </h1>
          <p className="text-sm text-muted-foreground">
            Every crowdsourced price reported to{' '}
            <a
              href="https://prices.openfoodfacts.org/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Open Prices
            </a>{' '}
            for this product, newest first.
          </p>
        </div>

        <div className="mt-6">
          {status === 'loading' && (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((key) => (
                <div
                  key={key}
                  className="h-16 w-full animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 py-16 text-center">
              <p className="max-w-md text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadPrices(barcode)}
              >
                Try again
              </Button>
            </div>
          )}

          {status === 'success' && records.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <PackageSearch className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No prices have been reported for this product yet.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to={`/product/${barcode}`}>Back to product</Link>
              </Button>
            </div>
          )}

          {status === 'success' && records.length > 0 && (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {records.map((record) => {
                const price =
                  record.price !== null
                    ? formatPriceValue(record.price, record.currency)
                    : '—'
                const original =
                  record.isDiscounted && record.priceWithoutDiscount !== null
                    ? formatPriceValue(
                        record.priceWithoutDiscount,
                        record.currency,
                      )
                    : null
                const date = formatPriceDate(record.date)
                const location = formatLocation(record)

                return (
                  <li
                    key={record.id}
                    className="flex items-start justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {date ?? 'Unknown date'}
                      </p>
                      {location && (
                        <p className="truncate text-xs text-muted-foreground">
                          {location}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {price}
                      </p>
                      {original && (
                        <p className="text-xs text-muted-foreground">
                          <span className="line-through">{original}</span>{' '}
                          <span className="font-medium text-success">
                            discounted
                          </span>
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

export default PricesPage
