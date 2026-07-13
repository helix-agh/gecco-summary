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
  2021: {
    location: 'Lille, France',
    flag: '🇫🇷',
    format: 'Online',
    headline: 'A fully virtual GECCO with the classical core intact.',
    overview:
      'GECCO 2021 accepted 134 full papers and, in the middle of the pandemic, ran entirely ' +
      'online from Lille. The program was anchored in the classical strands: multi-objective ' +
      'optimization and landscape analysis formed the largest topic cluster, followed by a ' +
      'strong routing, scheduling, and logistics block. Novelty search and MAP-Elites-style ' +
      'quality-diversity methods were already a visible, coherent theme, and evolved robots ' +
      'and swarms carried the Complex Systems track. Neural architecture search and ' +
      'generative-model evolution hinted at the learning-driven turn the following editions ' +
      'would take.',
    keyChange:
      'The conference went fully virtual — the only edition in this range with no physical ' +
      'venue — while quality-diversity methods consolidated from scattered papers into a ' +
      'distinct research theme.',
  },
  2022: {
    location: 'Boston, USA',
    flag: '🇺🇸',
    format: 'Hybrid',
    headline: 'GECCO returns to a physical venue after two virtual years.',
    overview:
      'GECCO 2022 accepted 158 full papers and brought the community back together in Boston, ' +
      'in hybrid form, after the fully virtual 2020 and 2021 editions. Routing, scheduling, ' +
      'and gray-box combinatorial optimization formed the largest topic cluster, with fitness ' +
      'landscapes, surrogates, and algorithm configuration close behind. Quality-diversity ' +
      'methods fused with reinforcement learning and swarm robotics into a single fast-growing ' +
      'theme, and a first comparison of GitHub Copilot against genetic programming foreshadowed ' +
      'the LLM wave to come.',
    keyChange:
      'The return to an in-person venue — the first since 2019 — and the merging of ' +
      'quality-diversity with reinforcement learning into one research thread mark this ' +
      'edition.',
  },
  2023: {
    location: 'Lisbon, Portugal',
    flag: '🇵🇹',
    format: 'Hybrid',
    headline: 'The biggest program yet, with an unusually theoretical core.',
    overview:
      'GECCO 2023 grew sharply to 180 accepted full papers, the largest edition up to that ' +
      'point. Theory and runtime analysis formed the single biggest topic cluster — an ' +
      'unusually theoretical program — alongside strong quality-diversity, evolutionary ' +
      'machine learning, and multi-objective/CMA-ES blocks. Evolutionary reinforcement ' +
      'learning and robot-swarm morphology evolution stood as distinct themes, and a pair of ' +
      'genetic programming papers applied LLMs to autonomous programming and interactive game ' +
      'design.',
    keyChange:
      'The program expanded by nearly 15% over Boston, with theory and runtime analysis — ' +
      'unusually — its single largest topic cluster.',
  },
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
      'GECCO 2025 was the largest edition in this range with 181 accepted full papers. ' +
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
    headline: 'LLM-driven evolution emerges as a distinct research theme.',
    overview:
      'GECCO 2026 accepted 149 full papers, a smaller program than Málaga but with a clear new ' +
      'arrival: LLM-driven algorithm and code evolution formed its own topic cluster for the ' +
      'first time, and LLM-related papers more than doubled compared with 2024 — used as ' +
      'genetic operators, automatic algorithm generators, and co-evolving policy and ' +
      'environment designers. The classical core still set the tone, though: benchmarking, ' +
      'neuroevolution, and symbolic regression remained the largest clusters, and Real-World ' +
      'Applications was again the biggest track.',
    keyChange:
      'LLM-driven algorithm and code evolution consolidated from a scattering of papers into ' +
      'a coherent topic cluster of its own — still around a tenth of the program, but the ' +
      'clearest new theme of 2026.',
  },
}
