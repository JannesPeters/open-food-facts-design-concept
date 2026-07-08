import type {
  NutrientValue,
  ProductDetails,
  ProductSearchResponse,
  ProductSearchResult,
} from '../types'

const requestedFields = [
  'code',
  'product_name',
  'generic_name',
  'ingredients_text',
  'brands',
  'image_url',
  'nutriments',
  'nutriscore_grade',
  'nova_group',
  'quantity',
  'serving_size',
  'allergens',
  'categories',
  'labels',
  'ingredients_analysis_tags',
].join(',')

const openFoodFactsOrigin = 'https://world.openfoodfacts.org'
const openFoodFactsDevProxyPrefix = '/__openfoodfacts'
const openFoodFactsDevProxyCgiPrefix = '/__off-cgi'

const getProductLookupPath = (barcode: string) => {
  const pathname = `/api/v2/product/${encodeURIComponent(barcode)}.json`
  const query = `fields=${encodeURIComponent(requestedFields)}`

  return `${pathname}?${query}`
}

const getDevProxyProductLookupUrl = (barcode: string) =>
  `${openFoodFactsDevProxyPrefix}/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(requestedFields)}`

const getDirectProductLookupUrl = (barcode: string) =>
  `${openFoodFactsOrigin}${getProductLookupPath(barcode)}`

const getLookupCandidates = (barcode: string) =>
  import.meta.env.DEV
    ? [getDevProxyProductLookupUrl(barcode), getDirectProductLookupUrl(barcode)]
    : [getDirectProductLookupUrl(barcode)]

const importantNutrients: Array<{
  id: string
  label: string
  unit: string
  indent?: boolean
}> = [
  { id: 'fat_100g', label: 'Fat', unit: 'g' },
  { id: 'saturated-fat_100g', label: 'of which saturates', unit: 'g', indent: true },
  { id: 'carbohydrates_100g', label: 'Carbohydrate', unit: 'g' },
  { id: 'sugars_100g', label: 'of which sugars', unit: 'g', indent: true },
  { id: 'fiber_100g', label: 'Fibre', unit: 'g' },
  { id: 'proteins_100g', label: 'Protein', unit: 'g' },
  { id: 'salt_100g', label: 'Salt', unit: 'g' },
]

interface OpenFoodFactsProduct {
  product_name?: string
  generic_name?: string
  ingredients_text?: string
  brands?: string
  image_url?: string
  nutriments?: Record<string, number | string | undefined>
  nutriscore_grade?: string
  nova_group?: number | string
  quantity?: string
  serving_size?: string
  allergens?: string
  categories?: string
  labels?: string
  ingredients_analysis_tags?: string[]
}

interface OpenFoodFactsResponse {
  code?: string
  product?: OpenFoodFactsProduct
  status: 0 | 1
}

const readNumber = (value: number | string | undefined) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  return null
}

const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1)

const buildEnergyRow = (
  nutriments: Record<string, number | string | undefined> | undefined,
): NutrientValue => {
  const kilojoules = readNumber(nutriments?.['energy-kj_100g'])
  const kilocalories = readNumber(nutriments?.['energy-kcal_100g'])

  const parts: string[] = []
  if (kilojoules !== null) {
    parts.push(`${formatNumber(kilojoules)} kJ`)
  }
  if (kilocalories !== null) {
    parts.push(`${formatNumber(kilocalories)} kcal`)
  }

  return {
    id: 'energy',
    label: 'Energy',
    unit: '',
    value: kilocalories,
    text: parts.length > 0 ? parts.join(' / ') : null,
  }
}

const buildNutrients = (
  nutriments: Record<string, number | string | undefined> | undefined,
): NutrientValue[] => [
  buildEnergyRow(nutriments),
  ...importantNutrients.map((nutrient) => ({
    ...nutrient,
    value:
      nutriments && nutrient.id in nutriments
        ? readNumber(nutriments[nutrient.id])
        : null,
  })),
]

const cleanText = (value: string | undefined): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

const cleanTagList = (value: string | undefined): string | null => {
  if (!value) {
    return null
  }

  const cleaned = value
    .split(',')
    .map((entry) => entry.trim().replace(/^[a-z]{2}:/u, '').replace(/-/gu, ' '))
    .filter((entry) => entry.length > 0)
    .join(', ')

  return cleaned || null
}

const cleanAnalysisTags = (tags: string[] | undefined): string | null => {
  if (!Array.isArray(tags)) {
    return null
  }

  const cleaned = tags
    .map((tag) => tag.trim().replace(/^[a-z]{2}:/u, '').replace(/-/gu, ' '))
    .map((tag) => (tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : tag))
    .filter((tag) => tag.length > 0 && !/status unknown$/iu.test(tag))

  return cleaned.length > 0 ? cleaned.join(', ') : null
}

