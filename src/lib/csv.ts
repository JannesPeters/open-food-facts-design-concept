import type { NutrientValue, SavedProductRecord } from '../types'

const csvHeaders = [
  'savedAt',
  'shop',
  'offDataFaulty',
  'barcode',
  'name',
  'brands',
  'price',
  'ingredients',
  'energyKcalPer100g',
  'fatPer100g',
  'sugarsPer100g',
  'saltPer100g',
  'proteinPer100g',
]

const escapeCsvValue = (value: string | number | boolean | null | undefined) =>
  `"${String(value ?? '').replaceAll('"', '""')}"`

const readNutrient = (
  nutrients: NutrientValue[],
  nutrientId: string,
): number | '' => nutrients.find((nutrient) => nutrient.id === nutrientId)?.value ?? ''

export function downloadRecordsCsv(records: SavedProductRecord[]) {
  const lines = [
    csvHeaders.join(','),
    ...records.map((record) =>
      [
        record.savedAt,
        record.shop,
        record.offDataFaulty,
        record.barcode,
        record.name,
        record.brands,
        record.price,
        record.ingredients,
        readNutrient(record.nutrients, 'energy-kcal_100g'),
        readNutrient(record.nutrients, 'fat_100g'),
        readNutrient(record.nutrients, 'sugars_100g'),
        readNutrient(record.nutrients, 'salt_100g'),
        readNutrient(record.nutrients, 'proteins_100g'),
      ]
        .map(escapeCsvValue)
        .join(','),
    ),
  ].join('\n')

  const file = new Blob([lines], {
    type: 'text/csv;charset=utf-8',
  })
  const downloadUrl = URL.createObjectURL(file)
  const anchor = document.createElement('a')

  anchor.href = downloadUrl
  anchor.download = `food-scanner-history-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl)
  }, 0)
}
