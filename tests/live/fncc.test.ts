import { describe, expect, it } from 'vitest';
import { FnccAPI } from '../../src/fncc/index.js';

type Schema = string | Schema[] | { [key: string]: Schema };

const fncc = new FnccAPI({ timeout: 120_000, retry: { attempts: 3, minDelay: 2_000, maxDelay: 30_000 } });

function kindOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function check(value: unknown, schema: Schema, path: string, problems: string[]): void {
  if (typeof schema === 'string') {
    const allowed = schema.split('|');
    if (allowed.includes('any')) return;
    const kind = kindOf(value);
    const recordOf = allowed.find((entry) => entry.startsWith('record:'));
    if (recordOf && kind === 'object') {
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        check(entry, recordOf.slice('record:'.length), `${path}.${key}`, problems);
      }
      return;
    }
    if (!allowed.includes(kind)) problems.push(`${path}: expected ${schema}, got ${kind}`);
    return;
  }
  if (Array.isArray(schema)) {
    if (!Array.isArray(value)) {
      problems.push(`${path}: expected array, got ${kindOf(value)}`);
      return;
    }
    value.forEach((entry, index) => check(entry, schema[0]!, `${path}[${index}]`, problems));
    return;
  }
  if (kindOf(value) !== 'object') {
    problems.push(`${path}: expected object, got ${kindOf(value)}`);
    return;
  }
  const record = value as Record<string, unknown>;
  const known = new Set<string>();
  for (const [rawKey, child] of Object.entries(schema)) {
    if (rawKey.startsWith('nullable:')) continue;
    const optional = rawKey.endsWith('?');
    const key = optional ? rawKey.slice(0, -1) : rawKey;
    known.add(key);
    if (!(key in record)) {
      if (!optional) problems.push(`${path}.${key}: missing`);
      continue;
    }
    const nullable = schema[`nullable:${key}`] !== undefined;
    if (nullable && record[key] === null) continue;
    check(record[key], child, `${path}.${key}`, problems);
  }
  for (const key of Object.keys(record)) {
    if (!known.has(key)) problems.push(`${path}.${key}: not in the package types`);
  }
}

function nullable(schema: Record<string, Schema>, ...keys: string[]): Record<string, Schema> {
  const out: Record<string, Schema> = { ...schema };
  for (const key of keys) out[`nullable:${key}`] = 'null';
  return out;
}

function expectShape(value: unknown, schema: Schema, label: string): void {
  const problems: string[] = [];
  check(value, schema, label, problems);
  expect(problems.slice(0, 40)).toEqual([]);
}