const normalizeNutriScore = (value: string | undefined): string | null => {
  const grade = value?.trim().toUpperCase()
  return grade && /^[A-E]$/u.test(grade) ? grade : null
}

const normalizeNovaGroup = (value: number | string | undefined): number | null => {
  const group = readNumber(value)
  return group !== null && group >= 1 && group <= 4 ? group : null
}

const buildMissingProductDetails = (barcode: string): ProductDetails => ({
  barcode,
  name: null,
  ingredients: null,
  brands: null,
  imageUrl: null,
  nutriScore: null,
  novaGroup: null,
  quantity: null,
  servingSize: null,
  allergens: null,
  categories: null,
  labels: null,
  ingredientsAnalysis: null,
  nutrients: buildNutrients(undefined),
  isProductFound: false,
})

const mapProductDetails = (
  barcode: string,
  data: OpenFoodFactsResponse,
): ProductDetails => {
  const product = data.product

  return {
    barcode: data.code ?? barcode,
    name:
      product?.product_name?.trim() || product?.generic_name?.trim() || null,
    ingredients: product?.ingredients_text?.trim() || null,
    brands: product?.brands?.trim() || null,
    imageUrl: product?.image_url?.trim() || null,
    nutriScore: normalizeNutriScore(product?.nutriscore_grade),
    novaGroup: normalizeNovaGroup(product?.nova_group),
    quantity: cleanText(product?.quantity),
    servingSize: cleanText(product?.serving_size),
    allergens: cleanTagList(product?.allergens),
    categories: cleanTagList(product?.categories),
    labels: cleanTagList(product?.labels),
    ingredientsAnalysis: cleanAnalysisTags(product?.ingredients_analysis_tags),
    nutrients: buildNutrients(product?.nutriments),
    isProductFound: data.status === 1,
  }
}

/**
 * Open Food Facts enforces per-IP and global rate limits, returning transient
 * 5xx / 429 responses (and occasionally a 200 HTML "temporarily unavailable"
 * page) under load. These helpers add retry-with-backoff and a stale cache so
 * the app stays usable while OFF is throttling.
 */

const retryableStatuses = new Set([429, 500, 502, 503, 504])

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

interface FetchJsonResult<T> {
  ok: boolean
  status: number | null
  data: T | null
  error: Error | null
}

async function fetchJsonWithRetry<T>(
  candidates: string[],
  { retries = 3, baseDelayMs = 400 }: { retries?: number; baseDelayMs?: number } = {},
): Promise<FetchJsonResult<T>> {
  let lastStatus: number | null = null
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) {
      const backoff = baseDelayMs * 2 ** (attempt - 1)
      await delay(backoff + Math.random() * baseDelayMs)
    }

    let attemptRetryable = false

    for (const url of candidates) {
      try {
        const response = await fetch(url)

        if (response.ok) {
          try {
            const data = (await response.json()) as T
            return { ok: true, status: response.status, data, error: null }
          } catch (parseError) {
            // 200 with a non-JSON body (OFF HTML error page) — treat as transient.
            lastError = parseError instanceof Error ? parseError : null
            attemptRetryable = true
            continue
          }
        }

        lastStatus = response.status

        if (response.status === 404) {
          return { ok: false, status: 404, data: null, error: null }
        }

        if (retryableStatuses.has(response.status)) {
          attemptRetryable = true
        }
      } catch (error) {
        lastError = error instanceof Error ? error : null
        attemptRetryable = true
      }
    }

    if (!attemptRetryable) {
      break
    }
  }

  return { ok: false, status: lastStatus, data: null, error: lastError }
}

interface CacheEntry<T> {
  value: T
  savedAt: number
}

const cachePrefix = 'off-cache:v2:'
const cacheFreshTtlMs = 1000 * 60 * 10
const memoryCache = new Map<string, CacheEntry<unknown>>()

const readCache = <T>(key: string): CacheEntry<T> | null => {
  const inMemory = memoryCache.get(key)
  if (inMemory) {
    return inMemory as CacheEntry<T>
  }

  if (typeof localStorage === 'undefined') {
    return null
  }

  try {
    const raw = localStorage.getItem(cachePrefix + key)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as CacheEntry<T>
    memoryCache.set(key, parsed)
    return parsed
  } catch {
    return null
  }
}

const writeCache = <T>(key: string, value: T): void => {
  const entry: CacheEntry<T> = { value, savedAt: Date.now() }
  memoryCache.set(key, entry)

  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(cachePrefix + key, JSON.stringify(entry))
  } catch {
    // Ignore quota errors or unavailable storage — the memory cache still works.
  }
}

const isFresh = (entry: CacheEntry<unknown>) =>
  Date.now() - entry.savedAt < cacheFreshTtlMs

