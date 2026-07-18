import type {
  NutrientLevel,
  NutrientLevelValue,
  NutrientValue,
  PriceRecord,
  ProductDetails,
  ProductPriceSummary,
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
  'nutrient_levels',
  'nutriscore_grade',
  'ecoscore_grade',
  'nova_group',
  'quantity',
  'serving_size',
  'allergens',
  'allergens_from_ingredients',
  'traces',
  'additives_tags',
  'categories',
  'labels',
  'ingredients_analysis_tags',
  'origins',
  'manufacturing_places',
  'emb_codes',
  'countries',
  'packaging',
  'packaging_tags',
  'created_t',
  'creator',
  'last_modified_t',
  'last_editor',
  'editors_tags',
  'last_checked_t',
  'last_checker',
].join(',')

const openFoodFactsOrigin = 'https://world.openfoodfacts.org'
const openFoodFactsDevProxyPrefix = '/__openfoodfacts'
const openFoodFactsDevProxyCgiPrefix = '/__off-cgi'
const openPricesOrigin = 'https://prices.openfoodfacts.org'
const openPricesDevProxyPrefix = '/__openprices'

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

const getOpenPricesCandidates = (pathname: string) =>
  import.meta.env.DEV
    ? [
        `${openPricesDevProxyPrefix}${pathname.replace(/^\/api\/v1/u, '')}`,
        `${openPricesOrigin}${pathname}`,
      ]
    : [`${openPricesOrigin}${pathname}`]

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
  nutrient_levels?: Record<string, string | undefined>
  nutriscore_grade?: string
  ecoscore_grade?: string
  nova_group?: number | string
  quantity?: string
  serving_size?: string
  allergens?: string
  allergens_from_ingredients?: string
  traces?: string
  additives_tags?: string[]
  categories?: string
  labels?: string
  ingredients_analysis_tags?: string[]
  origins?: string
  manufacturing_places?: string
  emb_codes?: string
  countries?: string
  packaging?: string
  packaging_tags?: string[]
  created_t?: number | string
  creator?: string
  last_modified_t?: number | string
  last_editor?: string
  editors_tags?: string[]
  last_checked_t?: number | string
  last_checker?: string
}

interface OpenFoodFactsResponse {
  code?: string
  product?: OpenFoodFactsProduct
  status: 0 | 1
}

interface OpenPricesProductResponse {
  code?: string
  price_count?: number | string
  price_currency_count?: number | string
  location_count?: number | string
  user_count?: number | string
}

interface OpenPricesPriceLocation {
  osm_name?: string | null
  osm_address_city?: string | null
  osm_address_country?: string | null
}

interface OpenPricesPrice {
  id?: number
  price?: number | string | null
  price_without_discount?: number | string | null
  currency?: string | null
  date?: string | null
  price_is_discounted?: boolean
  location?: OpenPricesPriceLocation
}

interface OpenPricesListResponse {
  items?: OpenPricesPrice[]
}