const gradient = { radius: 'number', falloff: 'number', brightness: 'number', roughness: 'number', glow: 'number' };
const rarity = {
  value: 'string',
  displayValue: 'string',
  backendValue: 'string',
  colors: ['string'],
  hexColors: ['string'],
  gradient,
  image: 'string',
  generated: 'boolean',
  card: 'string|null',
  cardAnimated: 'boolean',
};
const series = {
  value: 'string',
  backendValue: 'string',
  colors: ['string'],
  hexColors: ['string'],
  image: 'string|null',
  generated: 'boolean',
  card: 'string|null',
  cardAnimated: 'boolean',
};
const typeInfo = { value: 'string', displayValue: 'string', backendValue: 'string', image: 'string' };
const set = { value: 'string', text: 'string', backendValue: 'string' };
const introduction = { chapter: 'string', season: 'string', text: 'string', backendValue: 'number' };
const images = {
  'smallIcon?': 'string|null',
  'icon?': 'string',
  'wide?': 'string|null',
  'largeIcon?': 'string',
  'render?': 'string',
  'albumArt?': 'string',
  'placeholder?': 'boolean',
};
const media = { video: 'record:string|null', audio: 'string|null', audioDuration: 'string|null', source: 'string' };
const variant = {
  channel: 'string',
  name: 'string|null',
  type: 'string',
  options: [{ tag: 'string', name: 'string', image: 'string|null' }],
};
const cosmetic = nullable(
  {
    id: 'string',
    category: 'string',
    name: 'string',
    description: 'string',
    type: typeInfo,
    rarity,
    series,
    set,
    introduction,
    images,
    variants: [variant],
    gameplayTags: ['string'],
    searchTags: ['string'],
    metaTags: ['string'],
    builtInEmoteIds: ['string'],
    gender: 'string|null',
    cosmeticId: 'string|null',
    vehicleId: 'string|null',
    dynamicPakId: 'string|null',
    showcaseVideo: 'string|null',
    itemPreviewHeroPath: 'string|null',
    path: 'string',
  },
  'type',
  'rarity',
  'series',
  'set',
  'introduction',
);
const cosmeticSingle = nullable({ ...cosmetic, 'media?': media }, 'type', 'rarity', 'series', 'set', 'introduction', 'media');
const track = {
  id: 'string',
  devName: 'string',
  title: 'string',
  artist: 'string',
  album: 'string|null',
  releaseYear: 'number',
  bpm: 'number',
  duration: 'number',
  difficulty: { vocals: 'number', guitar: 'number', bass: 'number', plasticBass: 'number', drums: 'number', plasticDrums: 'number' },
  genres: ['string'],
  albumArt: 'string',
  'images?': images,
  'media?': media,
};
const bean = {
  id: 'string',
  cosmeticId: 'string',
  name: 'string',
  description: 'string',
  gender: 'string|null',
  images,
  gameplayTags: ['string'],
  path: 'string',
};
const assetEntry = { path: 'string', extension: 'string', size: 'number', archiveName: 'string' };
const page = (item: Schema) => ({ total: 'number', offset: 'number', limit: 'number', items: [item] });
const fixedPath = {
  input: 'string',
  found: 'boolean',
  file: 'string|null',
  package: 'string|null',
  objectPath: 'string|null',
  objectName: 'string|null',
  class: 'string|null',
  archive: 'string|null',
  size: 'number|null',
  exports: [{ name: 'string', class: 'string' }],
  error: 'string|null',
};
const fileRef = {
  name: 'string',
  size: 'number',
  sha256: 'string',
  modified: 'string',
  version: 'string|null',
  productVersion: 'string|null',
  url: 'string|null',
};
const maintenanceComponent = {
  knownGood: 'string|null',
  current: 'string|null',
  candidate: 'string|null',
  failed: ['string'],
  lastCheckAt: 'string|null',
  lastAttemptAt: 'string|null',
  lastPromotedAt: 'string|null',
  lastRolledBackAt: 'string|null',
  lastResult: 'string|null',
  lastError: 'string|null',
  attempts: 'number',
  promotions: 'number',
  rollbacks: 'number',
};
const maintenanceSummary = {
  knownGood: 'string|null',
  lastResult: 'string|null',
  lastCheckAt: 'string|null',
  quarantined: 'number',
  promotions: 'number',
  rollbacks: 'number',
  lastError: 'string|null',
};
const spawn = {
  variantWeight: 'number|null',
  weightTable: 'string|null',
  weightRow: 'string|null',
  eventTable: 'string|null',
  eventRow: 'string|null',
  eventWeight: 'number|null',
  eventEnabled: 'boolean|null',
  randomActivationChance: 'number|null',
  maxCount: 'number|null',
  maxSpawnedCount: 'number|null',
  minRespawnTime: 'number|null',
  maxRespawnTime: 'number|null',
  onlyInSafeZone: 'boolean|null',
  calendarGated: 'boolean',
};
const acquisition = {
  spawnable: 'boolean',
  granted: 'boolean',
  methods: ['string'],
  grants: [{ reward: 'string', plugin: 'string', quest: 'string|null', requires: 'string|null' }],
};
const level = { level: 'number', value: 'number' };
const perk = { id: 'string', name: 'string|null', description: 'string|null', scaling: [{ stat: 'string', levels: [level] }] };
const rarityColors = {
  value: 'string',
  displayValue: 'string',
  backendValue: 'string',
  colors: ['string'],
  hexColors: ['string'],
  gradient,
};
const spriteVariant = nullable(
  {
    id: 'string',
    mappingId: 'string',
    name: 'string',
    description: 'string',
    variant: 'string',
    rarity: rarityColors,
    summonCost: 'number',
    isStarter: 'boolean',
    library: 'string',
    season: 'string',
    released: 'string',
    currentSeason: 'boolean',
    images,
    contextTags: ['string'],
    perks: [perk],
    extractionCurve: 'string|null',
    extractionPoints: [level],
    enabled: 'boolean',
    registered: 'boolean',
    spawn: { ...spawn, shippedVariantWeight: 'number' },
    acquisition: { ...acquisition, override: 'boolean' },
    path: 'string',
  },
  'rarity',
  'spawn',
);
const sprite = nullable(
  {
    id: 'string',
    mappingId: 'string',
    library: 'string',
    season: 'string',
    name: 'string',
    description: 'string',
    rarity,
    summonCost: 'number',
    isStarter: 'boolean',
    released: 'string',
    currentSeason: 'boolean',
    dexNumber: 'number|null',
    species: 'string',
    acquisitionHint: 'string|null',
    images,
    gameplayTags: ['string'],
    contextTags: ['string'],
    perks: [perk],
    variants: [spriteVariant],
    enabled: 'boolean',
    registered: 'boolean',
    spawn,
    acquisition,
    path: 'string',
  },
  'rarity',
  'spawn',
);
const shopImages = { source: 'string', store: ['string'] };
const background = { type: 'string', texture: 'string' };
const stackRank = { context: 'string', productTag: 'string', rank: 'number', startDate: 'string' };
const shopOffer = nullable(
  {
    offerId: 'string',
    devName: 'string',
    offerType: 'string',
    sortPriority: 'number',
    layoutId: 'string',
    layoutRank: 'number',
    sectionId: 'string',
    offerGroupId: 'string|null',
    tileSize: 'string',
    offerTag: 'string|null',
    violatorTag: 'string|null',
    violatorIntensity: 'string|null',
    bundleId: 'string|null',
    bundleItems: [
      { templateId: 'string', quantity: 'number', regularPrice: 'number', discountedPrice: 'number', alreadyOwnedPriceReduction: 'number' },
    ],
    relatedOffers: 'string|null',
    mainType: 'string|null',
    inDate: 'string',
    outDate: 'string',
    giftable: 'boolean',
    refundable: 'boolean',
    dailyLimit: 'number',
    weeklyLimit: 'number',
    monthlyLimit: 'number',
    price: {
      currency: 'string',
      regularPrice: 'number|null',
      finalPrice: 'number',
      discount: 'number|null',
      saleType: 'string|null',
      saleExpiration: 'string|null',
      dynamic: 'boolean',
      'floorPrice?': 'number',
    },
    colors: { color1: 'string', color2: 'string', color3: 'string|null', textBackground: 'string' },
    displayAsset: 'string',
    displayAssetPath: 'string|null',
    tileBackgroundMaterial: 'string|null',
    primaryTemplateId: 'string|null',
    items: [
      nullable(
        {
          templateId: 'string',
          type: 'string',
          id: 'string',
          quantity: 'number',
          category: 'string|null',
          name: 'string|null',
          description: 'string|null',
          rarity,
          series,
          cosmeticType: typeInfo,
          images,
        },
        'rarity',
        'series',
        'cosmeticType',
        'images',
      ),
    ],
    storefront: 'string',
    section: { id: 'string', name: 'string' },
    images: shopImages,
    layout: {
      id: 'string',
      name: 'string',
      index: 'number',
      rank: 'number',
      category: 'string|null',
      subtitle: 'string|null',
      showIneligibleOffers: 'string',
      useWidePreview: 'boolean|null',
      displayType: 'string|null',
      background,
      offerGroupId: 'string',
    },
    bundle: { name: 'string', description: 'string|null', asset: 'string' },
    media,
  },
  'images',
  'bundle',
  'media',
);
const externalAuth = {
  accountId: 'string',
  type: 'string',
  'externalAuthId?': 'string',
  'externalAuthIdType?': 'string',
  'externalAuthSecondaryId?': 'string',
  'externalDisplayName?': 'string',
  'avatar?': 'string',
  authIds: [{ id: 'string', type: 'string' }],
};
const lookupMatch = {
  accountId: 'string',
  displayName: 'string',
  externalAuths: 'record:any',
  'matchType?': 'string',
  'matches?': [{ value: 'string', platform: 'string' }],
  'epicMutuals?': 'number',
  'sortPosition?': 'number',
  'links?': 'any',
};
const lookupResponse = {
  status: 'number',
  query: { 'accountId?': 'string', 'name?': 'string', 'platform?': 'string', resolved: 'string' },
  exactCount: 'number',
  moreCount: 'number',
  count: 'number',
  exact: [lookupMatch],
  more: [lookupMatch],
};
const mnemonic = {
  mnemonic: 'string',
  linkType: 'string',
  creator: 'string',
  title: 'string|null',
  description: 'string|null',
  image: 'string|null',
  images: { full: 'string|null', medium: 'string|null', small: 'string|null', tiny: 'string|null' },
  parentExperience: 'string|null',
  matchmakingId: 'string|null',
  matchmaking: { v1: 'object|null', v2: 'object|null', v3: 'object|null', plugins: 'array|null' },
  metadata: 'object',
};
const mnemonicLink = {
  namespace: 'string',
  accountId: 'string',
  creatorName: 'string',
  mnemonic: 'string',
  linkType: 'string',
  metadata: 'object',
  version: 'number',
  active: 'boolean',
  disabled: 'boolean',
  created: 'string',
  published: 'string',
  updated: 'string',
  descriptionTags: ['string'],
  moderationStatus: 'string',
  lastActivatedDate: 'string',
  discoveryIntent: 'string',
  linkState: 'string',
};
const newsMessage = {
  title: 'string',
  body: 'string',
  'image?': 'string',
  'hidden?': 'boolean',
  'messagetype?': 'string',
  'spotlight?': 'boolean',
  'layout?': 'string',
};
const newsFeed = {
  id: 'string',
  contentKey: 'string',
  title: 'string|null',
  style: 'string|null',
  alwaysShow: 'boolean',
  lastModified: 'string',
  messageCount: 'number',
  messages: [newsMessage],
  platformMessages: [
    {
      hidden: 'boolean',
      platform: 'string',
      message: {
        entryType: 'string',
        image: 'string',
        tileImage: 'string',
        hidden: 'boolean',
        videoMute: 'boolean',
        title: 'string',
        body: 'string',
        videoLoop: 'boolean',
        videoStreamingEnabled: 'boolean',
        id: 'string',
        videoAutoplay: 'boolean',
        videoFullscreen: 'boolean',
        spotlight: 'boolean',
        'sortingPriority?': 'number',
      },
    },
  ],
};
const playlistLootPool = {
  id: 'string',
  name: 'string',
  experience: 'string',
  experienceId: 'string',
  map: 'string|null',
  mapCode: 'string|null',
  itemCount: 'number',
  containerCount: 'number',
};
const playlist = nullable(
  {
    id: 'string',
    playlistId: 'number|null',
    name: 'string',
    subName: 'string|null',
    description: 'string|null',
    gameType: 'string|null',
    ratingType: 'string|null',
    minPlayers: 'number|null',
    maxPlayers: 'number',
    maxTeams: 'number',
    maxTeamSize: 'number',
    maxSquads: 'number|null',
    maxSquadSize: 'number',
    maxSocialPartySize: 'number|null',
    maxHumanAndBotParticipants: 'number|null',
    isDefault: 'boolean',
    isTournament: 'boolean',
    isRanked: 'boolean',
    isLimitedTimeMode: 'boolean',
    isLargeTeamGame: 'boolean',
    usePlayerRating: 'boolean',
    allowJoinInProgress: 'boolean',
    winCondition: 'string|null',
    respawnType: 'string|null',
    richPresence: 'string|null',
    map: 'string|null',
    gameplayTags: ['string'],
    modifiers: ['string'],
    hiddenHudElements: ['string'],
    requiredPlugins: ['string'],
    images: { missionIcon: 'string|null', 'cover?': 'string' },
    added: 'string|null',
    path: 'string',
    properties: 'object',
    lootPool: playlistLootPool,
    parentExperience: 'string|null',
    matchmaking: nullable(
      {
        service: 'string|null',
        routedByHotfix: 'boolean',
        supports: { v1: 'boolean', v2: 'boolean', v3: 'boolean' },
        v1: 'object|null',
        v2: 'object|null',
        v3: 'object|null',
        v3Version: 'number|null',
        v3Options: ['string'],
        plugins: ['string'],
        ratingType: 'string|null',
        usesPlayerRating: 'boolean',
        strategy: 'string|null',
        minBracketSize: 'number|null',
        maxBracketSize: 'number|null',
        maxBucketCapacity: 'number|null',
        maxPendingMatches: 'number|null',
        multidivisionQueues: 'boolean',
        limitedPool: 'boolean',
        allowSinglePartyMatches: 'boolean',
        enableRatingUpdate: 'boolean',
        fillRateTable: [
          { MinMmr: 'number', MaxMmr: 'number', MinFillPct: 'number', MaxFillPct: 'number', MaxPriority: 'number' },
        ],
        playerRatingBrackets: [{ MinMmr: 'number', MaxMmr: 'number' }],
        priorityRatingExpansion: [{ Priority: 'number', RatingDelta: 'number' }],
      },
      'v3Options',
      'plugins',
      'fillRateTable',
      'playerRatingBrackets',
      'priorityRatingExpansion',
    ),
    'hidden?': 'boolean',
    'specialBorder?': 'any',
  },
  'lootPool',
);
const bands = { close: 'number', mid: 'number', long: 'number', max: 'number' };
const weaponStats = {
  table: 'string',
  row: 'string',
  damagePerSecond: 'number|null',
  damage: bands,
  environmentDamage: bands,
  impactDamage: bands,
  range: bands,
  headshotMultiplier: 'number',
  firingRate: 'number|null',
  burstFiringRate: 'number|null',
  clipSize: 'number',
  reloadTime: 'number',
  reloadType: 'string',
  bulletsPerCartridge: 'number|null',
  cartridgePerFire: 'number',
  ammoCostPerFire: 'number',
  maxSpareAmmo: 'number|null',
  initialClips: 'number',
  spread: 'number|null',
  spreadDownsights: 'number|null',
  recoilVertical: 'number|null',
  recoilHorizontal: 'number|null',
  aimTransitionIn: 'number|null',
  aimTransitionOut: 'number|null',
  projectileVelocity: 'number|null',
  minChargeTime: 'number',
  maxChargeTime: 'number',
  baseLevel: 'number',
  'raw?': 'object',
};
const weapon = nullable(
  {
    id: 'string',
    name: 'string',
    description: 'string|null',
    shortDescription: 'string|null',
    type: 'string',
    category: 'string|null',
    subCategory: 'string|null',
    rarity: 'string|null',
    tier: 'number|null',
    ammoType: 'string|null',
    triggerType: 'string|null',
    isRanged: 'boolean',
    isMelee: 'boolean',
    analyticTags: ['string'],
    searchTags: ['string'],
    traits: ['string'],
    tags: ['string'],
    mesh: 'string|null',
    stats: weaponStats,
    images: { icon: 'string|null', largeIcon: 'string|null', miniMapIcon: 'string|null' },
    added: 'string|null',
    path: 'string',
    properties: 'object',
  },
  'stats',
);
const lootRange = { min: 'number', max: 'number' };
const lootDrop = nullable(
  {
    id: 'string',
    name: 'string|null',
    rarity: 'string|null',
    type: 'string',
    chance: 'number',
    count: lootRange,
    images: { icon: 'string' },
  },
  'images',
);
const lootContainer = { id: 'string', name: 'string', drops: lootRange, resolved: 'number', items: [lootDrop] };
const lootSummary = {
  id: 'string',
  name: 'string',
  experience: 'string',
  experienceId: 'string',
  map: 'string|null',
  mapCode: 'string|null',
  zeroBuild: 'boolean',
  ranked: 'boolean',
  competitive: 'boolean',
  teamSize: 'number|null',
  itemCount: 'number',
  containerCount: 'number',
  hotfixCount: 'number',
  playlistCount: 'number',
};
const lootPoolDetail = {
  ...lootSummary,
  tables: { tier: 'string', package: 'string', merged: ['string'] },
  borrowedFrom: 'record:number',
  unresolved: ['string'],
  playlists: [{ id: 'string', name: 'string', gameType: 'string', tags: ['string'] }],
  hotfixes: ['object'],
  containers: [lootContainer],
};
const lootHit = {
  ...lootDrop,
  pool: 'string',
  poolName: 'string',
  experience: 'string',
  map: 'string|null',
  container: 'string',
  containerName: 'string',
};
const season = {
  season: 'number',
  chapter: 'string',
  seasonInChapter: 'string',
  displayName: 'string',
  gameName: 'string|null',
  storefront: 'string|null',
  current: 'boolean',
};
const battlePass = {
  id: 'string',
  season: 'number',
  name: 'string',
  displayName: 'string',
  description: 'string',
  storefront: 'string',
  passId: 'string',
  offers: {
    seasonPassOfferId: 'string',
    seasonPassLevelOfferId: 'string',
    'seasonPassBundleOfferId?': 'string',
    'seasonPassLevelBundleOfferId?': 'string',
  },
  rewardCount: 'number',
  categories: [
    {
      title: 'string',
      subtitle: 'string',
      rewardCount: 'number',
      rewards: [
        nullable(
          {
            id: 'string',
            type: 'string',
            name: 'string|null',
            rarity,
            images,
            tier: 'string',
            cost: 'number',
            currency: 'string',
            path: 'string',
          },
          'rarity',
          'images',
        ),
      ],
    },
  ],
};
const bundle = nullable(
  {
    id: 'string',
    name: 'string|null',
    bundleId: 'string|null',
    displayAsset: 'string',
    items: [
      nullable(
        {
          templateId: 'string',
          type: 'string',
          id: 'string',
          name: 'string|null',
          rarity,
          quantity: 'number',
          regularPrice: 'number|null',
          discountedPrice: 'number|null',
          images,
        },
        'rarity',
        'images',
      ),
    ],
    price: { currency: 'string', regularPrice: 'number|null', finalPrice: 'number' },
    images: shopImages,
    firstSeen: 'string',
    lastSeen: 'string',
    occurrences: 'number',
    inShop: 'boolean',
    offerIds: ['string'],
  },
  'images',
);
const availability = { forcedOffIn: ['string'], forcedOnIn: ['string'] };
const modeImages = { lobby: 'string|null', matchmaking: 'string' };
const mode = {
  id: 'string',
  name: 'string',
  description: 'string',
  mnemonic: 'string',
  image: 'string',
  enabled: 'boolean',
  updated: 'string',
  lootPoolCount: 'number',
  playlistCount: 'number',
  inRotation: 'record:array',
  maps: [
    nullable(
      {
        code: 'string',
        name: 'string|null',
        localisedNames: 'record:string|null',
        inRotation: 'boolean',
        modes: 'array|null',
        rotationDuration: 'number|null',
        islandCodes: ['string'],
        images: modeImages,
        lootPools: [{ id: 'string', name: 'string', zeroBuild: 'boolean', ranked: 'boolean' }],
        playlistCount: 'number',
        availability,
      },
      'images',
    ),
  ],
  availability,
  rotation: [
    {
      name: 'string|null',
      localisedNames: 'record:string',
      duration: 'number',
      modes: 'array|null',
      islandCodes: ['string'],
      mapCodes: ['string'],
      images: modeImages,
      substitutions: [{ base: 'string', active: 'string' }],
    },
  ],
  'events?': ['object'],
};