const buildUnavailableError = (result: FetchJsonResult<unknown>) =>
  new Error(
    result.status
      ? `Open Food Facts could not be reached right now (HTTP ${result.status}). Please try again shortly.`
      : result.error?.message
        ? `Open Food Facts could not be reached right now (${result.error.message}). Please try again shortly.`
        : 'Open Food Facts could not be reached right now. Please try again shortly.',
  )

export async function fetchProductDetails(
  barcode: string,
): Promise<ProductDetails> {
  const cacheKey = `product:${barcode}`
  const cached = readCache<ProductDetails>(cacheKey)
  if (cached && isFresh(cached)) {
    return cached.value
  }

  const result = await fetchJsonWithRetry<OpenFoodFactsResponse>(
    getLookupCandidates(barcode),
  )

  if (result.ok && result.data) {
    const details = mapProductDetails(barcode, result.data)
    writeCache(cacheKey, details)
    return details
  }

  if (result.status === 404) {
    return buildMissingProductDetails(barcode)
  }

  if (cached) {
    // Serve stale data rather than failing while OFF is throttling.
    return cached.value
  }

  throw buildUnavailableError(result)
}

const searchRequestedFields = [
  'code',
  'product_name',
  'generic_name',
  'brands',
  'image_url',
  'image_front_small_url',
  'nutriscore_grade',
  'nova_group',
  'quantity',
].join(',')

// Full-text product search lives on the legacy CGI endpoint. The v2 /search
// endpoint only filters by structured tags and silently ignores `search_terms`
// (it returns the entire database), so it must not be used for a search box.
const buildSearchQuery = (searchTerms: string, page: number, pageSize: number) =>
  [
    `search_terms=${encodeURIComponent(searchTerms)}`,
    'search_simple=1',
    'action=process',
    'json=1',
    `fields=${encodeURIComponent(searchRequestedFields)}`,
    `page=${encodeURIComponent(String(page))}`,
    `page_size=${encodeURIComponent(String(pageSize))}`,
  ].join('&')

const getDevProxySearchUrl = (
  searchTerms: string,
  page: number,
  pageSize: number,
) =>
  `${openFoodFactsDevProxyCgiPrefix}/search.pl?${buildSearchQuery(searchTerms, page, pageSize)}`

const getDirectSearchUrl = (
  searchTerms: string,
  page: number,
  pageSize: number,
) =>
  `${openFoodFactsOrigin}/cgi/search.pl?${buildSearchQuery(searchTerms, page, pageSize)}`

const getSearchCandidates = (
  searchTerms: string,
  page: number,
  pageSize: number,
) =>
  import.meta.env.DEV
    ? [
        getDevProxySearchUrl(searchTerms, page, pageSize),
        getDirectSearchUrl(searchTerms, page, pageSize),
      ]
    : [getDirectSearchUrl(searchTerms, page, pageSize)]

interface OpenFoodFactsSearchProduct extends OpenFoodFactsProduct {
  code?: string
  image_front_small_url?: string
}

interface OpenFoodFactsSearchResponse {
  count?: number
  page?: number
  page_size?: number
  page_count?: number
  products?: OpenFoodFactsSearchProduct[]
}

const mapSearchProduct = (
  product: OpenFoodFactsSearchProduct,
): ProductSearchResult => ({
  barcode: product.code?.trim() || '',
  name:
    product.product_name?.trim() || product.generic_name?.trim() || null,
  brands: cleanTagList(product.brands),
  imageUrl:
    product.image_front_small_url?.trim() || product.image_url?.trim() || null,
  nutriScore: normalizeNutriScore(product.nutriscore_grade),
  novaGroup: normalizeNovaGroup(product.nova_group),
  quantity: cleanText(product.quantity),
})

export async function searchProducts(
  searchTerms: string,
  page = 1,
  pageSize = 24,
): Promise<ProductSearchResponse> {
  const cacheKey = `search:${searchTerms}:${page}:${pageSize}`
  const cached = readCache<ProductSearchResponse>(cacheKey)
  if (cached && isFresh(cached)) {
    return cached.value
  }

  const result = await fetchJsonWithRetry<OpenFoodFactsSearchResponse>(
    getSearchCandidates(searchTerms, page, pageSize),
  )

  if (result.ok && result.data) {
    const data = result.data
    const products = Array.isArray(data.products) ? data.products : []
    const response: ProductSearchResponse = {
      results: products
        .map(mapSearchProduct)
        .filter((item) => item.barcode.length > 0),
      count: readNumber(data.count) ?? 0,
      page: readNumber(data.page) ?? page,
      pageSize: readNumber(data.page_size) ?? pageSize,
      pageCount: readNumber(data.page_count) ?? 0,
    }
    writeCache(cacheKey, response)
    return response
  }

  if (cached) {
    // Serve stale results rather than failing while OFF is throttling.
    return cached.value
  }

  throw buildUnavailableError(result)
}
