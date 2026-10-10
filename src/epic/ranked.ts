import type { HabaneroProgress, HabaneroTrack } from './habanero.js';

export const RankTier = {
  Unranked: 'unranked',
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
  Platinum: 'platinum',
  Diamond: 'diamond',
  Elite: 'elite',
  Champion: 'champion',
  Unreal: 'unreal',
  UnrealLegend: 'unreal-legend',
} as const;

export type RankTier = (typeof RankTier)[keyof typeof RankTier];

export interface RankTierColors {
  text: string;
  background: string;
  progressBar: string;
  progressBackground: string;
}

export const RANK_TIER_COLORS: Record<RankTier, RankTierColors> = {
  unranked: { text: '#7DC1FF', background: '#006BFC', progressBar: '#005CF3', progressBackground: '#041D40' },
  bronze: { text: '#CB8762', background: '#724400', progressBar: '#E98F0E', progressBackground: '#592416' },
  silver: { text: '#D1D9DF', background: '#4C6498', progressBar: '#C0B5F2', progressBackground: '#1A3255' },
  gold: { text: '#F6E2A8', background: '#B06A00', progressBar: '#EAAF00', progressBackground: '#553609' },
  platinum: { text: '#AEF9AE', background: '#007576', progressBar: '#7FF3D0', progressBackground: '#1B3938' },
  diamond: { text: '#9CCCF8', background: '#384EB9', progressBar: '#6570FF', progressBackground: '#112044' },
  elite: { text: '#FEB1F6', background: '#273141', progressBar: '#C875FD', progressBackground: '#44103B' },
  champion: { text: '#FFAC64', background: '#910000', progressBar: '#FF7F11', progressBackground: '#4D0505' },
  unreal: { text: '#6A62CB', background: '#3C175E', progressBar: '#A85BFF', progressBackground: '#44267B' },
  'unreal-legend': { text: '#6A62CB', background: '#3C175E', progressBar: '#A85BFF', progressBackground: '#44267B' },
};

const TIER_NAMES: Record<RankTier, string> = {
  unranked: 'Unranked',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  elite: 'Elite',
  champion: 'Champion',
  unreal: 'Unreal',
  'unreal-legend': 'Unreal Legend',
};

export const UNREAL_LEGEND_TOP_POSITIONS = 500;

export const RANKED_UNPLAYED_TIMESTAMP = '1970-01-01T00:00:00Z';

interface LadderStep {
  tier: RankTier;
  subdivision: 1 | 2 | 3 | null;
}

function threeSteps(tiers: RankTier[]): LadderStep[] {
  return tiers.flatMap((tier) => [1, 2, 3].map((subdivision) => ({ tier, subdivision: subdivision as 1 | 2 | 3 })));
}

const LADDER_22: LadderStep[] = [
  ...threeSteps(['bronze', 'silver', 'gold', 'platinum', 'diamond', 'elite', 'champion']),
  { tier: 'unreal', subdivision: null },
];

const LADDER_18: LadderStep[] = [
  ...threeSteps(['bronze', 'silver', 'gold', 'platinum', 'diamond']),
  { tier: 'elite', subdivision: null },
  { tier: 'champion', subdivision: null },
  { tier: 'unreal', subdivision: null },
];

const ROMAN = ['I', 'II', 'III'];

export interface RankInfo {
  division: number;
  divisionCount: number;
  name: string;
  seasonalName: string | null;
  tier: RankTier;
  subdivision: 1 | 2 | 3 | null;
  colors: RankTierColors;
}

function rankInfo(division: number, divisionCount: number, step: LadderStep | null): RankInfo {
  const tier = step?.tier ?? 'unranked';
  const subdivision = step?.subdivision ?? null;
  const base = step ? TIER_NAMES[tier] : `Division ${division + 1}`;
  return {
    division,
    divisionCount,
    name: subdivision ? `${base} ${ROMAN[subdivision - 1]}` : base,
    seasonalName: null,
    tier,
    subdivision,
    colors: RANK_TIER_COLORS[tier],
  };
}

export function rankForDivision(division: number, divisionCount = 22): RankInfo {
  const ladder = divisionCount === 22 ? LADDER_22 : divisionCount === 18 ? LADDER_18 : null;
  const index = Math.max(0, Math.floor(division));
  if (!ladder) return rankInfo(index, divisionCount, null);
  return rankInfo(index, divisionCount, ladder[Math.min(index, ladder.length - 1)] ?? null);
}

export function unrankedRank(divisionCount = 22): RankInfo {
  return { ...rankInfo(0, divisionCount, { tier: 'unranked', subdivision: null }), name: 'Unranked' };
}

export function unrealLegendRank(divisionCount = 22): RankInfo {
  return rankInfo(Math.max(0, divisionCount - 1), divisionCount, { tier: 'unreal-legend', subdivision: null });
}

interface SeasonalRank {
  rankingTypes: string[];
  season: number;
  division: number;
  name: string;
}

const SEASONAL_RANKS: SeasonalRank[] = [
  { rankingTypes: ['ranked-br', 'ranked-zb'], season: 35, division: 15, name: 'Admiral' },
  { rankingTypes: ['ranked-br', 'ranked-zb'], season: 35, division: 16, name: 'Grand Moff' },
  { rankingTypes: ['ranked-br', 'ranked-zb'], season: 35, division: 17, name: 'Emperor' },
  { rankingTypes: ['ranked-br-combined'], season: 35, division: 19, name: 'Admiral' },
  { rankingTypes: ['ranked-br-combined'], season: 35, division: 20, name: 'Grand Moff' },
  { rankingTypes: ['ranked-br-combined'], season: 35, division: 21, name: 'Emperor' },
];

