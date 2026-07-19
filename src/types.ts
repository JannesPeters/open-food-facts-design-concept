export interface NutrientValue {
  id: string
  label: string
  unit: string
  value: number | null
  indent?: boolean
  text?: string | null
}

export type NutrientLevelValue = 'low' | 'moderate' | 'high'

export interface NutrientLevel {
  id: string
  label: string
  level: NutrientLevelValue
  value: number | null
  unit: string
}

export interface ProductPriceSummary {
  barcode: string
  priceCount: number
  currencyCount: number
  locationCount: number
  contributorCount: number
  latestPrice: number | null
  latestCurrency: string | null
  latestDate: string | null
  latestLocation: string | null
  latestIsDiscounted: boolean | null
  priceMin: number | null
  priceMax: number | null
  priceAverage: number | null
  statsCurrency: string | null
}

export interface ProductPhotoCategorySummary {
  key: string
  label: string
  count: number
  photos: ProductPhoto[]
}

export interface ProductPhoto {
  id: string
  url: string
}

export interface ProductPhotoSummary {
  barcode: string
  totalCount: number
  categories: ProductPhotoCategorySummary[]
}

export interface PriceRecord {
  id: number
  price: number | null
  priceWithoutDiscount: number | null
  isDiscounted: boolean
  currency: string | null
  date: string | null
  locationName: string | null
  locationCity: string | null
  locationCountry: string | null
}

export interface ProductDetails {
  barcode: string
  name: string | null
  ingredients: string | null
  brands: string | null
  imageUrl: string | null
  nutriScore: string | null
  ecoScore: string | null
  novaGroup: number | null
  quantity: string | null
  servingSize: string | null
  allergens: string | null
  allergensFromIngredients: string | null
  traces: string | null
  additives: string | null
  categories: string | null
  labels: string | null
  ingredientsAnalysis: string | null
  origins: string | null
  manufacturingPlaces: string | null
  embCodes: string | null
  countries: string | null
  packaging: string | null
  nutrients: NutrientValue[]
  nutrientLevels: NutrientLevel[]
  isProductFound: boolean
  createdAt: number | null
  creator: string | null
  lastModifiedAt: number | null
  lastEditor: string | null
  editorCount: number
  lastCheckedAt: number | null
  lastChecker: string | null
  priceSummary: ProductPriceSummary | null
  photoSummary: ProductPhotoSummary | null
}

export interface ProductSearchResult {
  barcode: string
  name: string | null
  brands: string | null
  imageUrl: string | null
  nutriScore: string | null
  ecoScore: string | null
  novaGroup: number | null
  quantity: string | null
}

export interface ProductSearchResponse {
  results: ProductSearchResult[]
  count: number
  page: number
  pageSize: number
  pageCount: number
}
