import { ArrowLeft, ArrowRight, ImageOff, LoaderCircle, PackageSearch, ScanLine, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import ScoreScale, { type ScoreSegment } from '@/components/ScoreScale'
import SiteHeader from '@/components/SiteHeader'
import { cn } from '@/lib/utils'
import {
  buildProductContributionFormFields,
  fetchProductDetails,
  submitProductContribution,
  type ProductContributionInput,
} from '@/lib/openFoodFacts'
import {
  buildChangedProductFields,
  getEditableProductField,
  isEditableNutrient,
  normalizeEditableProductField,
  type EditableProductFieldKey,
  type ProductEditorKind,
} from '@/lib/productContribution'
import { recordRecentlyViewedProduct } from '@/lib/recentlyViewed'
import { getSessionAuth, useSessionUser } from '@/lib/sessionUser'
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
import type {
  NutrientLevel,
  NutrientValue,
  ProductDetails,
  ProductPriceSummary,
} from '@/types'

type EditorTarget =
  | { type: 'field'; key: EditableProductFieldKey }
  | { type: 'nutrient'; index: number }

interface EditorState {
  target: EditorTarget
  label: string
  kind: ProductEditorKind
  value: string
  helpText?: string
}

const cloneProductDetails = (product: ProductDetails): ProductDetails => ({
  ...product,
  nutrients: product.nutrients.map((nutrient) => ({ ...nutrient })),
  nutrientLevels: product.nutrientLevels.map((level) => ({ ...level })),
})

function EditableFieldTrigger({
  isEditMode,
  onEdit,
  children,
  className,
}: {
  isEditMode: boolean
  onEdit: () => void
  children: ReactNode
  className?: string
}) {
  if (!isEditMode) {
    return <>{children}</>
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        'group w-full rounded-md border border-dotted border-primary/70 px-1 py-0.5 text-left transition hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {children}
    </button>
  )
}

function EditablePlaceholder({ label }: { label: string }) {
  return <span className="text-sm text-muted-foreground">Add {label}</span>
}


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
            <div className="flex items-center justify-between gap-4">
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
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
    {scoreItems.map((score) => (
      <div key={score.label}>
        <div className="min-w-0">
          <ScoreScale
            label={score.label}
            segments={score.segments}
            activeIndex={score.activeIndex}
          />
        </div>
      </div>
    ))}
    </div>
  )
}

function ProductTags({
  product,
  className,
  isEditMode = false,
  onEditAllergens,
}: {
  product: ProductDetails
  className?: string
  isEditMode?: boolean
  onEditAllergens?: (
    key: 'allergens',
  ) => void
}) {
  if (
    !isEditMode &&
    !product.allergens &&
    !product.allergensFromIngredients &&
    !product.traces &&
    !product.additives &&
    !product.ingredientsAnalysis
  ) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      {(product.allergens || isEditMode) && (
        <div className="min-w-0">
          {isEditMode ? (
            <EditableFieldTrigger
              isEditMode
              onEdit={() => onEditAllergens?.('allergens')}
            >
              <TagGroup
                label="Allergens"
                values={splitTags(product.allergens ?? '')}
              />
              {splitTags(product.allergens ?? '').length === 0 && (
                <EditablePlaceholder label="allergens" />
              )}
            </EditableFieldTrigger>
          ) : (
            <TagGroup label="Allergens" values={splitTags(product.allergens ?? '')} />
          )}
        </div>
      )}
      {product.allergensFromIngredients && (
        <div className="min-w-0">
          <TagGroup
            label="Allergens from ingredients"
            values={splitTags(product.allergensFromIngredients)}
          />
        </div>
      )}
      {product.traces && (
        <div className="min-w-0">
          <TagGroup label="May contain traces of" values={splitTags(product.traces)} />
        </div>
      )}
      {product.additives && (
        <div className="min-w-0">
          <TagGroup label="Additives" values={splitTags(product.additives)} />
        </div>
      )}
      {product.ingredientsAnalysis && (
        <div className="min-w-0">
          <TagGroup
            label="Dietary analysis"
            values={splitTags(product.ingredientsAnalysis ?? '')}
          />
        </div>
      )}
    </div>
  )
}