interface OpenPricesStatsResponse {
  price__count?: number | string
  price__min?: number | string
  price__max?: number | string
  price__avg?: number | string
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

const nutrientLevelDefinitions: Array<{
  id: string
  label: string
  nutrimentKey: string
  unit: string
}> = [
  { id: 'fat', label: 'Fat', nutrimentKey: 'fat_100g', unit: 'g' },
  {
    id: 'saturated-fat',
    label: 'Saturated fat',
    nutrimentKey: 'saturated-fat_100g',
    unit: 'g',
  },
  { id: 'sugars', label: 'Sugars', nutrimentKey: 'sugars_100g', unit: 'g' },
  { id: 'salt', label: 'Salt', nutrimentKey: 'salt_100g', unit: 'g' },
]

const isNutrientLevelValue = (
  value: string | undefined,
): value is NutrientLevelValue =>
  value === 'low' || value === 'moderate' || value === 'high'

const buildNutrientLevels = (
  levels: Record<string, string | undefined> | undefined,
  nutriments: Record<string, number | string | undefined> | undefined,
): NutrientLevel[] => {
  if (!levels) {
    return []
  }

  return nutrientLevelDefinitions.flatMap((definition) => {
    const level = levels[definition.id]
    if (!isNutrientLevelValue(level)) {
      return []
    }

    return [
      {
        id: definition.id,
        label: definition.label,
        level,
        value: nutriments ? readNumber(nutriments[definition.nutrimentKey]) : null,
        unit: definition.unit,
      },
    ]
  })
}

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

const cleanRawTags = (tags: string[] | undefined): string | null => {
  if (!Array.isArray(tags)) {
    return null
  }

  const cleaned = tags
    .map((tag) => tag.trim().replace(/^[a-z]{2}:/u, '').replace(/-/gu, ' '))
    .map((tag) => {
      if (!tag) {
        return tag
      }
      if (/^e\d+/iu.test(tag)) {
        return tag.toUpperCase()
      }
      return tag.charAt(0).toUpperCase() + tag.slice(1)
    })
    .filter((tag) => tag.length > 0 && !/status unknown$/iu.test(tag))

  return cleaned.length > 0 ? cleaned.join(', ') : null
}

const normalizeNutriScore = (value: string | undefined): string | null => {
  const grade = value?.trim().toUpperCase()
  return grade && /^[A-E]$/u.test(grade) ? grade : null
}

const normalizeEcoScore = (value: string | undefined): string | null => {
  const grade = value?.trim().toUpperCase()
  return grade && /^[A-E]$/u.test(grade) ? grade : null
}

const normalizeNovaGroup = (value: number | string | undefined): number | null => {
  const group = readNumber(value)
  return group !== null && group >= 1 && group <= 4 ? group : null
}

const normalizeCurrency = (value: string | null | undefined): string | null => {
  const code = value?.trim().toUpperCase()
  return code && /^[A-Z]{3}$/u.test(code) ? code : null
}

const buildOpenPricesSummary = async (
  barcode: string,
): Promise<ProductPriceSummary | null> => {
  const productResult = await fetchJsonWithRetry<OpenPricesProductResponse>(
    getOpenPricesCandidates(`/api/v1/products/code/${encodeURIComponent(barcode)}`),
  )

  if (!productResult.ok || !productResult.data) {
    return null
  }

  const priceCount = readNumber(productResult.data.price_count) ?? 0
  if (priceCount <= 0) {
    return null
  }

  const currencyCount = readNumber(productResult.data.price_currency_count) ?? 0
  const locationCount = readNumber(productResult.data.location_count) ?? 0
  const contributorCount = readNumber(productResult.data.user_count) ?? 0

  const latestResult = await fetchJsonWithRetry<OpenPricesListResponse>(
    getOpenPricesCandidates(
      `/api/v1/prices?product_code=${encodeURIComponent(barcode)}&order_by=-date&size=1`,
    ),
  )

  const latest = latestResult.ok
    ? latestResult.data?.items?.[0]
    : undefined

  const latestCurrency = normalizeCurrency(latest?.currency)
  const latestPrice =
    latest && latest.price !== null && latest.price !== undefined
      ? readNumber(latest.price)
      : null
  const latestDate = cleanText(latest?.date ?? undefined)
  const latestLocation =
    cleanText(latest?.location?.osm_name ?? undefined) ??
    cleanText(latest?.location?.osm_address_city ?? undefined) ??
    cleanText(latest?.location?.osm_address_country ?? undefined)
  const latestIsDiscounted =
    typeof latest?.price_is_discounted === 'boolean'
      ? latest.price_is_discounted
      : null

  let priceMin: number | null = null
  let priceMax: number | null = null
  let priceAverage: number | null = null

  if (latestCurrency) {
    const statsResult = await fetchJsonWithRetry<OpenPricesStatsResponse>(
      getOpenPricesCandidates(
        `/api/v1/prices/stats?product_code=${encodeURIComponent(barcode)}&currency=${encodeURIComponent(latestCurrency)}`,
      ),
    )

    if (statsResult.ok && statsResult.data) {
      priceMin = readNumber(statsResult.data.price__min)
      priceMax = readNumber(statsResult.data.price__max)
      priceAverage = readNumber(statsResult.data.price__avg)
    }
  }

  return {
    barcode,
    priceCount,
    currencyCount,
    locationCount,
    contributorCount,
    latestPrice,
    latestCurrency,
    latestDate,
    latestLocation,
    latestIsDiscounted,
    priceMin,
    priceMax,
    priceAverage,
    statsCurrency: latestCurrency,
  }
}

interface OpenPricesPageResponse {
  items?: OpenPricesPrice[]
  page?: number
  pages?: number
}

const mapPriceRecord = (price: OpenPricesPrice, index: number): PriceRecord => ({
  id: typeof price.id === 'number' ? price.id : index,
  price:
    price.price !== null && price.price !== undefined
      ? readNumber(price.price)
      : null,
  priceWithoutDiscount:
    price.price_without_discount !== null &&
    price.price_without_discount !== undefined
      ? readNumber(price.price_without_discount)
      : null,
  isDiscounted: price.price_is_discounted === true,
  currency: normalizeCurrency(price.currency),
  date: cleanText(price.date ?? undefined),
  locationName: cleanText(price.location?.osm_name ?? undefined),
  locationCity: cleanText(price.location?.osm_address_city ?? undefined),
  locationCountry: cleanText(price.location?.osm_address_country ?? undefined),
})

export async function fetchPriceHistory(
  barcode: string,
): Promise<PriceRecord[]> {
  const cacheKey = `prices:${barcode}`
  const cached = readCache<PriceRecord[]>(cacheKey)
  if (cached && isFresh(cached)) {
    return cached.value
  }

  const pageSize = 100
  const maxPages = 5
  const records: PriceRecord[] = []

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchJsonWithRetry<OpenPricesPageResponse>(
      getOpenPricesCandidates(
        `/api/v1/prices?product_code=${encodeURIComponent(barcode)}&order_by=-date&page=${page}&size=${pageSize}`,
      ),
    )

    if (!result.ok || !result.data) {
      if (records.length > 0) {
        break
      }
      if (cached) {
        return cached.value
      }
      throw buildUnavailableError(result)
    }

    const items = Array.isArray(result.data.items) ? result.data.items : []
    items.forEach((item, index) => {
      records.push(mapPriceRecord(item, records.length + index))
    })

    const totalPages = readNumber(result.data.pages) ?? page
    if (items.length < pageSize || page >= totalPages) {
      break
    }
  }