describe('live fn-api.cc status & game', () => {
  it('status', async () => {
    expectShape(
      await fncc.status.overview(),
      {
        ready: 'boolean',
        dataset: {
          version: 'string',
          buildId: 'string',
          publishedAt: 'string',
          complete: 'boolean',
          categories: [{ category: 'string', count: 'number', sourceCount: 'number' }],
        },
        game: {
          status: 'string',
          installedVersion: 'string',
          availableVersion: 'string',
          upToDate: 'boolean',
          progress: 'number|null',
          lastCheckAt: 'string|null',
          lastError: 'string|null',
          checkIntervalMs: 'number',
          cleanBuild: 'string',
        },
        parser: {
          state: 'string',
          mappingsVersion: 'string',
          aesVersion: 'string',
          fileCount: 'number',
          mountedArchives: 'number',
          unloadedArchives: 'number',
          missingKeyGuids: ['string'],
          loadedAt: 'string|null',
          lastError: 'string|null',
        },
        maintenance: { status: 'string', cue4parse: maintenanceSummary, legendary: maintenanceSummary },
      },
      'status',
    );
  });

  it('status download / maintenance / parser', async () => {
    expectShape(
      await fncc.status.download(),
      nullable(
        {
          status: 'string',
          installedVersion: 'string',
          availableVersion: 'string',
          lastCheckAt: 'string|null',
          lastUpdateStartedAt: 'string|null',
          lastUpdateFinishedAt: 'string|null',
          lastError: 'string|null',
          consecutiveFailures: 'number',
          totalUpdates: 'number',
          remote: { buildVersion: 'string', downloadSize: 'number', diskSize: 'number', fileCount: 'number' },
          updatedAt: 'string',
          progress: 'number|null',
        },
        'remote',
      ),
      'download',
    );
    expectShape(
      await fncc.status.maintenance(),
      {
        status: 'string',
        startedAt: 'string|null',
        cue4parse: maintenanceComponent,
        legendary: maintenanceComponent,
        updatedAt: 'string',
      },
      'maintenance',
    );
    expectShape(
      await fncc.status.parser(),
      {
        state: 'string',
        gameVersion: 'string',
        mappingsVersion: 'string',
        mountedArchives: 'number',
        unloadedArchives: 'number',
        fileCount: 'number',
        virtualPaths: 'number',
        localizedEntries: 'number',
        culture: 'string',
        availableCultures: ['string'],
        missingKeyGuids: ['string'],
        loadedAt: 'string|null',
        lastError: 'string|null',
      },
      'parser',
    );
  });

  it('version / aes / mappings', async () => {
    expectShape(
      await fncc.version(),
      {
        gameVersion: 'string',
        cleanBuild: 'string',
        changelist: 'number',
        branch: 'string',
        datasetBuild: 'string',
        publishedAt: 'string',
        complete: 'boolean',
        categories: 'record:number',
      },
      'version',
    );
    expectShape(
      await fncc.aes(),
      {
        version: 'string',
        mainKey: 'string',
        dynamicKeys: [{ name: 'string', guid: 'string', key: 'string' }],
        fetchedAt: 'string',
      },
      'aes',
    );
    expectShape(await fncc.mappings(), { version: 'string', fileName: 'string', fetchedAt: 'string' }, 'mappings');
  });
});

