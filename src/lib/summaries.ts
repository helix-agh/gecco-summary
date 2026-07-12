import type { Year } from './data'

export interface YearSummary {
  /** Host city and country, as shown in the location badge. */
  location: string
  /** Flag emoji of the host country, shown before the location. */
  flag: string
  /** Attendance format, e.g. "Hybrid" or "In person". */
  format: string
  /** One-line framing of the edition's overall character. */
  headline: string
  /** AI-written paragraph reviewing that year's accepted papers and abstracts. */
  overview: string
  /** The single most important change that year, versus the surrounding editions. */
  keyChange: string
}

/**
 * Per-year editorial summaries. The `overview` and `keyChange` text was written
 * from a review of that year's accepted-paper titles and abstracts (the topic
 * clusters in data/topics-*.json and the track distributions in data/papers-*.json).
 */
export const SUMMARIES: Record<Year, YearSummary> = {
  2024: {
    location: 'Melbourne, Australia',
    flag: '🇦🇺',
    format: 'Hybrid',
    headline: 'GECCO reaches the Southern Hemisphere for the first time.',
    overview:
      'GECCO 2024 accepted 178 full papers and stayed close to the classical core of ' +
      'evolutionary computation. The largest bodies of work were multi-objective and ' +
      'constrained optimization and genetic programming / symbolic regression, backed by an ' +
      'unusually strong Theory, noise, and runtime-analysis block. Quality-diversity and ' +
      'coevolution formed a distinct cluster, and Real-World Applications was again the single ' +
      'biggest track. Large language models appeared only at the margins — a handful of papers.',
    keyChange:
      'The conference travelled to Oceania for the first time, and it was the last edition to ' +
      'run a dedicated Search-Based Software Engineering (SBSE) track before it was folded into ' +
      'the broader program.',
  },
  2025: {
    location: 'Málaga, Spain',
    flag: '🇪🇸',
    format: 'Hybrid',
    headline: 'Learning-driven search consolidates across every track.',
    overview:
      'GECCO 2025 was the largest of the three editions with 181 accepted full papers. ' +
      'Neuroevolution, reinforcement learning, and swarm robotics merged into the dominant ' +
      'theme, and quality-diversity methods reached their peak presence. Combinatorial ' +
      'optimization and metaheuristics (ECOM) surged to become the second-largest track, while ' +
      'surrogate models and learned operators spread well beyond their home tracks.',
    keyChange:
      'Machine-learning-assisted evolution went mainstream: the "Learning for Evolutionary ' +
      'Computation" (L4EC) track grew markedly, and learned components — surrogates, learned ' +
      'crossover, policy models — became standard tooling rather than a niche.',
  },
  2026: {
    location: 'San José, Costa Rica',
    flag: '🇨🇷',
    format: 'In person',
    headline: 'Large language models become a first-class evolutionary tool.',
    overview:
      'GECCO 2026 accepted 149 full papers and marks the arrival of LLMs at the centre of the ' +
      'field. A dedicated topic cluster on LLM-driven algorithm and code evolution emerged, and ' +
      'LLM-related papers more than doubled compared with 2024 — LLMs now serve as genetic ' +
      'operators, automatic algorithm generators, and co-evolving policy and environment ' +
      'designers. Real-World Applications remained the largest track, and evolutionary machine ' +
      'learning and multi-objective optimization stayed strong alongside the new wave.',
    keyChange:
      'LLM-driven algorithm and code evolution graduated from a scattering of papers into a ' +
      'coherent, dominant research theme — the defining shift of the 2026 program.',
  },
}