function ProductOrigins({ product }: { product: ProductDetails }) {
  if (
    !product.origins &&
    !product.manufacturingPlaces &&
    !product.embCodes &&
    !product.countries
  ) {
    return null
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Origins &amp; supply</h2>
      <div className="space-y-4">
        {product.origins && (
          <TagGroup label="Origins" values={splitTags(product.origins)} />
        )}
        {product.manufacturingPlaces && (
          <TagGroup
            label="Manufacturing places"
            values={splitTags(product.manufacturingPlaces)}
          />
        )}
        {product.embCodes && (
          <TagGroup label="EMB codes" values={splitTags(product.embCodes)} />
        )}
        {product.countries && (
          <TagGroup
            label="Countries where sold"
            values={splitTags(product.countries)}
          />
        )}
      </div>
    </section>
  )
}

function ProductPackaging({ product }: { product: ProductDetails }) {
  if (!product.packaging) {
    return null
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Packaging</h2>
      <div className="flex flex-wrap gap-1.5">
        {splitTags(product.packaging).map((value) => (
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

function ProductLabels({
  product,
  isEditMode = false,
  onEditField,
}: {
  product: ProductDetails
  isEditMode?: boolean
  onEditField?: (key: EditableProductFieldKey) => void
}) {
  if (!isEditMode && !product.labels) {
    return null
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Labels</h2>
      <EditableFieldTrigger
        isEditMode={isEditMode}
        onEdit={() => onEditField?.('labels')}
      >
        <div className="flex flex-wrap gap-1.5">
          {splitTags(product.labels ?? '').map((value) => (
            <span
              key={value}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-foreground"
            >
              {value}
            </span>
          ))}
        </div>
        {isEditMode && splitTags(product.labels ?? '').length === 0 && (
          <EditablePlaceholder label="labels" />
        )}
      </EditableFieldTrigger>
    </section>
  )
}

function ProductFacts({
  product,
  isEditMode = false,
  onEditField,
}: {
  product: ProductDetails
  isEditMode?: boolean
  onEditField?: (key: EditableProductFieldKey) => void
}) {
  if (!isEditMode && !product.quantity && !product.servingSize) {
    return null
  }

  return (
    <dl className="grid grid-cols-2 gap-4 text-sm">
      {(product.quantity || isEditMode) && (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Quantity
          </dt>
          <dd className="mt-0.5 text-foreground">
            <EditableFieldTrigger
              isEditMode={isEditMode}
              onEdit={() => onEditField?.('quantity')}
            >
              {product.quantity ?? 'Add quantity'}
            </EditableFieldTrigger>
          </dd>
        </div>
      )}
      {(product.servingSize || isEditMode) && (
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Serving size
          </dt>
          <dd className="mt-0.5 text-foreground">
            <EditableFieldTrigger
              isEditMode={isEditMode}
              onEdit={() => onEditField?.('servingSize')}
            >
              {product.servingSize ?? 'Add serving size'}
            </EditableFieldTrigger>
          </dd>
        </div>
      )}
    </dl>
  )
}

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

function ProductPrices({ summary }: { summary: ProductPriceSummary }) {
  const minPrice =
    summary.priceMin !== null
      ? formatPriceValue(summary.priceMin, summary.statsCurrency)
      : null
  const maxPrice =
    summary.priceMax !== null
      ? formatPriceValue(summary.priceMax, summary.statsCurrency)
      : null

  if (summary.priceCount <= 0) {
    return null
  }

  const range =
    minPrice && maxPrice
      ? minPrice === maxPrice
        ? minPrice
        : `${minPrice} – ${maxPrice}`
      : null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          Community prices
        </h2>
        <Link
          to={`/product/${summary.barcode}/prices`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View more
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Price range
        </p>
        <p className="mt-1 text-base font-semibold text-foreground">
          {range ?? '—'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Crowdsourced from Open Prices ({summary.priceCount}{' '}
          {summary.priceCount === 1 ? 'report' : 'reports'}).
        </p>
      </div>
    </section>
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
type EditSubmitStatus = 'idle' | 'submitting' | 'success' | 'error'
type SubmissionPreviewRow = { field: string; value: string }
type PendingContributionSubmit = {
  input: ProductContributionInput
  credentials: { username: string; password: string }
  changedRows: SubmissionPreviewRow[]
  requestRows: SubmissionPreviewRow[]
}
type EnergyEditorValues = {
  kilojoules: string
  kilocalories: string
}

const readEnergyFromNutrient = (nutrient: NutrientValue): EnergyEditorValues => ({
  kilojoules: nutrient.text?.match(/([0-9]+(?:[.,][0-9]+)?)\s*kJ/iu)?.[1] ?? '',
  kilocalories:
    nutrient.text?.match(/([0-9]+(?:[.,][0-9]+)?)\s*kcal/iu)?.[1] ??
    (nutrient.value !== null ? String(nutrient.value) : ''),
})

const formatEnergyPart = (value: number): string =>
  Number.isInteger(value) ? String(value) : String(value)

function ProductPage() {
  const params = useParams<{ barcode: string }>()
  const barcode = sanitizeBarcode(params.barcode ?? '')
  const sessionUser = useSessionUser()

  const [status, setStatus] = useState<Status>('loading')
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editSessionOriginal, setEditSessionOriginal] = useState<ProductDetails | null>(null)
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [editorValue, setEditorValue] = useState('')
  const [energyEditorValues, setEnergyEditorValues] = useState<EnergyEditorValues>({
    kilojoules: '',
    kilocalories: '',
  })
  const [editSubmitStatus, setEditSubmitStatus] = useState<EditSubmitStatus>('idle')
  const [editSubmitMessage, setEditSubmitMessage] = useState<string | null>(null)
  const [pendingContributionSubmit, setPendingContributionSubmit] =
    useState<PendingContributionSubmit | null>(null)

  const requestIdRef = useRef(0)

  const openFieldEditor = useCallback(
    (key: EditableProductFieldKey) => {
      if (!isEditMode || !product) {
        return
      }

      const currentValue = product[key] ?? ''
      const definition = getEditableProductField(key)

      setEditorState({
        target: { type: 'field', key },
        label: definition.label,
        kind: definition.kind,
        value: currentValue,
        helpText: definition.helpText,
      })
      setEditorValue(currentValue)
    },
    [isEditMode, product],
  )

  const openNutrientEditor = useCallback(
    (index: number, nutrient: NutrientValue) => {
      if (!isEditMode) {
        return
      }

      const isEnergy = nutrient.id === 'energy'
      const currentValue = isEnergy ? '' : nutrient.value !== null ? String(nutrient.value) : ''
      setEditorState({
        target: { type: 'nutrient', index },
        label: `${nutrient.label} (per 100g)`,
        kind: 'number',
        value: currentValue,
        helpText: isEnergy
          ? 'Provide either or both values (kJ and kcal) per 100g.'
          : 'Use OFF numeric format (per 100g), e.g. 12.5',
      })
      setEditorValue(currentValue)
      setEnergyEditorValues(
        isEnergy ? readEnergyFromNutrient(nutrient) : { kilojoules: '', kilocalories: '' },
      )
    },
    [isEditMode],
  )

  const closeEditor = useCallback(() => {
    setEditorState(null)
    setEditorValue('')
    setEnergyEditorValues({ kilojoules: '', kilocalories: '' })
  }, [])

  const startEditMode = useCallback(() => {
    if (!product) {
      return
    }
    setPendingContributionSubmit(null)
    setEditSubmitStatus('idle')
    setEditSubmitMessage(null)
    setEditSessionOriginal(cloneProductDetails(product))
    setIsEditMode(true)
  }, [product])

  const discardEditMode = useCallback(() => {
    if (editSessionOriginal) {
      setProduct(cloneProductDetails(editSessionOriginal))
    }
    setPendingContributionSubmit(null)
    setEditSubmitStatus('idle')
    setEditSubmitMessage(null)
    setIsEditMode(false)
    setEditSessionOriginal(null)
    closeEditor()
  }, [closeEditor, editSessionOriginal])

  const saveEditMode = useCallback(() => {
    setPendingContributionSubmit(null)
    setEditSubmitStatus('idle')
    setEditSubmitMessage(null)
    setIsEditMode(false)
    setEditSessionOriginal(null)
    closeEditor()
  }, [closeEditor])

  const openSubmitConfirmation = useCallback(() => {
    if (!product) {
      return
    }

    const auth = getSessionAuth()
    if (!sessionUser || !auth) {
      setEditSubmitStatus('error')
      setEditSubmitMessage('Sign in to Open Food Facts before submitting changes.')
      return
    }

    if (!editSessionOriginal) {
      setEditSubmitStatus('error')
      setEditSubmitMessage('Start edit mode before submitting to Open Food Facts.')
      return
    }

    const fields = buildChangedProductFields(product, editSessionOriginal)
    if (Object.keys(fields).length === 0) {
      setEditSubmitStatus('error')
      setEditSubmitMessage('No edited fields to submit yet.')
      return
    }

    const input: ProductContributionInput = {
      barcode: product.barcode,
      fields,
    }
    const credentials = {
      username: auth.username,
      password: auth.password,
    }
    const previewRows = Object.entries(
      buildProductContributionFormFields(input, credentials),
    ).flatMap(([field, value]) => {
      if (value === undefined) {
        return []
      }
      return [{
        field,
        value: field === 'password' ? '••••••••' : value || '(empty)',
      }]
    })
    const changedFieldNames = new Set(Object.keys(fields))
    const changedRows = previewRows.filter(({ field }) => changedFieldNames.has(field))
    const requestRows = previewRows.filter(({ field }) => !changedFieldNames.has(field))

    setEditSubmitStatus('idle')
    setEditSubmitMessage(null)
    setPendingContributionSubmit({
      input,
      credentials,
      changedRows,
      requestRows,
    })
  }, [editSessionOriginal, product, sessionUser])

  const confirmSubmitEditMode = useCallback(async () => {
    if (!pendingContributionSubmit) {
      return
    }

    setEditSubmitStatus('submitting')
    setEditSubmitMessage(null)
    setPendingContributionSubmit(null)

    try {
      await submitProductContribution(
        pendingContributionSubmit.input,
        pendingContributionSubmit.credentials,
      )

      setEditSubmitStatus('success')
      setEditSubmitMessage('Changes were submitted to Open Food Facts.')
      setIsEditMode(false)
      setEditSessionOriginal(null)
      closeEditor()
    } catch (error) {
      setEditSubmitStatus('error')
      setEditSubmitMessage(
        error instanceof Error
          ? error.message
          : 'Could not submit changes to Open Food Facts.',
      )
    }
  }, [closeEditor, pendingContributionSubmit])

  const saveEditorChanges = useCallback(() => {
    if (!editorState) {
      return
    }

    setProduct((current) => {
      if (!current) {
        return current
      }

      if (editorState.target.type === 'field') {
        const next = { ...current }
        const { key } = editorState.target
        next[key] = normalizeEditableProductField(key, editorValue)
        return next
      }

      if (editorState.target.type !== 'nutrient') {
        return current
      }

      const nutrientIndex = editorState.target.index
      const nextNutrients = current.nutrients.map((nutrient, index) => {
        if (index !== nutrientIndex) {
          return nutrient
        }
        if (nutrient.id === 'energy') {
          const kjRaw = energyEditorValues.kilojoules.trim().replace(',', '.')
          const kcalRaw = energyEditorValues.kilocalories.trim().replace(',', '.')
          const parsedKj = kjRaw ? Number(kjRaw) : null
          const parsedKcal = kcalRaw ? Number(kcalRaw) : null

          if (
            (kjRaw && !Number.isFinite(parsedKj)) ||
            (kcalRaw && !Number.isFinite(parsedKcal))
          ) {
            return nutrient
          }

          const parts: string[] = []
          if (parsedKj !== null) {
            parts.push(`${formatEnergyPart(parsedKj)} kJ`)
          }
          if (parsedKcal !== null) {
            parts.push(`${formatEnergyPart(parsedKcal)} kcal`)
          }

          return {
            ...nutrient,
            value: parsedKcal,
            text: parts.length > 0 ? parts.join(' / ') : null,
          }
        }

        const trimmed = editorValue.trim()
        const nutrientValue = trimmed.replace(',', '.')
        const parsed = Number(nutrientValue)
        if (!trimmed) {
          return { ...nutrient, value: null, text: null }
        }
        if (Number.isFinite(parsed)) {
          return { ...nutrient, value: parsed, text: null }
        }
        return nutrient
      })

      return { ...current, nutrients: nextNutrients }
    })

    closeEditor()
  }, [closeEditor, editorState, editorValue, energyEditorValues])

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
      setPendingContributionSubmit(null)
      setEditSubmitStatus('idle')
      setEditSubmitMessage(null)
      setIsEditMode(false)
      setEditSessionOriginal(null)
      closeEditor()
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
  }, [closeEditor])

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
  const showNutritionTable = Boolean(isEditMode || hasNutrients)
  const hasScores = Boolean(
    product?.nutriScore || product?.ecoScore || product?.novaGroup !== null,
  )
  const hasProductTags = Boolean(
    isEditMode ||
      product?.allergens ||
      product?.allergensFromIngredients ||
      product?.traces ||
      product?.additives ||
      product?.ingredientsAnalysis,
  )
  const isEnergyEditor =
    editorState?.target.type === 'nutrient' &&
    product?.nutrients[editorState.target.index]?.id === 'energy'

  return (
    <div className="flex min-h-dvh flex-col">
      {isEditMode ? (
        <SiteHeader
          tone="edit"
          center={null}
          showLoginAction={false}
          leading={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
              onClick={discardEditMode}
            >
              Discard
            </Button>
          }
          trailing={
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                onClick={saveEditMode}
                disabled={editSubmitStatus === 'submitting'}
              >
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                onClick={openSubmitConfirmation}
                disabled={editSubmitStatus === 'submitting'}
              >
                {editSubmitStatus === 'submitting' ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Submit
                  </>
                ) : (
                  'Submit'
                )}
              </Button>
            </div>
          }
        />
      ) : (
        <SiteHeader leading={<BackButton />} />
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-10 pt-6">
        {editSubmitMessage && (isEditMode || editSubmitStatus === 'success') && (
          <Alert
            variant={editSubmitStatus === 'success' ? 'success' : 'destructive'}
            className="mb-4"
          >
            <AlertDescription>{editSubmitMessage}</AlertDescription>
          </Alert>
        )}
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
                {(showImage || isEditMode) && (
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
                )}

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="space-y-1">
                    <p className="font-mono text-xs text-muted-foreground">
                      {product.barcode}
                    </p>
                    <EditableFieldTrigger
                      isEditMode={isEditMode}
                      onEdit={() => openFieldEditor('name')}
                    >
                      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {product.name ?? (isEditMode ? 'Add product name' : 'Unnamed product')}
                      </h1>
                    </EditableFieldTrigger>
                    {(product.brands || isEditMode) && (
                      <EditableFieldTrigger
                        isEditMode={isEditMode}
                        onEdit={() => openFieldEditor('brands')}
                      >
                        <p className="text-sm text-muted-foreground">
                          {product.brands ?? 'Add brands'}
                        </p>
                      </EditableFieldTrigger>
                    )}
                  </div>
                </div>
              </div>

              {hasScores && (
                <ScoreBadges product={product} mobile />
              )}

              {hasProductTags && (
                <ProductTags
                  product={product}
                  isEditMode={isEditMode}
                  onEditAllergens={openFieldEditor}
                />
              )}

              <ProductFacts
                product={product}
                isEditMode={isEditMode}
                onEditField={openFieldEditor}
              />
            </div>

            {/* Desktop layout */}
            <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
              {/* Desktop sidebar */}
              <aside className="hidden space-y-6 lg:block lg:sticky lg:top-8 lg:self-start">
                {(showImage || isEditMode) && (
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
                )}

                <div className="space-y-1">
                  <p className="font-mono text-xs text-muted-foreground">
                    {product.barcode}
                  </p>
                  <EditableFieldTrigger
                    isEditMode={isEditMode}
                    onEdit={() => openFieldEditor('name')}
                  >
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                      {product.name ?? (isEditMode ? 'Add product name' : 'Unnamed product')}
                    </h1>
                  </EditableFieldTrigger>
                  {(product.brands || isEditMode) && (
                    <EditableFieldTrigger
                      isEditMode={isEditMode}
                      onEdit={() => openFieldEditor('brands')}
                    >
                      <p className="text-sm text-muted-foreground">
                        {product.brands ?? 'Add brands'}
                      </p>
                    </EditableFieldTrigger>
                  )}
                </div>

                <ScoreBadges product={product} />
                <ProductFacts
                  product={product}
                  isEditMode={isEditMode}
                  onEditField={openFieldEditor}
                />

                {hasProductTags && (
                  <div className="border-t border-border pt-6">
                    <ProductTags
                      product={product}
                      isEditMode={isEditMode}
                      onEditAllergens={openFieldEditor}
                    />
                  </div>
                )}
              </aside>

              <div className="min-w-0 space-y-10">
                {product.nutrientLevels.length > 0 && (
                  <NutrientLevels levels={product.nutrientLevels} />
                )}

                {product.priceSummary && (
                  <ProductPrices summary={product.priceSummary} />
                )}

                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    Ingredients
                  </h2>
                  <EditableFieldTrigger
                    isEditMode={isEditMode}
                    onEdit={() => openFieldEditor('ingredients')}
                  >
                    <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                      {product.ingredients ??
                        (isEditMode
                          ? 'Add ingredients'
                          : 'No ingredients were provided by Open Food Facts for this product.')}
                    </p>
                  </EditableFieldTrigger>
                </section>

                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground">
                    Nutrition
                  </h2>
                  {showNutritionTable ? (
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
                          {product.nutrients.map((nutrient, nutrientIndex) => {
                            const rowEditable =
                              isEditMode && isEditableNutrient(nutrient.id)

                            return (
                              <tr
                                key={nutrient.id}
                                className={cn(
                                  'border-b border-border last:border-b-0',
                                  rowEditable &&
                                    'cursor-pointer outline-1 outline-dotted outline-primary/70 -outline-offset-1 transition-colors hover:bg-accent/40',
                                )}
                                onClick={() => {
                                  if (rowEditable) {
                                    openNutrientEditor(nutrientIndex, nutrient)
                                  }
                                }}
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
                            )
                          })}
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

                {(product.categories || isEditMode) && (
                  <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">
                      Categories
                    </h2>
                    <EditableFieldTrigger
                      isEditMode={isEditMode}
                      onEdit={() => openFieldEditor('categories')}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {splitTags(product.categories ?? '').map((value) => (
                          <span
                            key={value}
                            className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-foreground"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                      {isEditMode && splitTags(product.categories ?? '').length === 0 && (
                        <EditablePlaceholder label="categories" />
                      )}
                    </EditableFieldTrigger>
                  </section>
                )}

                <ProductLabels
                  product={product}
                  isEditMode={isEditMode}
                  onEditField={openFieldEditor}
                />
                <ProductOrigins product={product} />
                <ProductPackaging product={product} />

                <ProductHistory product={product} />
              </div>
            </div>

            {!isEditMode && (
              <div className="pt-2">
                <Button
                  type="button"
                  className="w-full"
                  variant="outline"
                  onClick={startEditMode}
                >
                  <Settings2 className="size-4" />
                  Edit mode
                </Button>
              </div>
            )}
          </article>
        )}
      </main>

      <Dialog
        open={Boolean(editorState)}
        onOpenChange={(open) => {
          if (!open) {
            closeEditor()
          }
        }}
      >
        {editorState && (
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Edit {editorState.label}</DialogTitle>
            </DialogHeader>

            <div className="space-y-2">
              {isEnergyEditor ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground" htmlFor="energy-kj">
                      Energy (kJ)
                    </label>
                    <Input
                      id="energy-kj"
                      type="number"
                      step="any"
                      value={energyEditorValues.kilojoules}
                      onChange={(event) =>
                        setEnergyEditorValues((current) => ({
                          ...current,
                          kilojoules: event.target.value,
                        }))
                      }
                      placeholder="e.g. 850"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-foreground" htmlFor="energy-kcal">
                      Energy (kcal)
                    </label>
                    <Input
                      id="energy-kcal"
                      type="number"
                      step="any"
                      value={energyEditorValues.kilocalories}
                      onChange={(event) =>
                        setEnergyEditorValues((current) => ({
                          ...current,
                          kilocalories: event.target.value,
                        }))
                      }
                      placeholder="e.g. 203"
                    />
                  </div>
                </div>
              ) : editorState.kind === 'textarea' ? (
                <Textarea
                  id="product-field-editor"
                  value={editorValue}
                  onChange={(event) => setEditorValue(event.target.value)}
                  rows={6}
                  placeholder={`Enter ${editorState.label.toLowerCase()}…`}
                />
              ) : (
                <Input
                  id="product-field-editor"
                  type={editorState.kind === 'number' ? 'number' : 'text'}
                  step={editorState.kind === 'number' ? 'any' : undefined}
                  value={editorValue}
                  onChange={(event) => setEditorValue(event.target.value)}
                  placeholder={`Enter ${editorState.label.toLowerCase()}…`}
                />
              )}
            </div>

            <DialogFooter className="-mx-6 -mb-6 mt-2 border-t border-border px-6 pb-6 pt-4">
              <Button type="button" variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
              <Button type="button" onClick={saveEditorChanges}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={Boolean(pendingContributionSubmit)}
        onOpenChange={(open) => {
          if (!open && editSubmitStatus !== 'submitting') {
            setPendingContributionSubmit(null)
          }
        }}
      >
        {pendingContributionSubmit && (
          <DialogContent aria-describedby={undefined} className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Confirm submission to Open Food Facts</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              Review the product changes and required request details that will
              be sent to OFF.
            </p>

            <div className="max-h-[50vh] space-y-4 overflow-y-auto">
              {[
                {
                  title: 'Product changes',
                  rows: pendingContributionSubmit.changedRows,
                },
                {
                  title: 'Required request details',
                  rows: pendingContributionSubmit.requestRows,
                },
              ].map(({ title, rows }) => (
                <section key={title} className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/70">
                        <tr>
                          <th className="border-b border-border px-3 py-2 font-medium text-foreground">
                            Field
                          </th>
                          <th className="border-b border-border px-3 py-2 font-medium text-foreground">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ field, value }) => (
                          <tr key={field}>
                            <th className="w-52 border-b border-border px-3 py-2 font-mono text-xs font-medium text-foreground">
                              {field}
                            </th>
                            <td className="break-words border-b border-border px-3 py-2 text-foreground">
                              {value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>

            <DialogFooter className="-mx-6 -mb-6 mt-2 border-t border-border px-6 pb-6 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingContributionSubmit(null)}
                disabled={editSubmitStatus === 'submitting'}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void confirmSubmitEditMode()}
                disabled={editSubmitStatus === 'submitting'}
              >
                {editSubmitStatus === 'submitting' ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit to OFF'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

export default ProductPage
