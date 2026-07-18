import { describe, expect, it } from 'vitest'
import type { ProductDetails } from '@/types'
import { buildProductContributionFormFields } from './openFoodFacts'
import {
  buildChangedProductFields,
  editableNutrientFields,
  editableProductFieldKeys,
  editableProductFields,
  normalizeEditableProductField,
} from './productContribution'

const buildProduct = (): ProductDetails => ({
  barcode: '1234567890123',
  name: 'Original name',
  ingredients: 'Original ingredients',
  brands: 'Original brand',
  imageUrl: null,
  nutriScore: null,
  ecoScore: null,
  novaGroup: null,
  quantity: '100 g',
  servingSize: '25 g',
  allergens: 'en:milk',
  allergensFromIngredients: null,
  traces: null,
  additives: null,
  categories: 'en:snacks',
  labels: 'en:organic',
  ingredientsAnalysis: null,
  origins: null,
  manufacturingPlaces: null,
  embCodes: null,
  countries: null,
  packaging: null,
  nutrients: editableNutrientFields.map((definition) => ({
    id: definition.id,
    label: definition.label,
    unit: definition.unit,
    value: 1,
    indent: 'indent' in definition ? definition.indent : undefined,
  })),
  nutrientLevels: [],
  isProductFound: true,
  createdAt: null,
  creator: null,
  lastModifiedAt: null,
  lastEditor: null,
  editorCount: 0,
  lastCheckedAt: null,
  lastChecker: null,
  priceSummary: null,
})

describe('editable product field registry', () => {
  it('contains one submit mapping for every editable product field', () => {
    expect(Object.keys(editableProductFields)).toEqual(editableProductFieldKeys)
  })

  it.each(editableProductFieldKeys)(
    'includes an edit to %s in the OFF field payload',
    (key) => {
      const original = buildProduct()
      const current = buildProduct()
      current[key] = 'Changed value'

      expect(buildChangedProductFields(current, original)).toEqual({
        [editableProductFields[key].offField]: 'Changed value',
      })
    },
  )

  it('normalizes taxonomy values through the same registry used by the editor', () => {
    expect(normalizeEditableProductField('labels', 'Organic food, en:Fair Trade')).toBe(
      'organic-food, en:fair-trade',
    )
  })

  it('keeps an empty changed value so OFF can clear the field', () => {
    const original = buildProduct()
    const current = buildProduct()
    current.brands = null

    expect(buildChangedProductFields(current, original)).toEqual({ brands: '' })
  })
})

describe('editable nutrient registry', () => {
  it.each(editableNutrientFields)(
    'includes an edit to $id in the OFF field payload',
    (definition) => {
      const original = buildProduct()
      const current = buildProduct()
      const nutrient = current.nutrients.find(({ id }) => id === definition.id)
      if (!nutrient) {
        throw new Error(`Missing test nutrient ${definition.id}`)
      }
      nutrient.value = 2.5

      expect(buildChangedProductFields(current, original)).toEqual({
        [definition.offField]: '2.5',
        [`${definition.offField}_unit`]: definition.unit,
        nutrition_data_per: '100g',
      })
    },
  )

  it('does not create fields when the product is unchanged', () => {
    const original = buildProduct()
    const current = buildProduct()

    expect(buildChangedProductFields(current, original)).toEqual({})
  })
})

describe('OFF submission contract', () => {
  it('builds the exact form fields consumed by both the dialog and request', () => {
    const original = buildProduct()
    const current = buildProduct()
    const salt = current.nutrients.find(({ id }) => id === 'salt_100g')
    if (!salt) {
      throw new Error('Missing salt test nutrient')
    }
    salt.value = 2.5

    const fields = buildChangedProductFields(current, original)
    expect(
      buildProductContributionFormFields(
        { barcode: current.barcode, fields },
        { username: 'contributor', password: 'secret' },
      ),
    ).toEqual({
      code: '1234567890123',
      lc: 'en',
      user_id: 'contributor',
      password: 'secret',
      nutriment_salt: '2.5',
      nutriment_salt_unit: 'g',
      nutrition_data_per: '100g',
      comment: undefined,
      app_name: 'OpenFoodFactsDesignConcept',
      app_version: '0.0',
      app_uuid: 'web-contributor',
    })
  })
})
