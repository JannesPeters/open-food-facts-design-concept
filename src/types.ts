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
  categories: string | null
  labels: string | null
  ingredientsAnalysis: string | null
  nutrients: NutrientValue[]
  nutrientLevels: NutrientLevel[]
  isProductFound: boolean
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
