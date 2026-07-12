/**
 * Folds affiliation strings into one high-level institution per organisation:
 * research institutes, labs, schools, and name variants map to their parent
 * university (e.g. LIACS → Leiden University). Keys are lower-cased and
 * matched after stripping a leading "The ".
 */
const ALIASES: Record<string, string> = {
  // Leiden
  liacs: 'Leiden University',
  'leiden institute of advanced computer science': 'Leiden University',
  'leiden university medical center': 'Leiden University',
  // MIT
  mit: 'Massachusetts Institute of Technology',
  'mit lincoln laboratory': 'Massachusetts Institute of Technology',
  // Name variants
  'adelaide university': 'University of Adelaide',
  'technical university of delft': 'Delft University of Technology',
  'technical university of eindhoven': 'Eindhoven University of Technology',
  'university of utrecht': 'Utrecht University',
  'université de lille': 'University of Lille',
  'cy cergy paris university': 'CY Cergy Paris University',
  'university of sousse': 'University of Sousse',
  harvard: 'Harvard University',
  ucl: 'University College London',
  'alma mater studiorum - università di bologna': 'University of Bologna',
  'jadavpur unversity': 'Jadavpur University',
  'jinan universtiy': 'Jinan University',
  'taiyuan university of science and technology太原科技大学':
    'Taiyuan University of Science and Technology',
  independent: 'Independent researcher',
  // Málaga
  'universidad de málaga': 'University of Málaga',
  'university of malaga': 'University of Málaga',
  'itis software': 'University of Málaga',
  // Complutense
  'universidad complutense': 'Complutense University of Madrid',
  'universidad complutense de madrid': 'Complutense University of Madrid',
  // Sorbonne
  'sorbonne université': 'Sorbonne University',
  lip6: 'Sorbonne University',
  // Ghent
  'ghent university - imec': 'Ghent University',
  'ghent university-imec': 'Ghent University',
  // Vietnam National University
  'vnu-hcm': 'Vietnam National University Ho Chi Minh City',
  'vietnam national university ho chi minh city (vnu-hcm)':
    'Vietnam National University Ho Chi Minh City',
  'vnu university of science': 'Vietnam National University, Hanoi',
  // Inria
  'inria chile': 'Inria',
  'inria lille - nord europe': 'Inria',
  // Toulouse (IRIT is the joint CNRS/Toulouse informatics lab)
  'university toulouse capitole': 'University of Toulouse',
  'university of toulouse capitole': 'University of Toulouse',
  irit: 'University of Toulouse',
  'irit - cnrs umr5505': 'University of Toulouse',
  // Tunis El Manar (FST is its Faculty of Sciences)
  fst: 'University of Tunis El Manar',
  'fst,utm': 'University of Tunis El Manar',
  utm: 'University of Tunis El Manar',
  // Companies
  'slb cambridge research': 'SLB',
  'schlumberger cambridge': 'SLB',
  'cognizant ai lab': 'Cognizant',
  'paradigms of intelligence team': 'Google',
  // CEFET-MG (PPGMMC is its graduate programme)
  'centro federal de educação tecnológica de minas gerais': 'CEFET-MG',
  ppgmmc: 'CEFET-MG',
  // Potsdam (HPI is its digital-engineering faculty)
  'hasso plattner institute': 'University of Potsdam',
  // Radboud (Donders Institute fragments)
  'donders institute for brain': 'Radboud University',
  'cognition and behaviour': 'Radboud University',
  'department of machine learning and neural computing': 'Radboud University',
  // A*STAR, split on the comma in its own name
  'agency for science': 'A*STAR',
  'technology and research': 'A*STAR',
  // CUNY colleges
  'graduate center': 'City University of New York',
  'queens college': 'City University of New York',
  // University institutes and labs
  'centre algoritmi': 'University of Minho',
  'centre of mathematics': 'University of Minho',
  'cisuc/lasi': 'University of Coimbra',
  lasige: 'University of Lisbon',
  'department of informatics; faculty of sciences': 'University of Lisbon',
  'nova ims': 'Universidade Nova de Lisboa',
  'l3s research center': 'Leibniz University Hannover',
  lisic: "Université du Littoral Côte d'Opale",
  'samuel ginn college of engineering': 'Auburn University',
  dpia: 'University of Udine',
  'csdt school': 'Aston University',
  // UC Irvine, split on its own comma
  'university of california': 'University of California, Irvine',
  irvine: 'University of California, Irvine',
  // Guangxi University: one long affiliation split into many fragments
  'distributed and intelligent computing (guangxi university)': 'Guangxi University',
  'guangxi key laboratory of multimedia communications and network technology':
    'Guangxi University',
  'school of computer and electronics information': 'Guangxi University',
  'china; key laboratory of parallel': 'Guangxi University',
  'department of education of guangxi zhuang autonomous region': 'Guangxi University',
  // IFSULDEMINAS, split on the comma in its own name
  'instituto federal de educação': 'Instituto Federal do Sul de Minas Gerais',
  'ciência e tecnologia do sul de minas gerais': 'Instituto Federal do Sul de Minas Gerais',
}

/** Country names, address fragments, and other strings that are not institutions. */
const NOISE = new Set([
  'china',
  'brazil',
  'ltd',
  'birmingham',
  'nanning 530004',
  'guangxi zhuang autonomous region',
])

/**
 * Canonical high-level institution for an affiliation string as published,
 * or null when the string is not an institution at all.
 */
export function canonicalInstitution(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  const key = name.toLowerCase().replace(/^the /, '')
  if (NOISE.has(key)) return null
  return ALIASES[key] ?? name.replace(/^[Tt]he /, '')
}
