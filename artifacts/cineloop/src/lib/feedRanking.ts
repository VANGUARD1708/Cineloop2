export interface RankingSignals {
  watchTime?: number;
  duration?: number;
  liked?: boolean;
  saved?: boolean;
  replayed?: boolean;
  skipped?: boolean;
  createdAt?: string;
  creatorId?: string;
  tags?: string[];
  views?: number;
}

export function rankFeed<T extends { episode: any }>(
  items: T[],
  signals: Map<string, RankingSignals>,
  interestProfile: Map<string, number>
): T[] {
  const creatorSeen = new Map<string, number>();

  return [...items].sort((a, b) => {
    const A = score(a, signals, interestProfile, creatorSeen);
    const B = score(b, signals, interestProfile, creatorSeen);
    return B - A;
  });
}

function score(
  item: any,
  signals: Map<string, RankingSignals>,
  interestProfile: Map<string, number>,
  creatorSeen: Map<string, number>
) {
  const id = item.episode.id;
  const creator = item.episode.creatorId || "unknown";
  const tags: string[] = item.episode.tags || [];

  const s = signals.get(id);

  let score = 0;

  // cold start boost
  const hasSignals =
    s?.watchTime ||
    s?.liked ||
    s?.saved ||
    s?.replayed;

  if (!hasSignals) score += 18;

  // watch time
  if (s?.watchTime)
    score += Math.min(s.watchTime, 30) * 2;

  // completion ratio
  if (s?.watchTime && s?.duration) {
    const ratio = s.watchTime / s.duration;
    if (ratio > 0.95) score += 28;
    else if (ratio > 0.8) score += 18;
    else if (ratio > 0.6) score += 10;
  }

  // engagement
  if (s?.liked) score += 20;
  if (s?.saved) score += 28;
  if (s?.replayed) score += 18;
  if (s?.skipped) score -= 15;

  // freshness
  if (item.episode.createdAt) {
    const ageHours =
      (Date.now() -
        new Date(item.episode.createdAt).getTime()) /
      1000 /
      60 /
      60;

    score += Math.max(0, 12 - ageHours);
  }

  // interest matching
  tags.forEach((tag) => {
    const weight =
      interestProfile.get(tag) || 0;
    score += weight * 6;
  });

  // creator diversity
  const seen =
    creatorSeen.get(creator) || 0;
  score -= seen * 8;
  creatorSeen.set(creator, seen + 1);

  // trending velocity
  if (s?.views) {
    score += Math.log10(s.views + 1) * 6;
  }

  // stable randomness (no jitter)
  score += seededRandom(id) * 3;

  return score;
}

function seededRandom(seed: string) {
  let h = 0;

  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }

  return (h >>> 0) / 4294967295;
}