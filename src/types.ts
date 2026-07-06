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
  nutrients: NutrientValue[]
  isProductFound: boolean
}

export interface SavedProductRecord extends ProductDetails {
  id: string
  price: number | null
  savedAt: string
  shop: string | null
  offDataFaulty: boolean
}
