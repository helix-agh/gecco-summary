/** Full names of the GECCO paper tracks, keyed by the acronyms used on the site. */
export const TRACK_NAMES: Record<string, string> = {
  'ACO-SI': 'Ant Colony Optimization and Swarm Intelligence',
  BBSR: 'Benchmarking, Benchmarks, Software, and Reproducibility',
  CS: 'Complex Systems',
  ECOM: 'Evolutionary Combinatorial Optimization and Metaheuristics',
  EML: 'Evolutionary Machine Learning',
  EMO: 'Evolutionary Multiobjective Optimization',
  ENUM: 'Evolutionary Numerical Optimization',
  GA: 'Genetic Algorithms',
  GECH: 'General Evolutionary Computation and Hybrids',
  GP: 'Genetic Programming',
  L4EC: 'Learning for Evolutionary Computation',
  NE: 'Neuroevolution',
  RWA: 'Real World Applications',
  SBSE: 'Search-Based Software Engineering',
  SI: 'Swarm Intelligence',
  THEORY: 'Theory',
}

export function trackName(acronym: string): string {
  return TRACK_NAMES[acronym] ?? acronym
}