describe('live fn-api.cc cosmetics', () => {
  it('categories, types, rarities', async () => {
    expectShape(await fncc.cosmetics.categories(), 'record:number', 'categories');
    expectShape(
      await fncc.cosmetics.types(),
      [{ ...typeInfo, category: 'string', count: 'number' }],
      'types',
    );
    const { generated: _generated, ...tierBase } = rarity;
    expectShape(await fncc.rarities.list(), [{ ...tierBase, cosmetics: 'number', weapons: 'number' }], 'rarities');
  });

  it('single cosmetic, category search and search across every category', async () => {
    expectShape(await fncc.cosmetics.get('br', 'CID_017_Athena_Commando_M'), cosmeticSingle, 'cosmetic');
    const search = await fncc.cosmetics.search('br', { name: 'Renegade', limit: 5 });
    expectShape(search, { status: 'number', total: 'number', data: [cosmetic] }, 'search');
    const all = await fncc.cosmetics.searchAll({ search: 'hiroshi', limit: 5 });
    expect(all.data.length).toBeGreaterThan(0);
    expectShape(all, { status: 'number', total: 'number', count: 'number', data: [cosmetic] }, 'searchAll');
  });

  it('category listings by item shape', async () => {
    expectShape(await fncc.cosmetics.category('cars'), [cosmetic], 'cars');
    expectShape(await fncc.cosmetics.category('tracks'), [track], 'tracks');
    expectShape(await fncc.cosmetics.category('beans'), [bean], 'beans');
  });

  it('banners and banner colours', async () => {
    expectShape(
      await fncc.banners.list(),
      [
        nullable(
          {
            id: 'string',
            devName: 'string',
            name: 'string',
            description: 'string',
            category: 'string',
            categoryName: 'string',
            fullUsageRights: 'boolean',
            rarity,
            series,
            set,
            introduction,
            gameplayTags: ['string'],
            images,
            path: 'string',
          },
          'rarity',
          'series',
          'set',
          'introduction',
        ),
      ],
      'banners',
    );
    const color = { r: 'number', g: 'number', b: 'number', a: 'number', hex: 'string' };
    expectShape(
      await fncc.banners.colors(),
      [
        {
          id: 'string',
          color: 'string',
          category: 'string',
          categoryName: 'string',
          subCategoryGroup: 'number',
          primaryColor: color,
          secondaryColor: color,
        },
      ],
      'colors',
    );
  });
});

