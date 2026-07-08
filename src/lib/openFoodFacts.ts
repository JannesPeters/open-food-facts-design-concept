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

export async function fetchProductDetails(
  barcode: string,
): Promise<ProductDetails> {
  let lastErrorStatus: number | null = null
  let lastError: Error | null = null

  for (const url of getLookupCandidates(barcode)) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        const data = (await response.json()) as OpenFoodFactsResponse
        const product = data.product

        return {
          barcode: data.code ?? barcode,
          name:
            product?.product_name?.trim() ||
            product?.generic_name?.trim() ||
            null,
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

      lastErrorStatus = response.status
    } catch (error) {
      lastError = error instanceof Error ? error : null
    }
  }

  if (lastErrorStatus === 404) {
    return buildMissingProductDetails(barcode)
  }

  throw new Error(
    lastErrorStatus
      ? `Open Food Facts could not be reached right now (HTTP ${lastErrorStatus}). Please try again shortly.`
      : lastError?.message
        ? `Open Food Facts could not be reached right now (${lastError.message}). Please try again shortly.`
      : 'Open Food Facts could not be reached right now. Please try again shortly.',
  )
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

const buildSearchQuery = (searchTerms: string, page: number, pageSize: number) =>
  [
    `search_terms=${encodeURIComponent(searchTerms)}`,
    `fields=${encodeURIComponent(searchRequestedFields)}`,
    `page=${encodeURIComponent(String(page))}`,
    `page_size=${encodeURIComponent(String(pageSize))}`,
    'sort_by=popularity_key',
  ].join('&')

const getDevProxySearchUrl = (
  searchTerms: string,
  page: number,
  pageSize: number,
) =>
  `${openFoodFactsDevProxyPrefix}/search?${buildSearchQuery(searchTerms, page, pageSize)}`

const getDirectSearchUrl = (
  searchTerms: string,
  page: number,
  pageSize: number,
) =>
  `${openFoodFactsOrigin}/api/v2/search?${buildSearchQuery(searchTerms, page, pageSize)}`

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
  let lastErrorStatus: number | null = null
  let lastError: Error | null = null

  for (const url of getSearchCandidates(searchTerms, page, pageSize)) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        const data = (await response.json()) as OpenFoodFactsSearchResponse
        const products = Array.isArray(data.products) ? data.products : []

        return {
          results: products
            .map(mapSearchProduct)
            .filter((result) => result.barcode.length > 0),
          count: readNumber(data.count) ?? 0,
          page: readNumber(data.page) ?? page,
          pageSize: readNumber(data.page_size) ?? pageSize,
          pageCount: readNumber(data.page_count) ?? 0,
        }
      }

      lastErrorStatus = response.status
    } catch (error) {
      lastError = error instanceof Error ? error : null
    }
  }

  throw new Error(
    lastErrorStatus
      ? `Open Food Facts could not be reached right now (HTTP ${lastErrorStatus}). Please try again shortly.`
      : lastError?.message
        ? `Open Food Facts could not be reached right now (${lastError.message}). Please try again shortly.`
      : 'Open Food Facts could not be reached right now. Please try again shortly.',
  )
}