  writeCache(cacheKey, records)
  return records
}

const buildMissingProductDetails = (barcode: string): ProductDetails => ({
  barcode,
  name: null,
  ingredients: null,
  brands: null,
  imageUrl: null,
  nutriScore: null,
  ecoScore: null,
  novaGroup: null,
  quantity: null,
  servingSize: null,
  allergens: null,
  allergensFromIngredients: null,
  traces: null,
  additives: null,
  categories: null,
  labels: null,
  ingredientsAnalysis: null,
  origins: null,
  manufacturingPlaces: null,
  embCodes: null,
  countries: null,
  packaging: null,
  nutrients: buildNutrients(undefined),
  nutrientLevels: [],
  isProductFound: false,
  createdAt: null,
  creator: null,
  lastModifiedAt: null,
  lastEditor: null,
  editorCount: 0,
  lastCheckedAt: null,
  lastChecker: null,
  priceSummary: null,
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
    ecoScore: normalizeEcoScore(product?.ecoscore_grade),
    novaGroup: normalizeNovaGroup(product?.nova_group),
    quantity: cleanText(product?.quantity),
    servingSize: cleanText(product?.serving_size),
    allergens: cleanTagList(product?.allergens),
    allergensFromIngredients: cleanTagList(product?.allergens_from_ingredients),
    traces: cleanTagList(product?.traces),
    additives: cleanRawTags(product?.additives_tags),
    categories: cleanTagList(product?.categories),
    labels: cleanTagList(product?.labels),
    ingredientsAnalysis: cleanAnalysisTags(product?.ingredients_analysis_tags),
    origins: cleanTagList(product?.origins),
    manufacturingPlaces: cleanTagList(product?.manufacturing_places),
    embCodes: cleanTagList(product?.emb_codes),
    countries: cleanTagList(product?.countries),
    packaging:
      cleanTagList(product?.packaging) ?? cleanRawTags(product?.packaging_tags),
    nutrients: buildNutrients(product?.nutriments),
    nutrientLevels: buildNutrientLevels(
      product?.nutrient_levels,
      product?.nutriments,
    ),
    isProductFound: data.status === 1,
    createdAt: readNumber(product?.created_t),
    creator: cleanText(product?.creator),
    lastModifiedAt: readNumber(product?.last_modified_t),
    lastEditor: cleanText(product?.last_editor),
    editorCount: Array.isArray(product?.editors_tags)
      ? product.editors_tags.length
      : 0,
    lastCheckedAt: readNumber(product?.last_checked_t),
    lastChecker: cleanText(product?.last_checker),
    priceSummary: null,
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
    if (cached.value.isProductFound && cached.value.priceSummary === null) {
      const priceSummary = await buildOpenPricesSummary(cached.value.barcode)
      const enriched: ProductDetails = { ...cached.value, priceSummary }
      writeCache(cacheKey, enriched)
      return enriched
    }
    return cached.value
  }

  const result = await fetchJsonWithRetry<OpenFoodFactsResponse>(
    getLookupCandidates(barcode),
  )

  if (result.ok && result.data) {
    const details = mapProductDetails(barcode, result.data)
    if (details.isProductFound) {
      details.priceSummary = await buildOpenPricesSummary(details.barcode)
    }
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
  'ecoscore_grade',
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
  ecoScore: normalizeEcoScore(product.ecoscore_grade),
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

interface OpenFoodFactsSessionResponse {
  status?: number | string
  status_verbose?: string
  user_id?: string
}

interface OpenFoodFactsWriteResponse {
  status?: number | string
  status_verbose?: string
}

export interface OpenFoodFactsAuthCredentials {
  username: string
  password: string
}

export interface ProductContributionInput {
  barcode: string
  productName: string
  brands?: string
  quantity?: string
  lc?: string
  comment?: string
}

const getSessionCandidates = () =>
  import.meta.env.DEV
    ? [`${openFoodFactsDevProxyCgiPrefix}/session.pl`]
    : [`${openFoodFactsOrigin}/cgi/session.pl`]

const getContributionCandidates = () =>
  import.meta.env.DEV
    ? [`${openFoodFactsDevProxyCgiPrefix}/product_jqm2.pl`]
    : [`${openFoodFactsOrigin}/cgi/product_jqm2.pl`]

const isSuccessStatus = (value: number | string | undefined) =>
  value === 1 || value === '1'

const buildFormBody = (fields: Record<string, string | undefined>) => {
  const form = new URLSearchParams()
  Object.entries(fields).forEach(([key, value]) => {
    if (value && value.trim()) {
      form.set(key, value)
    }
  })
  return form.toString()
}

const parseOffHtmlError = (html: string): string | null => {
  if (/incorrect user name or password/iu.test(html)) {
    return 'Incorrect username or password. Use your OFF username (not email).'
  }
  if (/temporarily unavailable|unusually high demand|service unavailable/iu.test(html)) {
    return 'Open Food Facts is temporarily unavailable. Please try again shortly.'
  }
  return null
}

export async function signInOpenFoodFacts(
  credentials: OpenFoodFactsAuthCredentials,
): Promise<string> {
  const username = credentials.username.trim()
  const password = credentials.password
  if (!username || !password) {
    throw new Error('Username and password are required.')
  }

  let lastFailure: string | null = null

  for (const url of getSessionCandidates()) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: buildFormBody({ jqm: '1', user_id: username, password }),
      })

      if (!response.ok) {
        const text = await response.text()
        const parsedError = parseOffHtmlError(text)
        if (parsedError) {
          throw new Error(parsedError)
        }
        lastFailure = `Open Food Facts sign-in failed (HTTP ${response.status}).`
        continue
      }

      const rawPayload = await response.text()
      let payload: OpenFoodFactsSessionResponse | null = null
      try {
        payload = JSON.parse(rawPayload) as OpenFoodFactsSessionResponse
      } catch {
        const parsedError = parseOffHtmlError(rawPayload)
        if (parsedError) {
          throw new Error(parsedError)
        }
      }

      if (!payload) {
        lastFailure = 'Open Food Facts sign-in failed.'
        continue
      }

      if (payload.user_id?.trim() || isSuccessStatus(payload.status)) {
        return payload.user_id?.trim() || username
      }

      if (payload.status_verbose?.toLowerCase().includes('incorrect')) {
        throw new Error('Incorrect username or password.')
      }

      lastFailure = payload.status_verbose ?? 'Sign-in failed.'
    } catch (error) {
      if (error instanceof Error && /incorrect username or password/iu.test(error.message)) {
        throw error
      }
      lastFailure = error instanceof Error ? error.message : 'Sign-in failed.'
    }
  }

  throw new Error(lastFailure ?? 'Open Food Facts sign-in is currently unavailable.')
}

