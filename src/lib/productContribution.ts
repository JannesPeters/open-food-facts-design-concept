import type { ProductDetails } from '@/types'

export type ProductEditorKind = 'text' | 'textarea' | 'number'

export const editableProductFieldKeys = [
  'name',
  'brands',
  'quantity',
  'servingSize',
  'ingredients',
  'allergens',
  'categories',
  'labels',
] as const

export type EditableProductFieldKey = (typeof editableProductFieldKeys)[number]

interface EditableProductFieldDefinition {
  offField: string
  label: string
  kind: Exclude<ProductEditorKind, 'number'>
  helpText?: string
  normalize: (value: string) => string | null
}

const normalizeNullableText = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const normalizeOffTagList = (value: string): string | null => {
  const normalized = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const match = entry.match(/^([a-z]{2}):(.*)$/iu)
      const prefix = match ? `${match[1].toLowerCase()}:` : ''
      const rawLabel = match ? match[2] : entry
      const slug = rawLabel
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/gu, '-')
        .replace(/-+/gu, '-')
        .replace(/^-+|-+$/gu, '')
      return slug ? `${prefix}${slug}` : ''
    })
    .filter((entry) => entry.length > 0)

  return normalized.length > 0 ? normalized.join(', ') : null
}

export const editableProductFields = {
  name: {
    offField: 'product_name',
    label: 'Product name',
    kind: 'text',
    normalize: normalizeNullableText,
  },
  brands: {
    offField: 'brands',
    label: 'Brands',
    kind: 'text',
    normalize: normalizeNullableText,
  },
  quantity: {
    offField: 'quantity',
    label: 'Quantity',
    kind: 'text',
    normalize: normalizeNullableText,
  },
  servingSize: {
    offField: 'serving_size',
    label: 'Serving size',
    kind: 'text',
    normalize: normalizeNullableText,
  },
  ingredients: {
    offField: 'ingredients_text',
    label: 'Ingredients',
    kind: 'textarea',
    normalize: normalizeNullableText,
  },
  allergens: {
    offField: 'allergens_tags',
    label: 'Allergens',
    kind: 'textarea',
    helpText: 'Use OFF tag format (comma-separated), e.g. en:milk, en:soybeans.',
    normalize: normalizeOffTagList,
  },
  categories: {
    offField: 'categories_tags',
    label: 'Categories',
    kind: 'textarea',
    helpText:
      'Use OFF tag format (comma-separated), e.g. en:breakfast-cereals, en:oatmeal.',
    normalize: normalizeOffTagList,
  },
  labels: {
    offField: 'labels_tags',
    label: 'Labels',
    kind: 'textarea',
    helpText:
      'Use OFF tag format (comma-separated), e.g. en:organic, en:no-added-sugar.',
    normalize: normalizeOffTagList,
  },
} satisfies Record<EditableProductFieldKey, EditableProductFieldDefinition>

export const editableNutrientFields = [
  { id: 'fat_100g', label: 'Fat', unit: 'g', offField: 'nutriment_fat' },
  {
    id: 'saturated-fat_100g',
    label: 'of which saturates',
    unit: 'g',
    indent: true,
    offField: 'nutriment_saturated-fat',
  },
  {
    id: 'carbohydrates_100g',
    label: 'Carbohydrate',
    unit: 'g',
    offField: 'nutriment_carbohydrates',
  },
  {
    id: 'sugars_100g',
    label: 'of which sugars',
    unit: 'g',
    indent: true,
    offField: 'nutriment_sugars',
  },
  { id: 'fiber_100g', label: 'Fibre', unit: 'g', offField: 'nutriment_fiber' },
  { id: 'proteins_100g', label: 'Protein', unit: 'g', offField: 'nutriment_proteins' },
  { id: 'salt_100g', label: 'Salt', unit: 'g', offField: 'nutriment_salt' },
] as const

type EditableNutrientFieldDefinition = (typeof editableNutrientFields)[number]
const editableEnergyNutrientId = 'energy'
const parseEnergyNumber = (value: string | undefined): number | null => {
  if (!value) {
    return null
  }
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}
const parseEnergyParts = (nutrient: ProductDetails['nutrients'][number]) => {
  const kilojoules = parseEnergyNumber(
    nutrient.text?.match(/([0-9]+(?:[.,][0-9]+)?)\s*kJ/iu)?.[1],
  )
  const kilocaloriesFromText = parseEnergyNumber(
    nutrient.text?.match(/([0-9]+(?:[.,][0-9]+)?)\s*kcal/iu)?.[1],
  )

  return {
    kilojoules,
    kilocalories:
      kilocaloriesFromText ??
      (typeof nutrient.value === 'number' && Number.isFinite(nutrient.value)
        ? nutrient.value
        : null),
  }
}

const editableNutrientFieldsById = new Map<string, EditableNutrientFieldDefinition>(
  editableNutrientFields.map((definition) => [definition.id, definition]),
)

export function getEditableProductField(
  key: EditableProductFieldKey,
): EditableProductFieldDefinition {
  return editableProductFields[key]
}

export function normalizeEditableProductField(
  key: EditableProductFieldKey,
  value: string,
): string | null {
  return editableProductFields[key].normalize(value)
}

export function isEditableNutrient(nutrientId: string): boolean {
  return nutrientId === editableEnergyNutrientId || editableNutrientFieldsById.has(nutrientId)
}

export function buildChangedProductFields(
  current: ProductDetails,
  original: ProductDetails,
): Record<string, string> {
  const fields: Record<string, string> = {}

  editableProductFieldKeys.forEach((key) => {
    const currentValue = current[key]?.trim() ?? ''
    const originalValue = original[key]?.trim() ?? ''
    if (currentValue !== originalValue) {
      fields[editableProductFields[key].offField] = currentValue
    }
  })

  const originalNutrients = new Map(
    original.nutrients.map((nutrient) => [nutrient.id, nutrient]),
  )
  let hasNutrientChange = false

  current.nutrients.forEach((nutrient) => {
    const originalNutrient = originalNutrients.get(nutrient.id)
    if (!originalNutrient) {
      return
    }

    if (nutrient.id === editableEnergyNutrientId) {
      const currentEnergy = parseEnergyParts(nutrient)
      const originalEnergy = parseEnergyParts(originalNutrient)
      if (
        currentEnergy.kilojoules !== originalEnergy.kilojoules ||
        currentEnergy.kilocalories !== originalEnergy.kilocalories
      ) {
        fields['nutriment_energy-kj'] =
          currentEnergy.kilojoules === null ? '' : String(currentEnergy.kilojoules)
        fields['nutriment_energy-kj_unit'] = 'kJ'
        fields['nutriment_energy-kcal'] =
          currentEnergy.kilocalories === null ? '' : String(currentEnergy.kilocalories)
        fields['nutriment_energy-kcal_unit'] = 'kcal'
        hasNutrientChange = true
      }
      return
    }

    const definition = editableNutrientFieldsById.get(nutrient.id)
    if (!definition || nutrient.value === originalNutrient.value) {
      return
    }

    fields[definition.offField] = nutrient.value === null ? '' : String(nutrient.value)
    fields[`${definition.offField}_unit`] = nutrient.unit
    hasNutrientChange = true
  })

  if (hasNutrientChange) {
    fields.nutrition_data_per = '100g'
  }

  return fields
}
