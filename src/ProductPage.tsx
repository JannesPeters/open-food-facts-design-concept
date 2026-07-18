import { ArrowLeft, ImageOff, PackageSearch, ScanLine } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import ScoreScale, { type ScoreSegment } from '@/components/ScoreScale'
import SiteHeader from '@/components/SiteHeader'
import { cn } from '@/lib/utils'
import { fetchProductDetails } from '@/lib/openFoodFacts'
import { recordRecentlyViewedProduct } from '@/lib/recentlyViewed'
import {
  ecoScoreRating,
  novaRating,
  nutrientLevelLabel,
  nutrientLevelRating,
  nutriScoreRating,
  ratingClasses,
  sanitizeBarcode,
  splitTags,
} from '@/lib/scores'
import type { NutrientLevel, ProductDetails } from '@/types'

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

function NutrientLevels({ levels }: { levels: NutrientLevel[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Nutrient levels</h2>
      <p className="text-sm text-muted-foreground">
        As sold, per 100&nbsp;g. Based on Open Food Facts thresholds for fat,
        saturated fat, sugars, and salt.
      </p>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {levels.map((level) => {
          const rating = nutrientLevelRating[level.level] ?? 3
          return (
            <li
              key={level.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'size-2.5 shrink-0 rounded-full',
                    ratingClasses[rating] ?? 'bg-secondary',
                  )}
                  aria-hidden
                />
                <span className="text-sm font-medium text-foreground">
                  {level.label}
                </span>
                {level.value !== null && (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {level.value}
                    {level.unit}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  ratingClasses[rating] ?? 'bg-secondary text-secondary-foreground',
                )}
              >
                {nutrientLevelLabel[level.level] ?? level.level}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

const gradeSegments: ScoreSegment[] = ['A', 'B', 'C', 'D', 'E'].map(
  (value, index) => ({ value, rating: index + 1 }),
)

const novaSegments: ScoreSegment[] = [1, 2, 3, 4].map((value) => ({
  value: String(value),
  rating: novaRating[value] ?? 3,
}))

type ScoreItem = {
  label: string
  value: string
  segments: ScoreSegment[]
  activeIndex: number
}

function getScoreItems(product: ProductDetails): ScoreItem[] {
  const items: ScoreItem[] = []
  const nutriGrade = product.nutriScore?.toUpperCase()
  const ecoGrade = product.ecoScore?.toUpperCase()

  if (nutriGrade) {
    items.push({
      label: 'Nutri-Score',
      value: nutriGrade,
      segments: gradeSegments,
      activeIndex: (nutriScoreRating[nutriGrade] ?? 3) - 1,
    })
  }

  if (ecoGrade) {
    items.push({
      label: 'Eco-Score',
      value: ecoGrade,
      segments: gradeSegments,
      activeIndex: (ecoScoreRating[ecoGrade] ?? 3) - 1,
    })
  }

  if (product.novaGroup !== null) {
    items.push({
      label: 'Nova-Class',
      value: String(product.novaGroup),
      segments: novaSegments,
      activeIndex: product.novaGroup - 1,
    })
  }

  return items
}

function ScoreBadges({
  product,
  className,
  mobile,
}: {
  product: ProductDetails
  className?: string
  mobile?: boolean
}) {
  const scoreItems = getScoreItems(product)

  if (scoreItems.length === 0) {
    return null
  }

  if (mobile) {
    return (
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border',
          className,
        )}
      >
        {scoreItems.map((score, index) => (
          <div
            key={score.label}
            className={cn(
              'flex items-center justify-between gap-4 px-4 py-2',
              index > 0 && 'border-t border-border',
            )}
          >
            <span className="text-sm font-medium text-foreground">
              {score.label}
            </span>
            <div className="shrink-0">
              <ScoreScale
                label={score.label}
                segments={score.segments}
                activeIndex={score.activeIndex}
                hideLabel
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {scoreItems.map((score) => (
        <div key={score.label} className="min-w-0">
          <ScoreScale
            label={score.label}
            segments={score.segments}
            activeIndex={score.activeIndex}
          />
        </div>
      ))}
    </div>
  )
}

function ProductTags({
  product,
  className,
}: {
  product: ProductDetails
  className?: string
}) {
  if (!product.allergens && !product.ingredientsAnalysis) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {product.allergens && (
        <div className="min-w-0">
          <TagGroup label="Allergens" values={splitTags(product.allergens)} />
        </div>
      )}
      {product.ingredientsAnalysis && (
        <div className="min-w-0">
          <TagGroup
            label="Dietary analysis"
            values={splitTags(product.ingredientsAnalysis)}
          />
        </div>
      )}
    </div>
  )
}

function ProductLabels({ product }: { product: ProductDetails }) {
  if (!product.labels) {
    return null
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Labels</h2>
      <div className="flex flex-wrap gap-1.5">
        {splitTags(product.labels).map((value) => (
          <span
            key={value}
            className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-foreground"
          >
            {value}
          </span>
        ))}
      </div>
    </section>
  )
}

function ProductFacts({ product }: { product: ProductDetails }) {
  if (!product.quantity && !product.servingSize) {
    return null
  }

  return (
    <dl className="grid grid-cols-2 gap-4 text-sm">
      {product.quantity && (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Quantity
          </dt>
          <dd className="mt-0.5 text-foreground">{product.quantity}</dd>
        </div>
      )}
      {product.servingSize && (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Serving size
          </dt>
          <dd className="mt-0.5 text-foreground">{product.servingSize}</dd>
        </div>
      )}
    </dl>
  )
}

function formatRelativeTime(timestamp: number | null): string | null {
  if (timestamp === null) {
    return null
  }

  const then = timestamp * 1000
  const diffMs = Date.now() - then
  const absSeconds = Math.round(Math.abs(diffMs) / 1000)

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ]

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  for (const [unit, seconds] of units) {
    if (absSeconds >= seconds) {
      const value = Math.round(diffMs / 1000 / seconds) * -1
      return formatter.format(value, unit)
    }
  }

  return formatter.format(0, 'minute')
}

function formatAbsoluteDate(timestamp: number | null): string | null {
  if (timestamp === null) {
    return null
  }
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}


function HistoryLine({
  label,
  editor,
  timestamp,
}: {
  label: string
  editor: string | null
  timestamp: number | null
}) {
  const relative = formatRelativeTime(timestamp)
  const absolute = formatAbsoluteDate(timestamp)

  return (
    <li className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {relative ? (
        <time className="font-medium text-foreground" title={absolute ?? undefined}>
          {relative}
        </time>
      ) : (
        <span className="font-medium text-foreground">at an unknown time</span>
      )}
      {editor && (
        <>
          <span className="text-muted-foreground">by</span>
          <span className="font-medium text-foreground">{editor}</span>
        </>
      )}
    </li>
  )
}

function ProductHistory({ product }: { product: ProductDetails }) {
  const hasProvenance =
    product.createdAt !== null ||
    product.lastModifiedAt !== null ||
    product.lastCheckedAt !== null

  if (!hasProvenance) {
    return null
  }

  // Contributors beyond the creator and the most recent editor.
  const otherContributors = Math.max(0, product.editorCount - 1)

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Change history</h2>
      <ul className="space-y-1.5">
        {product.createdAt !== null && (
          <HistoryLine
            label="Added"
            editor={product.creator}
            timestamp={product.createdAt}
          />
        )}
        {product.lastModifiedAt !== null && (
          <HistoryLine
            label="Last edited"
            editor={product.lastEditor}
            timestamp={product.lastModifiedAt}
          />
        )}
        {otherContributors > 0 && (
          <li className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">
              Edited by{' '}
              <span className="font-medium text-foreground">
                {otherContributors}
              </span>{' '}
              {otherContributors === 1 ? 'other contributor' : 'other contributors'}
            </span>
          </li>
        )}
        {product.lastCheckedAt !== null && (
          <HistoryLine
            label="Last checked"
            editor={product.lastChecker}
            timestamp={product.lastCheckedAt}
          />
        )}
      </ul>
      <p className="text-xs text-muted-foreground">
        Open Food Facts is collaborative — anyone can add and improve product
        data.
      </p>
    </section>
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

  useEffect(() => {
    if (status === 'success' && product?.isProductFound) {
      recordRecentlyViewedProduct(product)
    }
  }, [product, status])

  const showImage = product?.imageUrl && !imageFailed
  const hasNutrients = product?.nutrients.some(
    (nutrient) => nutrient.value !== null || nutrient.text,
  )
  const hasScores = Boolean(
    product?.nutriScore || product?.ecoScore || product?.novaGroup !== null,
  )
  const hasProductTags = Boolean(
    product?.allergens || product?.ingredientsAnalysis,
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader leading={<BackButton />} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-10 pt-6">
        {status === 'loading' && (
          <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
            <div className="space-y-6">
              <div className="aspect-square w-full animate-pulse rounded-2xl bg-muted" />
              <div className="flex gap-2">
                <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
              <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="mt-6 h-40 w-full animate-pulse rounded-xl bg-muted" />
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
          <article className="space-y-8">
            {/* Mobile hero: image beside title */}
            <div className="space-y-6 lg:hidden">
              <div className="flex gap-4">
                <div className="flex aspect-square w-28 shrink-0 self-start items-center justify-center overflow-hidden rounded-xl border border-border bg-card sm:w-32">
                  {showImage ? (
                    <img
                      src={product.imageUrl ?? ''}
                      alt={product.name ?? 'Product'}
                      onError={() => setImageFailed(true)}
                      className="size-full object-contain p-3"
                    />
                  ) : (
                    <ImageOff className="size-8 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="space-y-1">
                    <p className="font-mono text-xs text-muted-foreground">
                      {product.barcode}
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {product.name ?? 'Unnamed product'}
                    </h1>
                    {product.brands && (
                      <p className="text-sm text-muted-foreground">
                        {product.brands}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {hasScores && (
                <ScoreBadges product={product} mobile />
              )}

              {hasProductTags && (
                <ProductTags product={product} />
              )}

              <ProductFacts product={product} />
            </div>

            {/* Desktop layout */}
            <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
              {/* Desktop sidebar */}
              <aside className="hidden space-y-6 lg:block lg:sticky lg:top-8 lg:self-start">
                <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-card">
                  {showImage ? (
                    <img
                      src={product.imageUrl ?? ''}
                      alt={product.name ?? 'Product'}
                      onError={() => setImageFailed(true)}
                      className="size-full object-contain p-6"
                    />
                  ) : (
                    <ImageOff className="size-12 text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">
                    {product.barcode}
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {product.name ?? 'Unnamed product'}
                  </h1>
                  {product.brands && (
                    <p className="text-sm text-muted-foreground">
                      {product.brands}
                    </p>
                  )}
                </div>

                <ScoreBadges product={product} />
                <ProductFacts product={product} />

                {(product.allergens || product.ingredientsAnalysis) && (
                  <div className="border-t border-border pt-6">
                    <ProductTags product={product} />
                  </div>
                )}
              </aside>

              <div className="min-w-0 space-y-10">
                {product.nutrientLevels.length > 0 && (
                  <NutrientLevels levels={product.nutrientLevels} />
                )}

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
                                  nutrient.indent &&
                                    'pl-8 text-muted-foreground',
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
                      No nutrition information was provided by Open Food Facts
                      for this product.
                    </p>
                  )}
                </section>

                {product.categories && (
                  <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">
                      Categories
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {splitTags(product.categories).map((value) => (
                        <span
                          key={value}
                          className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-foreground"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <ProductLabels product={product} />

                <ProductHistory product={product} />
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  )
}

export default ProductPage
