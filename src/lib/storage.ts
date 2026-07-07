import { openDB, type DBSchema } from 'idb'
import type { SavedProductRecord } from '../types'

interface FoodScannerDatabase extends DBSchema {
  records: {
    key: string
    value: SavedProductRecord
  }
  meta: {
    key: string
    value: boolean
  }
}

const defaultRecordId = 'default-4046700001806'
const defaultRecordsSeedKey = 'default-records-seeded-v1'

const createDefaultRecord = (): SavedProductRecord => ({
  id: defaultRecordId,
  barcode: '4046700001806',
  name: 'Protein Milch',
  ingredients: 'Magermilch, 5% Milcheiweiss.',
  brands: 'Schwarzwaldmilch',
  imageUrl:
    'https://images.openfoodfacts.org/images/products/404/670/000/1806/front_en.56.400.jpg',
  nutriScore: 'B',
  novaGroup: 4,
  quantity: '1l',
  servingSize: '100 ml',
  allergens: 'milk',
  categories: 'Milks',
  labels: 'Ohne Gentechnik',
  ingredientsAnalysis: 'Palm oil free, Non vegan, Vegetarian',
  nutrients: [
    {
      id: 'energy',
      label: 'Energy',
      unit: '',
      value: 51,
      text: '216 kJ / 51 kcal',
    },
    { id: 'fat_100g', label: 'Fat', unit: 'g', value: 0.1 },
    {
      id: 'saturated-fat_100g',
      label: 'of which saturates',
      unit: 'g',
      value: 0.1,
      indent: true,
    },
    { id: 'carbohydrates_100g', label: 'Carbohydrate', unit: 'g', value: 5 },
    {
      id: 'sugars_100g',
      label: 'of which sugars',
      unit: 'g',
      value: 5,
      indent: true,
    },
    { id: 'fiber_100g', label: 'Fibre', unit: 'g', value: 0 },
    { id: 'proteins_100g', label: 'Protein', unit: 'g', value: 7.5 },
    { id: 'salt_100g', label: 'Salt', unit: 'g', value: 0.14 },
  ],
  isProductFound: true,
  price: null,
  savedAt: new Date().toISOString(),
  shop: null,
  offDataFaulty: false,
})

const databasePromise = openDB<FoodScannerDatabase>('food-scanner-db', 2, {
  upgrade(database) {
    if (!database.objectStoreNames.contains('records')) {
      database.createObjectStore('records', {
        keyPath: 'id',
      })
    }

    if (!database.objectStoreNames.contains('meta')) {
      database.createObjectStore('meta')
    }
  },
})

const normalizeRecord = (record: SavedProductRecord): SavedProductRecord => ({
  ...record,
  price: record.price ?? null,
  shop: record.shop ?? null,
  offDataFaulty: record.offDataFaulty ?? false,
  nutriScore: record.nutriScore ?? null,
  novaGroup: record.novaGroup ?? null,
  quantity: record.quantity ?? null,
  servingSize: record.servingSize ?? null,
  allergens: record.allergens ?? null,
  categories: record.categories ?? null,
  labels: record.labels ?? null,
  ingredientsAnalysis: record.ingredientsAnalysis ?? null,
})

async function ensureDefaultRecords(database: Awaited<typeof databasePromise>) {
  const alreadySeeded = await database.get('meta', defaultRecordsSeedKey)

  if (alreadySeeded) {
    return
  }

  const existingRecord = await database.get('records', defaultRecordId)

  if (!existingRecord) {
    await database.put('records', normalizeRecord(createDefaultRecord()))
  }

  await database.put('meta', true, defaultRecordsSeedKey)
}

export async function listSavedRecords(): Promise<SavedProductRecord[]> {
  const database = await databasePromise
  await ensureDefaultRecords(database)
  const records = await database.getAll('records')

  return records
    .map(normalizeRecord)
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
}

export async function saveRecord(record: SavedProductRecord) {
  const database = await databasePromise
  await database.put('records', normalizeRecord(record))
}

export async function deleteRecord(recordId: string) {
  const database = await databasePromise
  await database.delete('records', recordId)
}