export interface OpenFoodFactsAccount {
  name?: string
  email?: string
  country?: string
}

const getAccountCandidates = () =>
  import.meta.env.DEV
    ? [`${openFoodFactsDevProxyCgiPrefix}/user.pl`]
    : [`${openFoodFactsOrigin}/cgi/user.pl`]

const extractInputValue = (html: string, field: string): string | undefined => {
  const tag = html.match(
    new RegExp(`<input[^>]*\\bname\\s*=\\s*["']${field}["'][^>]*>`, 'iu'),
  )?.[0]
  const value = tag?.match(/\bvalue\s*=\s*["']([^"']*)["']/iu)?.[1]
  return value?.trim() || undefined
}

const extractSelectedCountry = (html: string): string | undefined => {
  const select = html.match(
    /<select[^>]*\bname\s*=\s*["']country["'][^>]*>([\s\S]*?)<\/select>/iu,
  )?.[1]
  if (!select) {
    return undefined
  }
  const selected = select.match(
    /<option[^>]*\bselected\b[^>]*>([^<]*)<\/option>/iu,
  )?.[1]
  return selected?.trim() || undefined
}

export async function fetchOpenFoodFactsAccount(
  credentials: OpenFoodFactsAuthCredentials,
): Promise<OpenFoodFactsAccount | null> {
  const username = credentials.username.trim()
  const password = credentials.password
  if (!username || !password) {
    return null
  }

  for (const url of getAccountCandidates()) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: buildFormBody({
          type: 'edit',
          userid: username,
          user_id: username,
          password,
        }),
      })

      if (!response.ok) {
        continue
      }

      const html = await response.text()
      const account: OpenFoodFactsAccount = {
        name: extractInputValue(html, 'name'),
        email: extractInputValue(html, 'email'),
        country: extractSelectedCountry(html),
      }

      if (account.name || account.email || account.country) {
        return account
      }
    } catch {
      // Ignore and try the next candidate; profile details are best-effort.
    }
  }

  return null
}