export function trackSeason(track: Pick<HabaneroTrack, 'leaderboardTrackingEventId'> | null | undefined): number | null {
  const match = /season_?(\d+)/i.exec(track?.leaderboardTrackingEventId ?? '');
  return match ? Number(match[1]) : null;
}

export function rankForTrack(division: number, track: HabaneroTrack | null | undefined): RankInfo {
  const rank = rankForDivision(division, track?.divisionCount ?? 22);
  const season = trackSeason(track);
  const seasonal = SEASONAL_RANKS.find(
    (entry) => entry.season === season && entry.division === rank.division && entry.rankingTypes.includes(track?.rankingType ?? ''),
  );
  return seasonal ? { ...rank, seasonalName: seasonal.name } : rank;
}

export interface RankedModeInfo {
  rankingType: string;
  name: string;
  zeroBuild: boolean | null;
  combined: boolean;
  legacy: boolean;
  limited: boolean;
  unrealLegend: boolean;
}

function mode(
  rankingType: string,
  name: string,
  zeroBuild: boolean | null,
  flags: { combined?: boolean; legacy?: boolean; limited?: boolean; unrealLegend?: boolean } = {},
): RankedModeInfo {
  return {
    rankingType,
    name,
    zeroBuild,
    combined: flags.combined ?? false,
    legacy: flags.legacy ?? false,
    limited: flags.limited ?? false,
    unrealLegend: flags.unrealLegend ?? false,
  };
}

export const RANKED_MODES: Record<string, RankedModeInfo> = {
  'ranked-br-combined': mode('ranked-br-combined', 'Battle Royale', null, { combined: true, unrealLegend: true }),
  'ranked-blastberry-combined': mode('ranked-blastberry-combined', 'Reload', null, { combined: true, unrealLegend: true }),
  'ranked-squareclub': mode('ranked-squareclub', 'Arenas', null),
  'ranked-br': mode('ranked-br', 'Battle Royale', false, { legacy: true }),
  'ranked-zb': mode('ranked-zb', 'Zero Build', true, { legacy: true }),
  ranked_blastberry_build: mode('ranked_blastberry_build', 'Reload', false, { legacy: true }),
  ranked_blastberry_nobuild: mode('ranked_blastberry_nobuild', 'Reload Zero Build', true, { legacy: true }),
  'ranked-figment-build': mode('ranked-figment-build', 'Fortnite OG', false, { legacy: true }),
  'ranked-figment-nobuild': mode('ranked-figment-nobuild', 'Fortnite OG Zero Build', true, { legacy: true }),
  'ranked-bling': mode('ranked-bling', 'The Getaway', false, { legacy: true, limited: true }),
  'ranked-bling-nobuild': mode('ranked-bling-nobuild', 'The Getaway - Zero Build', true, { legacy: true, limited: true }),
  'ranked-feral': mode('ranked-feral', 'Ballistic', null, { legacy: true }),
  'delmar-competitive': mode('delmar-competitive', 'Rocket Racing', null, { legacy: true }),
  'ranked-pimlico': mode('ranked-pimlico', 'Fall Guys', null, { legacy: true }),
};

export function rankedMode(rankingType: string): RankedModeInfo {
  return RANKED_MODES[rankingType] ?? mode(rankingType, rankingType, null);
}

export interface RankedStanding {
  accountId: string;
  rankingType: string;
  mode: RankedModeInfo;
  trackguid: string;
  track: HabaneroTrack | null;
  active: boolean;
  played: boolean;
  current: RankInfo;
  highest: RankInfo;
  progress: number;
  unrealRank: number | null;
  unrealLegend: boolean;
  rating: number | null;
  highestRating: number | null;
  lastPlayed: string | null;
}

export interface RankedStandingOptions {
  now?: number;
  unrealLegendTop?: number;
}

export function toRankedStanding(
  progress: HabaneroProgress,
  track?: HabaneroTrack | null,
  options: RankedStandingOptions = {},
): RankedStanding {
  const now = options.now ?? Date.now();
  const divisionCount = track?.divisionCount ?? 22;
  const mode = rankedMode(progress.rankingType);
  const played = Boolean(progress.lastUpdated) && !progress.lastUpdated.startsWith('1970-01-01');
  const placement = typeof progress.currentPlayerRanking === 'number' ? progress.currentPlayerRanking : null;
  const ladderRank = played ? rankForTrack(progress.currentDivision, track) : unrankedRank(divisionCount);
  const unrealLegend =
    mode.unrealLegend &&
    ladderRank.tier === 'unreal' &&
    placement !== null &&
    placement > 0 &&
    placement <= (options.unrealLegendTop ?? UNREAL_LEGEND_TOP_POSITIONS);
  const current = unrealLegend ? unrealLegendRank(divisionCount) : ladderRank;
  const highest = played ? rankForTrack(progress.highestDivision, track) : unrankedRank(divisionCount);
  const rating = typeof progress.rankingRating === 'number' && progress.rankingRating >= 0 ? progress.rankingRating : null;
  const atTop = current.tier === 'unreal' || current.tier === 'unreal-legend';
  return {
    accountId: progress.accountId,
    rankingType: progress.rankingType,
    mode,
    trackguid: progress.trackguid,
    track: track ?? null,
    active: track ? Date.parse(track.beginTime) <= now && Date.parse(track.endTime) > now : false,
    played,
    current,
    highest,
    progress: atTop ? 1 : Math.max(0, Math.min(1, progress.promotionProgress)),
    unrealRank: atTop ? placement : null,
    unrealLegend,
    rating,
    highestRating: typeof progress.highestRating === 'number' && progress.highestRating >= 0 ? progress.highestRating : null,
    lastPlayed: played ? progress.lastUpdated : null,
  };
}
