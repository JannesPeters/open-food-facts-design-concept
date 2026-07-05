import { openDB, type DBSchema } from 'idb'
import type { SavedProductRecord } from '../types'

interface FoodScannerDatabase extends DBSchema {
  records: {
    key: string
    value: SavedProductRecord
  }
}

const databasePromise = openDB<FoodScannerDatabase>('food-scanner-db', 1, {
  upgrade(database) {
    database.createObjectStore('records', {
      keyPath: 'id',
    })
  },
})

export async function listSavedRecords(): Promise<SavedProductRecord[]> {
  const database = await databasePromise
  const records = await database.getAll('records')

  return records.sort((left, right) => right.savedAt.localeCompare(left.savedAt))
}

export async function saveRecord(record: SavedProductRecord) {
  const database = await databasePromise
  await database.put('records', record)
}