describe('live fn-api.cc assets & search', () => {
  const cid = 'FortniteGame/Plugins/GameFeatures/BRCosmetics/Content/Athena/Items/Cosmetics/Characters/CID_017_Athena_Commando_M';

  it('list, search, paths', async () => {
    expectShape(await fncc.assets.list({ prefix: 'FortniteGame/Content/Athena', limit: 5 }), page(assetEntry), 'list');
    expectShape(await fncc.assets.search('peely', { limit: 5 }), page(assetEntry), 'search');
    expectShape(await fncc.assets.paths({ q: 'CID_206', limit: 5 }), page('string'), 'paths');
    expectShape(await fncc.search.paths('peely', { limit: 5 }), page(assetEntry), 'search.paths');
  });

  it('fix-path single and batch', async () => {
    const one = await fncc.assets.fixPath(
      'FortniteGame/Content/Athena/Items/Cosmetics/Characters/CID_206_Athena_Commando_M_Bling.uasset',
    );
    expect(one.found).toBe(true);
    expectShape(one, fixedPath, 'fixPath');
    const many = await fncc.assets.fixPaths([one.input, 'nope/does/not/exist']);
    expect(many.map((entry) => entry.found)).toEqual([true, false]);
    expectShape(many, [fixedPath], 'fixPaths');
  });

  it('exports, json, package, archives', async () => {
    const exports = await fncc.assets.exports(cid);
    expect(exports.length).toBeGreaterThan(0);
    expectShape(exports, ['string'], 'exports');
    expectShape(await fncc.assets.json(cid), ['object'], 'json');
    expectShape(await fncc.assets.package(cid), 'record:string', 'package');
    expectShape(
      await fncc.assets.archives(),
      [
        {
          name: 'string',
          path: 'string',
          encrypted: 'boolean',
          encryptionKeyGuid: 'string',
          fileCount: 'number',
          size: 'number',
          mounted: 'boolean',
        },
      ],
      'archives',
    );
  });

  it('content search', async () => {
    expectShape(
      await fncc.search.content('Peely', {
        prefix: 'FortniteGame/Plugins/GameFeatures/BRCosmetics/Content/Athena/Items/Cosmetics/Characters',
        limit: 3,
        maxFiles: 500,
      }),
      {
        term: 'string',
        candidates: 'number',
        scanned: 'number',
        skipped: 'number',
        hits: 'number',
        truncated: 'boolean',
        truncationReason: 'string|null',
        elapsedMs: 'number',
        items: [{ ...assetEntry, matchCount: 'number', matches: [{ text: 'string', offset: 'number', encoding: 'string' }] }],
      },
      'content',
    );
  });
});

