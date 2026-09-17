/**
 * VideoFetch Neural Ranking Engine
 * Implementation of X (Twitter) Algorithm Architecture:
 * 1. Multi-Cluster Candidate Sourcing
 * 2. SimClusters Interest Graph Embeddings
 * 3. Heavy Ranker Matrix (Positive Dwell + Authority + Penalty Weights)
 * 4. De-clustering & Channel Diversity Interleaver
 */

// SimCluster Definitions (Knowledge Domain Clusters)
export const SIM_CLUSTERS = {
  PHYSICS_SPACE: {
    id: 101,
    name: 'Physics & Astrophysics',
    keywords: ['physics', 'quantum', 'space', 'astrophysics', 'relativity', 'universe', 'black hole', 'nasa', 'astronomy', 'gravity', 'telescope'],
    baseWeight: 1.45,
  },
  MATH_CS_AI: {
    id: 102,
    name: 'Mathematics, AI & Computing',
    keywords: ['math', 'calculus', 'algorithm', 'neural', 'artificial intelligence', 'machine learning', 'linear algebra', 'cryptography', 'geometry', 'code'],
    baseWeight: 1.40,
  },
  ENGINEERING_TECH: {
    id: 103,
    name: 'Engineering & Advanced Technology',
    keywords: ['engineering', 'semiconductor', 'aerospace', 'lithography', 'mechanics', 'inventions', 'silicon', 'hardware', 'transistor', 'robotics'],
    baseWeight: 1.35,
  },
  BIO_NEUROSCIENCE: {
    id: 104,
    name: 'Biology & Neuroscience',
    keywords: ['neuroscience', 'biology', 'brain', 'microbiology', 'cells', 'genetics', 'dopamine', 'human body', 'immune', 'microscope'],
    baseWeight: 1.30,
  },
  HIGH_VALUE_DOCS: {
    id: 105,
    name: 'Deep Documentaries & Science History',
    keywords: ['documentary', 'earth', 'history', 'expedition', 'nature', 'ocean', 'deep dive', 'evolution', 'science', 'wildlife'],
    baseWeight: 1.25,
  },
};

// Verified High-Authority Knowledge Channels (In-Network Trust Graph)
export const TRUSTED_AUTHORITY_CHANNELS = new Set([
  'veritasium',
  'kurzgesagt – in a nutshell',
  'kurzgesagt',
  '3blue1brown',
  'smartereveryday',
  'numberphile',
  'computerphile',
  'pbs space time',
  'mit opencourseware',
  'real engineering',
  'real science',
  'astrum',
  'bbc earth',
  'two minute papers',
  'coldfusion',
  'huberman lab',
  'andrew huberman',
  'big think',
  'steve mould',
  'branch education',
  'practical engineering',
  'dr becky',
  'dr. becky',
  'asianometry',
  'national geographic',
  'mark rober',
  'fireship',
  'nilered',
  'the action lab',
  'journey to the microcosmos',
  'physics girl',
  'scishow',
  'anton petrov',
  'cool worlds',
  'welch labs',
  'reducible',
  'the b1m',
  'engineers explained',
  'ted-ed',
  'reallifelore',
  'wendover productions',
  'polymatter',
]);

// Heavy Ranker Weights
const MODEL_WEIGHTS = {
  W_CLUSTER_MATCH: 45.0,
  W_AUTHORITY_BOOST: 65.0,
  W_DURATION_QUALITY: 35.0,
  W_VIEW_ENGAGEMENT: 20.0,
  PENALTY_CLICKBAIT: -60.0,
};

/**
 * Heavy Ranker with X De-clustering Diversity
 */
export function heavyRankCandidates(candidates, options = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const { isShorts = false } = options;

  // 1. Strict Duration & Format Validation
  const validCandidates = candidates.filter((item) => {
    if (!item.id && !item.videoId) return false;
    const dur = Number(item.duration) || 0;
    if (isShorts) {
      // Shorts MUST strictly be 60 seconds or less
      return dur > 0 && dur <= 60;
    } else {
      // Long-form videos MUST strictly be 75 seconds or more
      return !dur || dur >= 75;
    }
  });

  if (validCandidates.length === 0) return [];

  // 2. Feature Extraction & Scoring
  const scored = validCandidates.map((item) => {
    let score = 100.0;
    const title = (item.title || '').toLowerCase();
    const uploader = (item.uploader || '').toLowerCase().trim();
    const duration = Number(item.duration) || 0;
    const views = Number(item.views) || 0;

    // Feature A: SimCluster Relevance
    let matchedClusterWeight = 1.0;
    for (const cluster of Object.values(SIM_CLUSTERS)) {
      if (cluster.keywords.some((kw) => title.includes(kw))) {
        matchedClusterWeight = Math.max(matchedClusterWeight, cluster.baseWeight);
      }
    }
    score += (matchedClusterWeight - 1.0) * MODEL_WEIGHTS.W_CLUSTER_MATCH;

    // Feature B: High-Authority Channel Boost
    const isAuthority = Array.from(TRUSTED_AUTHORITY_CHANNELS).some(
      (ch) => uploader.includes(ch) || ch.includes(uploader),
    );
    if (isAuthority) {
      score += MODEL_WEIGHTS.W_AUTHORITY_BOOST;
    }

    // Feature C: Duration Quality (Prefers substantial content)
    if (!isShorts) {
      if (duration >= 300 && duration <= 3600) {
        score += MODEL_WEIGHTS.W_DURATION_QUALITY;
      } else if (duration > 3600) {
        score += MODEL_WEIGHTS.W_DURATION_QUALITY * 0.75;
      }
    }

    // Feature D: View Engagement (Logarithmic)
    if (views > 500) {
      score += Math.min(Math.log10(views) * 4, MODEL_WEIGHTS.W_VIEW_ENGAGEMENT);
    }

    // Feature E: Clickbait Penalty
    if (/shocking|you won't believe|crying|omg|prank/i.test(title)) {
      score += MODEL_WEIGHTS.PENALTY_CLICKBAIT;
    }

    return {
      ...item,
      _rankScore: score,
      _authorKey: uploader || 'unknown',
    };
  });

  // 3. Sort by Predictive Rank Score
  scored.sort((a, b) => b._rankScore - a._rankScore);

  // 4. X Algorithm De-clustering / Diversity Interleaver
  // Strict Cap: No creator can have more than 2 videos in the feed
  const diversified = [];
  const authorUsage = new Map();

  for (const item of scored) {
    const usage = authorUsage.get(item._authorKey) || 0;
    if (usage < 1) {
      diversified.push(item);
      authorUsage.set(item._authorKey, usage + 1);
    }
  }

  // Second pass: fill up to 2 items per author if needed
  if (diversified.length < 24) {
    for (const item of scored) {
      const usage = authorUsage.get(item._authorKey) || 0;
      if (usage < 2 && !diversified.includes(item)) {
        diversified.push(item);
        authorUsage.set(item._authorKey, usage + 1);
      }
      if (diversified.length >= 24) break;
    }
  }

  return diversified.map(({ _rankScore, _authorKey, ...clean }) => clean);
}
