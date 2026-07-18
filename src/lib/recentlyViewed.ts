import type { ProductDetails } from '@/types'

export interface RecentlyViewedProduct {
  barcode: string
  name: string | null
  brands: string | null
  imageUrl: string | null
  nutriScore: string | null
  ecoScore: string | null
  novaGroup: number | null
  quantity: string | null
  viewedAt: number
}

const RECENTLY_VIEWED_KEY = 'off-recently-viewed:v1'
const MAX_RECENTLY_VIEWED_PRODUCTS = 12

const isValidScoreGrade = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-E]$/u.test(value)

const isValidRecentlyViewedProduct = (
  value: unknown,
): value is RecentlyViewedProduct => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<RecentlyViewedProduct>

  return (
    typeof candidate.barcode === 'string' &&
    candidate.barcode.length > 0 &&
    (candidate.name === null || typeof candidate.name === 'string') &&
    (candidate.brands === null || typeof candidate.brands === 'string') &&
    (candidate.imageUrl === null || typeof candidate.imageUrl === 'string') &&
    (candidate.nutriScore === null || isValidScoreGrade(candidate.nutriScore)) &&
    (candidate.ecoScore === null || isValidScoreGrade(candidate.ecoScore)) &&
    (candidate.novaGroup === null ||
      (typeof candidate.novaGroup === 'number' &&
        Number.isInteger(candidate.novaGroup) &&
        candidate.novaGroup >= 1 &&
        candidate.novaGroup <= 4)) &&
    (candidate.quantity === null || typeof candidate.quantity === 'string') &&
    typeof candidate.viewedAt === 'number' &&
    Number.isFinite(candidate.viewedAt) &&
    candidate.viewedAt > 0
  )
}

export const readRecentlyViewedProducts = (): RecentlyViewedProduct[] => {
  if (typeof localStorage === 'undefined') {
    return []
  }

  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(isValidRecentlyViewedProduct)
      .slice(0, MAX_RECENTLY_VIEWED_PRODUCTS)
  } catch {
    return []
  }
}

const writeRecentlyViewedProducts = (items: RecentlyViewedProduct[]): void => {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage quota/private mode errors; this is an optional UX feature.
  }
}

export const recordRecentlyViewedProduct = (product: ProductDetails): void => {
  if (!product.barcode || !product.isProductFound) {
    return
  }

  const entry: RecentlyViewedProduct = {
    barcode: product.barcode,
    name: product.name,
    brands: product.brands,
    imageUrl: product.imageUrl,
    nutriScore: product.nutriScore,
    ecoScore: product.ecoScore,
    novaGroup: product.novaGroup,
    quantity: product.quantity,
    viewedAt: Date.now(),
  }

  const nextItems = [
    entry,
    ...readRecentlyViewedProducts().filter(
      (item) => item.barcode !== product.barcode,
    ),
  ].slice(0, MAX_RECENTLY_VIEWED_PRODUCTS)

  writeRecentlyViewedProducts(nextItems)
}