describe('live fn-api.cc game data', () => {
  it('sprites', async () => {
    const list = await fncc.sprites.list();
    expectShape(
      list,
      { status: 'number', hotfixAppliedAt: 'string|null', hotfixRules: 'number', count: 'number', data: [sprite] },
      'sprites',
    );
    expectShape(await fncc.sprites.get('KlomboSprite'), sprite, 'sprite');
  });

  it('weapons', async () => {
    const list = await fncc.weapons.list({ limit: 500 });
    expectShape(list, { status: 'number', total: 'number', count: 'number', data: [weapon] }, 'weapons');
    expectShape(await fncc.weapons.get('WID_Assault_Auto_Athena_SR_Ore_T03', { includeRaw: true }), weapon, 'weapon');
    expectShape(
      await fncc.weapons.categories(),
      {
        categories: 'record:number',
        rarities: 'record:number',
        ammoTypes: 'record:number',
        triggerTypes: 'record:number',
        types: 'record:number',
      },
      'weaponCategories',
    );
  });

  it('fish', async () => {
    const fish = {
      id: 'string',
      'itemId?': 'string',
      name: 'string',
      description: 'string|null',
      details: 'string|null',
      enabled: 'boolean',
      needsProFishingRod: 'boolean',
      sizeMin: 'number|null',
      sizeMax: 'number|null',
      heal: 'number|null',
      rarity: 'string|null',
      maxStackSize: 'number|null',
      tags: ['string'],
      image: 'string|null',
      smallImage: 'string|null',
      timeOfDay: ['string'],
      location: ['string'],
      source: 'string',
      path: 'string|null',
    };
    expectShape(await fncc.fish.list(), [fish], 'fish');
    expectShape(await fncc.fish.get('FlopperFire'), fish, 'fishOne');
  });

  it('playlists', async () => {
    expectShape(await fncc.playlists.list(), [playlist], 'playlists');
    expectShape(await fncc.playlists.get('Playlist_DefaultSolo'), playlist, 'playlist');
  });

  it('loot pools', async () => {
    expectShape(await fncc.lootpool.list(), [lootSummary], 'lootpools');
    expectShape(await fncc.lootpool.get('br-athenacompositelp'), lootPoolDetail, 'lootpool');
    expectShape(
      await fncc.lootpool.containers('br-athenacompositelp'),
      {
        ...lootPoolDetail,
        containers: [{ id: 'string', name: 'string', items: 'number', resolved: 'number', drops: lootRange }],
      },
      'containers',
    );
    expectShape(await fncc.lootpool.container('br-athenacompositelp', 'Loot_AthenaFloorLoot'), lootContainer, 'container');
    const search = await fncc.lootpool.search({ q: 'shotgun', limit: 5 });
    expectShape(search, { status: 'number', total: 'number', count: 'number', data: [lootHit] }, 'lootSearch');
    expectShape(await fncc.lootpool.item('WID_Assault_CoreAR_Athena_C'), [lootHit], 'lootItem');
  });

  it('every loot pool with containers', async () => {
    expectShape(await fncc.lootpool.all(), [{ ...lootSummary, containers: [lootContainer] }], 'lootAll');
  }, 180_000);

  it('seasons, battle passes, modes', async () => {
    expectShape(await fncc.seasons.list(), [season], 'seasons');
    const current = await fncc.seasons.current();
    expect(current.current).toBe(true);
    expectShape(current, season, 'currentSeason');
    expectShape(await fncc.battlepasses.list(), [battlePass], 'battlepasses');
    expectShape(await fncc.battlepasses.get(current.season), battlePass, 'battlepass');
    expectShape(
      await fncc.modes.list(),
      {
        fetchedAt: 'string',
        currentTime: 'string',
        season: { number: 'number', begin: 'string', end: 'string', displayedEnd: 'string' },
        modes: [mode],
      },
      'modes',
    );
    expectShape(await fncc.modes.get('reload'), mode, 'mode');
  });
});

