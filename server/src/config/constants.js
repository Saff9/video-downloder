/**
 * Global Configuration Constants
 */

export const FAST_MIRRORS = [
  'https://inv.tux.pizza',
  'https://invidious.nerdvpn.de',
  'https://vid.priv.au',
  'https://yewtu.be',
  'https://invidious.drgns.space',
  'https://yt.artemislena.eu',
];

// Curated High-Value Science, Education, and Useful Knowledge Pillars
export const SCIENCE_EDUCATION_PILLARS = {
  // Default All Science & Useful Content (Multi-Cluster Seed)
  science_all: [
    'Veritasium physics science documentary',
    'Kurzgesagt In a Nutshell science animation',
    '3Blue1Brown mathematics calculus neural',
    'SmarterEveryDay high speed physics science',
    'Real Engineering aerospace mechanics',
    'Real Science microbiology evolution',
    'PBS Space Time quantum physics universe',
    'MIT OpenCourseWare computer science algorithms',
    'Two Minute Papers AI breakthrough',
    'Astrum deep space astronomy discovery 4k',
    'Steve Mould physics demonstration',
    'ColdFusion history technology innovation',
    'Huberman Lab neuroscience brain biology',
    'Big Think intellectual ideas science',
    'Numberphile math puzzles theory',
    'BBC Earth 4k wildlife science documentary',
    'Branch Education microchip semiconductor 3D',
    'Practical Engineering civil infrastructure',
    'Asianometry semiconductor technology lithography',
    'Mark Rober engineering science experiments',
  ],

  // Physics & Space Exploration
  physics_space: [
    'PBS Space Time quantum theory universe',
    'Astrum solar system planets deep space',
    'Veritasium quantum mechanics experiment',
    'SciShow Space james webb telescope',
    'Dr Becky Astrophysics black holes',
    'Anton Petrov astronomy science space news',
    'Real Engineering rocket science space propulsion',
    'Cool Worlds exoplanets alien life astronomy',
  ],

  // Mathematics & Computer Science
  math_tech: [
    '3Blue1Brown calculus linear algebra visualized',
    'Numberphile mathematics unsolved problems',
    'Computerphile algorithms cryptography',
    'Two Minute Papers artificial intelligence research',
    'MIT OpenCourseWare algorithm design 6.006',
    'Fireship computer science architecture explained',
    'Welch Labs neural networks mathematics',
    'Reducible computer science algorithms animated',
  ],

  // Engineering & Advanced Technology
  engineering: [
    'Real Engineering engineering marvels aerodynamics',
    'Practical Engineering civil infrastructure dams',
    'ColdFusion semiconductor chip manufacturing ASML',
    'Branch Education how microchips transistors work 3D',
    'The B1M mega projects skyscraper engineering',
    'Asianometry semiconductor physics lithography',
    'Mark Rober engineering inventions',
    'Steve Mould mechanics scientific phenomena',
  ],

  // Biology, Medicine & Neuroscience
  biology_health: [
    'Huberman Lab neuroscience brain biology focus',
    'Real Science microbiology cell biology immune',
    'Kurzgesagt immune system human body medicine',
    'Journey to the Microcosmos microscopic biology',
    'TED-Ed human brain anatomy biology',
    'Thoughty2 fascinating science history',
  ],

  // Documentaries & Natural History
  documentaries: [
    'BBC Earth 4k ultra hd wildlife nature',
    'National Geographic scientific expedition 4k',
    'DW Documentary scientific investigative report',
    'PBS Origins history of earth solar system',
    'Deep Marine Scenes ocean abyss hydrothermal vents',
    'RealLifeLore geopolitics history geography',
  ],
};

// Curated Science & Knowledge Shorts (Strictly short-form queries)
export const SCIENCE_SHORTS_PILLARS = [
  'shorts Steve Mould physics demonstration',
  'shorts Veritasium science physics',
  'shorts 3Blue1Brown math visual',
  'shorts SmarterEveryDay high speed physics',
  'shorts Mark Rober engineering science',
  'shorts NileRed chemistry reaction experiment',
  'shorts Action Lab physics experiment',
  'shorts Journey to Microcosmos microscope biology',
  'shorts Real Engineering mechanism 3D',
  'shorts Kurzgesagt space science facts',
];

export const EXT_MIME = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  webna: 'audio/webm',
  opus: 'audio/opus',
  default: 'application/octet-stream',
};
