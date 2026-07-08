export interface NutrientValue {
  id: string
  label: string
  unit: string
  value: number | null
  indent?: boolean
  text?: string | null
}

export interface ProductDetails {
  barcode: string
  name: string | null
  ingredients: string | null
  brands: string | null
  imageUrl: string | null
  nutriScore: string | null
  novaGroup: number | null
  quantity: string | null
  servingSize: string | null
  allergens: string | null
  categories: string | null
  labels: string | null
  ingredientsAnalysis: string | null
  nutrients: NutrientValue[]
  isProductFound: boolean
}

export interface ProductSearchResult {
  barcode: string
  name: string | null
  brands: string | null
  imageUrl: string | null
  nutriScore: string | null
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

export interface SavedProductRecord extends ProductDetails {
  id: string
  price: number | null
  savedAt: string
  shop: string | null
  offDataFaulty: boolean
}