describe('live fn-api.cc epic mirrors', () => {
  it('item shop and sections', async () => {
    expectShape(
      await fncc.itemshop.current(),
      {
        status: 'number',
        fetchedAt: 'string',
        resetsAt: 'string',
        catalogExpiresAt: 'string',
        refreshIntervalHrs: 'number',
        hash: 'string',
        offerCount: 'number',
        itemsResolved: 'number',
        itemsUnresolved: 'number',
        data: [shopOffer],
      },
      'itemshop',
    );
    expectShape(
      await fncc.itemshop.sections(),
      {
        status: 'number',
        fetchedAt: 'string',
        resetsAt: 'string',
        catalogExpiresAt: 'string',
        layoutLastModified: 'string',
        sectionCount: 'number',
        data: [
          {
            id: 'string',
            name: 'string',
            index: 'number',
            category: 'string|null',
            subtitle: 'string|null',
            showIneligibleOffers: 'string',
            background,
            stackRanks: [stackRank],
            offerGroups: [{ id: 'string', displayType: 'string', widePreview: 'boolean', stackRanks: [stackRank] }],
            offerCount: 'number',
          },
        ],
      },
      'sections',
    );
  });

  it('bundles', async () => {
    expectShape(
      await fncc.bundles.list({ limit: 50 }),
      { status: 'number', total: 'number', count: 'number', data: [bundle] },
      'bundles',
    );
    expectShape(await fncc.bundles.get('NoiseClue_Bundle'), bundle, 'bundle');
  });

  it('news', async () => {
    expectShape(
      await fncc.news.all(),
      {
        status: 'number',
        fetchedAt: 'string',
        lastModified: 'string',
        feedCount: 'number',
        messageCount: 'number',
        data: [newsFeed],
      },
      'news',
    );
    expectShape(await fncc.news.feed('br'), newsFeed, 'feed');
  });

  it('lightswitch', async () => {
    const service = nullable(
      {
        serviceId: 'string',
        status: 'string',
        up: 'boolean',
        message: 'string',
        maintenanceUri: 'string|null',
        allowedActions: ['string'],
        banned: 'boolean',
        overrideCatalogIds: ['string'],
        launcher: { appName: 'string', catalogItemId: 'string', namespace: 'string' },
      },
      'launcher',
    );
    expectShape(
      await fncc.lightswitch.all(),
      {
        status: 'number',
        checkedAt: 'string',
        changedAt: 'string',
        stale: 'boolean',
        ageMs: 'number',
        allUp: 'boolean',
        serviceCount: 'number',
        data: [service],
      },
      'lightswitch',
    );
    expectShape(await fncc.lightswitch.service('fortnite'), service, 'service');
  });

  it('lookup by name and by account id', async () => {
    const byName = await fncc.lookup.byName('Ninja');
    expectShape(byName, lookupResponse, 'byName');
    for (const match of [...byName.exact, ...byName.more]) {
      expectShape(match.externalAuths, `record:any`, 'externalAuths');
      for (const auth of Object.values(match.externalAuths)) expectShape(auth, externalAuth, 'externalAuth');
    }
    const byId = await fncc.lookup.byAccountId('4735ce9132924caf8a5b17789b40f79c');
    expect(byId.exact[0]?.displayName).toBe('Ninja');
    expectShape(byId, lookupResponse, 'byId');
  });

  it('mnemonic list, single and related', async () => {
    expectShape(await fncc.mnemonic.list({ type: 'BR:Playlist' }), [mnemonic], 'mnemonics');
    expectShape(await fncc.mnemonic.get('experience_reload'), mnemonic, 'mnemonic');
    const related = await fncc.mnemonic.related('experience_reload');
    expectShape(related, { parentLinks: [mnemonicLink], links: 'record:object' }, 'related');
    for (const link of Object.values(related.links)) expectShape(link, mnemonicLink, 'link');
  });

  it('normalizes a mnemonic the server resolved live from Epic', async () => {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 12_000));
    const live = await fncc.mnemonic.get('1865-4829-7018');
    expectShape(live, mnemonic, 'liveMnemonic');
    expect(typeof live.title).toBe('string');
    expect(live.image).toMatch(/^https:\/\//);
    expect(live.images.full).toMatch(/^https:\/\//);
    expect(live.creator.length).toBeGreaterThan(0);
  }, 90_000);

  it('discovery', async () => {
    const surface = {
      name: 'string',
      testName: 'string',
      testVariant: 'string',
      panelCount: 'number',
      resultCount: 'number',
      panels: [
        {
          name: 'string',
          displayName: 'string',
          subtitle: 'string|null',
          type: 'string',
          featureTags: ['string'],
          hasMore: 'boolean',
          resultCount: 'number',
          results: [
            {
              linkCode: 'string',
              isVisible: 'boolean',
              lockStatus: 'string',
              lockStatusReason: 'string',
              globalCcu: 'number|null',
              likePercent: 'number|null',
            },
          ],
        },
      ],
    };
    expectShape(
      await fncc.discovery.all(),
      {
        status: 'number',
        fetchedAt: 'string',
        stream: 'string',
        surfaceCount: 'number',
        panelCount: 'number',
        resultCount: 'number',
        data: [surface],
      },
      'discovery',
    );
    expectShape(await fncc.discovery.surface('Browse'), surface, 'surface');
  });

  it('cloud storage', async () => {
    expectShape(
      await fncc.cloudstorage.list(),
      [
        {
          filename: 'string',
          uniqueFilename: 'string',
          hash: 'string',
          hash256: 'string',
          sourceHash256: 'string',
          size: 'number',
          contentType: 'string',
          storageType: 'string',
          uploaded: 'string',
          doNotCache: 'boolean',
          cachedAt: 'string',
        },
      ],
      'cloudstorage',
    );
    const ini = await fncc.cloudstorage.file('DefaultGame.ini');
    expect(typeof ini).toBe('string');
    expect(ini.length).toBeGreaterThan(0);
  });

  it('anticheat info and files', async () => {
    const info = await fncc.anticheat.info();
    expectShape(
      info,
      nullable(
        {
          installed: 'boolean',
          splash: fileRef,
          version: 'string',
          productVersion: 'string',
          runtimeVersion: 'string',
          gameVersion: 'string',
          product: 'record:string|null',
          locales: ['string'],
          licenses: ['string'],
          certificates: [fileRef],
          licenseFiles: [fileRef],
          files: [fileRef],
          checkedAt: 'string',
        },
        'splash',
      ),
      'anticheat',
    );
    const licence = await fncc.anticheat.file('Licenses.txt');
    expect(typeof licence).toBe('string');
    const response = await fetch(fncc.anticheat.fileUrl('base.cer'));
    expect(response.ok).toBe(true);
  });

  it('shorten stats and images url', async () => {
    expectShape(await fncc.shorten.stats(), { links: 'number', audit: 'number' }, 'shortenStats');
    const url = fncc.images.url({
      path: 'FortniteGame/Plugins/GameFeatures/BRCosmetics/Content/UI/Foundation/Textures/Icons/Heroes/Athena/Soldier/T-Soldier-HID-017-Athena-Commando-M-L',
      format: 'webp',
      maxSize: 64,
    });
    const response = await fetch(url);
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain('image/webp');
  });
});

