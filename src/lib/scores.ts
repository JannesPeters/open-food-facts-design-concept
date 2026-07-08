/**
 * Shared mapping of food scores onto the single 5-step rating scale
 * (rating-1 best … rating-5 worst) defined in src/index.css. Nutri-Score,
 * Eco-Score, and NOVA all map onto this one scale — never invent per-score
 * palettes.
 */
export const ratingClasses: Record<number, string> = {
  1: 'bg-rating-1 text-rating-1-foreground',
  2: 'bg-rating-2 text-rating-2-foreground',
  3: 'bg-rating-3 text-rating-3-foreground',
  4: 'bg-rating-4 text-rating-4-foreground',
  5: 'bg-rating-5 text-rating-5-foreground',
}

export const nutriScoreRating: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
}

export const ecoScoreRating: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
}

export const novaRating: Record<number, number> = {
  1: 1,
  2: 3,
  3: 4,
  4: 5,
}

export const nutrientLevelRating: Record<string, number> = {
  low: 1,
  moderate: 3,
  high: 5,
}

export const nutrientLevelLabel: Record<string, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
}

export const sanitizeBarcode = (value: string) => value.replace(/[^\d]/g, '')

export const splitTags = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
