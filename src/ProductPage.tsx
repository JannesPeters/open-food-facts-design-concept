import { ArrowLeft, ImageOff, PackageSearch, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import ScoreBadge from '@/components/ScoreBadge'
import SiteHeader from '@/components/SiteHeader'
import { cn } from '@/lib/utils'
import { fetchProductDetails } from '@/lib/openFoodFacts'
import {
  ecoScoreRating,
  novaRating,
  nutriScoreRating,
  sanitizeBarcode,
  splitTags,
} from '@/lib/scores'
import type { ProductDetails } from '@/types'

function TagGroup({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) {
    return null
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-foreground"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  )
}

function BackButton() {
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
          navigate('/')
        }
      }}
    >
      <ArrowLeft className="size-4" />
      Back
    </Button>
  )
}

type Status = 'loading' | 'success' | 'error'

function ProductPage() {
  const params = useParams<{ barcode: string }>()
  const barcode = sanitizeBarcode(params.barcode ?? '')

  const [status, setStatus] = useState<Status>('loading')
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [imageFailed, setImageFailed] = useState(false)

  const requestIdRef = useRef(0)

  const loadProduct = useCallback(async (code: string) => {
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
      const details = await fetchProductDetails(code)
      if (requestId !== requestIdRef.current) {
        return
      }
      setProduct(details)
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
    void loadProduct(barcode)
  }, [barcode, loadProduct])

  const showImage = product?.imageUrl && !imageFailed
  const hasNutrients = product?.nutrients.some(
    (nutrient) => nutrient.value !== null || nutrient.text,
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="mb-6">
          <BackButton />
        </div>

        {status === 'loading' && (
          <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
            <div className="aspect-square animate-pulse rounded-xl bg-muted" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
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
              onClick={() => void loadProduct(barcode)}
            >
              Try again
            </Button>
          </div>
        )}

        {status === 'success' && product && !product.isProductFound && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <PackageSearch className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">
              No product found for barcode{' '}
              <span className="font-medium text-foreground">{barcode}</span>.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/scanner">
                <ScanLine className="size-4" />
                Scan another
              </Link>
            </Button>
          </div>
        )}

        {status === 'success' && product && product.isProductFound && (
          <article className="space-y-10">
            <div className="grid gap-8 md:grid-cols-[minmax(0,320px)_1fr]">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                {showImage ? (
                  <img
                    src={product.imageUrl ?? ''}
                    alt={product.name ?? 'Product'}
                    onError={() => setImageFailed(true)}
                    className="size-full object-contain p-4"
                  />
                ) : (
                  <ImageOff className="size-10 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">
                    {product.barcode}
                  </p>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {product.name ?? 'Unnamed product'}
                  </h1>
                  {product.brands && (
                    <p className="text-muted-foreground">{product.brands}</p>
                  )}
                </div>

                {(product.nutriScore ||
                  product.ecoScore ||
                  product.novaGroup !== null) && (
                  <div className="flex flex-wrap gap-2">
                    {product.nutriScore && (
                      <ScoreBadge
                        label="Nutri-Score"
                        value={product.nutriScore}
                        rating={nutriScoreRating[product.nutriScore] ?? 3}
                      />
                    )}
                    {product.ecoScore && (
                      <ScoreBadge
                        label="Eco-Score"
                        value={product.ecoScore}
                        rating={ecoScoreRating[product.ecoScore] ?? 3}
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
                )}

                <dl className="grid grid-cols-2 gap-4 text-sm">
                  {product.quantity && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Quantity
                      </dt>
                      <dd className="mt-0.5 text-foreground">
                        {product.quantity}
                      </dd>
                    </div>
                  )}
                  {product.servingSize && (
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Serving size
                      </dt>
                      <dd className="mt-0.5 text-foreground">
                        {product.servingSize}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="space-y-3">
                  {product.categories && (
                    <TagGroup
                      label="Categories"
                      values={splitTags(product.categories)}
                    />
                  )}
                  {product.labels && (
                    <TagGroup label="Labels" values={splitTags(product.labels)} />
                  )}
                  {product.allergens && (
                    <TagGroup
                      label="Allergens"
                      values={splitTags(product.allergens)}
                    />
                  )}
                  {product.ingredientsAnalysis && (
                    <TagGroup
                      label="Dietary analysis"
                      values={splitTags(product.ingredientsAnalysis)}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Ingredients
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {product.ingredients ??
                    'No ingredients were provided by Open Food Facts for this product.'}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Nutrition
                </h2>
                {hasNutrients ? (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50 text-left">
                          <th className="px-4 py-2 font-medium text-muted-foreground">
                            Typical values
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                            Per 100&nbsp;g
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.nutrients.map((nutrient) => (
                          <tr
                            key={nutrient.id}
                            className="border-b border-border last:border-b-0"
                          >
                            <th
                              scope="row"
                              className={cn(
                                'px-4 py-2 text-left font-normal text-foreground',
                                nutrient.indent && 'pl-8 text-muted-foreground',
                              )}
                            >
                              {nutrient.label}
                            </th>
                            <td className="px-4 py-2 text-right tabular-nums text-foreground">
                              {nutrient.text
                                ? nutrient.text
                                : nutrient.value !== null
                                  ? `${nutrient.value} ${nutrient.unit}`.trim()
                                  : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No nutrition information was provided by Open Food Facts for
                    this product.
                  </p>
                )}
              </section>
            </div>
          </article>
        )}
      </main>
    </div>
  )
}

export default ProductPage
