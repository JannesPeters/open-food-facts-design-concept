import { ArrowLeft, PackageSearch } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import SiteHeader from '@/components/SiteHeader'
import { fetchProductDetails } from '@/lib/openFoodFacts'
import { sanitizeBarcode } from '@/lib/scores'
import type { ProductDetails } from '@/types'

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

function PhotosPage() {
  const params = useParams<{ barcode: string }>()
  const barcode = sanitizeBarcode(params.barcode ?? '')

  const [status, setStatus] = useState<Status>('loading')
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const loadPhotos = useCallback(async (code: string) => {
    if (!code) {
      setStatus('error')
      setErrorMessage('No valid barcode was provided.')
      return
    }

    const requestId = ++requestIdRef.current
    setStatus('loading')
    setErrorMessage(null)

    try {
      const details = await fetchProductDetails(code)
      if (requestId !== requestIdRef.current) {
        return
      }

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
    void loadPhotos(barcode)
  }, [barcode, loadPhotos])

  const photoSummary = product?.photoSummary ?? null

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader leading={<BackButton barcode={barcode} />} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-10 pt-6">
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
                onClick={() => void loadPhotos(barcode)}
              >
                Try again
              </Button>
            </div>
          )}

          {status === 'success' && (!photoSummary || photoSummary.totalCount === 0) && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <PackageSearch className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                No additional photos are available for this product yet.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to={`/product/${barcode}`}>Back to product</Link>
              </Button>
            </div>
          )}

          {status === 'success' && photoSummary && photoSummary.totalCount > 0 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {photoSummary.totalCount}{' '}
                  {photoSummary.totalCount === 1 ? 'photo' : 'photos'}
                </p>
              </div>

              <div className="space-y-5">
                {photoSummary.categories.map((category) => (
                  <section key={category.key} className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="text-sm font-semibold text-foreground">
                        {category.label}
                      </h2>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {category.count}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {category.photos.map((photo, photoIndex) => (
                        <a
                          key={`${photo.id}:${photoIndex}`}
                          href={photo.url}
                          target="_blank"
                          rel="noreferrer"
                          className="group block aspect-square overflow-hidden rounded-lg border border-border bg-card"
                        >
                          <img
                            src={photo.url}
                            alt={`${category.label} photo ${photoIndex + 1}`}
                            loading="lazy"
                            className="size-full object-contain p-1 transition-transform group-hover:scale-[1.02]"
                          />
                        </a>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default PhotosPage
