import papers2024 from '../data/papers-2024.json'
import papers2025 from '../data/papers-2025.json'
import papers2026 from '../data/papers.json'
import type { Dataset } from '../types'

export const YEARS = [2024, 2025, 2026] as const
export type Year = (typeof YEARS)[number]

export const DEFAULT_YEAR: Year = 2026

export const datasets: Record<Year, Dataset> = {
  2024: papers2024,
  2025: papers2025,
  2026: papers2026,
}

export function isYear(value: number): value is Year {
  return (YEARS as readonly number[]).includes(value)
}