export async function submitProductContribution(
  input: ProductContributionInput,
  credentials: OpenFoodFactsAuthCredentials,
): Promise<void> {
  const barcode = input.barcode.trim()
  const productName = input.productName.trim()
  const username = credentials.username.trim()
  const password = credentials.password

  if (!barcode || !productName || !username || !password) {
    throw new Error('Barcode, product name, username, and password are required.')
  }

  let lastFailure: string | null = null

  for (const url of getContributionCandidates()) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: buildFormBody({
          code: barcode,
          lc: input.lc ?? 'en',
          user_id: username,
          password,
          product_name: productName,
          brands: input.brands,
          quantity: input.quantity,
          comment: input.comment,
          app_name: 'OpenFoodFactsDesignConcept',
          app_version: '0.0',
          app_uuid: `web-${username}`,
        }),
      })

      if (!response.ok) {
        lastFailure = `HTTP ${response.status}`
        continue
      }

      const payload = (await response.json()) as OpenFoodFactsWriteResponse
      if (isSuccessStatus(payload.status)) {
        return
      }

      lastFailure = payload.status_verbose ?? 'Contribution could not be saved.'
    } catch (error) {
      lastFailure =
        error instanceof Error ? error.message : 'Contribution could not be saved.'
    }
  }

  throw new Error(lastFailure ?? 'Open Food Facts contribution is currently unavailable.')
}