describe('live fn-api.cc quests', () => {
  it('serves the whole quest catalog with real game data', async () => {
    const catalog = await fncc.quests.catalog();
    expect(catalog.build).toMatch(/^\+\+Fortnite\+Release-/);
    expect(Object.keys(catalog.quests).length).toBeGreaterThan(1000);
    expect(catalog.categories.length).toBeGreaterThan(50);
    expect(Object.keys(catalog.stwQuests).length).toBeGreaterThan(1000);
    expect(catalog.stwCategories['mainquests']).toMatchObject({ id: 'MainQuests', name: 'Main Quests', sortPriority: 960 });
    expect(catalog.categories.every((category) => category.enabled)).toBe(true);
    for (const [id, quest] of Object.entries(catalog.quests).slice(0, 200)) {
      expect(id).toBe(id.toLowerCase());
      expect(quest.templateId).toBe(id);
      expect(Array.isArray(quest.tags)).toBe(true);
    }
    const delmar = catalog.categories.find((category) => category.id === 'QC_DelMar_Habanero');
    if (delmar) expect(delmar).toMatchObject({ name: 'Ranked', mode: 'rocket-racing' });
  });

  it('filters categories by mode and adds disabled ones on request', async () => {
    const [festival, all, withDisabled] = await Promise.all([
      fncc.quests.categories({ mode: 'festival' }),
      fncc.quests.categories(),
      fncc.quests.categories({ includeDisabled: true }),
    ]);
    expect(festival.categories.length).toBeGreaterThan(0);
    expect(festival.categories.every((category) => category.mode === 'festival')).toBe(true);
    expect(withDisabled.categories.length).toBeGreaterThanOrEqual(all.categories.length);
    expect(withDisabled.categories.filter((category) => !category.enabled).length).toBe(
      withDisabled.categories.length - all.categories.length,
    );
  });

  it('gets and looks up single quests across BR and STW', async () => {
    const stw = await fncc.quests.get('quest:reactivequest_flingers');
    expect(stw.source).toBe('stw');
    expect(stw.objectives['quest_reactive_flingers']?.count).toBe(5);

    const lookup = await fncc.quests.lookup(['quest:reactivequest_flingers', 'quest:fnapi_missing_zzz']);
    expect(Object.keys(lookup.stwQuests)).toEqual(['quest:reactivequest_flingers']);
    expect(lookup.missing).toEqual(['quest:fnapi_missing_zzz']);

    await expect(fncc.quests.get('quest:fnapi_missing_zzz')).rejects.toThrow();
  });
});
