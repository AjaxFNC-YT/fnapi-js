import { ValidationError } from '../core/errors.js';
import { sleep } from '../core/utils.js';
import { EpicApiError } from './errors.js';
import type { EpicRestClient } from './rest.js';

export const PARTY_BASE_URL = 'https://party-service-prod.ol.epicgames.com';
export const PARTY_BUILD_ID = '1:3:';
export const PARTY_DEFAULT_PLATFORM = 'WIN';

const BASE = '/party/api/v1/Fortnite';
const COSMETIC_ROOT = '/BRCosmetics/Athena/Items/Cosmetics';

const MP_LOADOUT_KEY = 'Default:MpLoadout1_j';
const MP_LOADOUT2_KEY = 'Default:MpLoadout2_j';
const EMOTE_KEY = 'Default:FrontendEmote_j';
const JAM_KEY = 'Default:FrontendSparksSongPart_j';
const MATCHMAKING_KEY = 'Default:MatchmakingInfo_j';
const BANNER_INFO_KEY = 'Default:AthenaBannerInfo_j';
const LOADOUT_META_KEY = 'Default:LoadoutMeta_j';
const ATHENA_LOADOUT_KEY = 'Default:AthenaCosmeticLoadout_j';
const BATTLEPASS_KEY = 'Default:BattlePassInfo_j';
const PLATFORM_KEY = 'Default:PlatformData_j';
const PACKED_STATE_KEY = 'Default:PackedState_j';
const MIMOSA_KEY = 'Default:FrontendMimosa_j';
const NUM_PLAYERS_KEY = 'Default:NumAthenaPlayersLeft_U';
const MATCH_STARTED_KEY = 'Default:UtcTimeStartedMatchAthena_s';
const LOBBY_STATE_KEY = 'Default:LobbyState_j';
const SPARKS_SONGPART_ROOT = '/SparksSongTemplates/Items/SongParts';

const CROWNING_ACHIEVEMENT_EMOTE = 'EID_Coronet';
const CROWN_EMOTE_DELAY_MS = 500;

const SLOT = {
  outfit: 'ac',
  backpack: 'ab',
  pickaxe: 'ap',
  contrail: 'at',
  shoes: 'as',
  glider: 'ag',
  sidekick: 'mm',
  bannerIcon: 'li',
  bannerColor: 'lc',
} as const;

const INSTRUMENT_SLOT = {
  bass: 'sb',
  guitar: 'sg',
  drums: 'sd',
  keytar: 'sk',
  microphone: 'sm',
} as const;

interface LoadoutSlot {
  i: string;
  v: unknown[];
}

export const ReadyState = {
  Ready: 'Ready',
  NotReady: 'NotReady',
  SittingOut: 'SittingOut',
} as const;

export type ReadyStateValue = (typeof ReadyState)[keyof typeof ReadyState];

export const JamPart = {
  vocals: 'Vox',
  lead: 'Lead',
  bass: 'Bass',
  drums: 'Drum',
} as const;

export type JamPartValue = (typeof JamPart)[keyof typeof JamPart];

export const SidekickAnim = {
  emote: 'Emote',
  interact: 'Interact',
} as const;

export type SidekickAnimValue = (typeof SidekickAnim)[keyof typeof SidekickAnim];

export interface PartyPrivacyPreset {
  partyType: 'Public' | 'FriendsOnly' | 'Private';
  inviteRestriction: 'AnyMember' | 'LeaderOnly';
  onlyLeaderFriendsCanJoin: boolean;
  presencePermission: 'Anyone' | 'Leader' | 'Noone';
  invitePermission: 'Anyone' | 'AnyMember' | 'Leader';
  acceptingMembers: boolean;
}

export const PartyPrivacy = {
  public: {
    partyType: 'Public',
    inviteRestriction: 'AnyMember',
    onlyLeaderFriendsCanJoin: false,
    presencePermission: 'Anyone',
    invitePermission: 'Anyone',
    acceptingMembers: true,
  },
  friendsOfFriends: {
    partyType: 'FriendsOnly',
    inviteRestriction: 'AnyMember',
    onlyLeaderFriendsCanJoin: false,
    presencePermission: 'Anyone',
    invitePermission: 'AnyMember',
    acceptingMembers: true,
  },
  friends: {
    partyType: 'FriendsOnly',
    inviteRestriction: 'LeaderOnly',
    onlyLeaderFriendsCanJoin: true,
    presencePermission: 'Leader',
    invitePermission: 'Leader',
    acceptingMembers: false,
  },
  privateOfFriends: {
    partyType: 'Private',
    inviteRestriction: 'AnyMember',
    onlyLeaderFriendsCanJoin: false,
    presencePermission: 'Noone',
    invitePermission: 'AnyMember',
    acceptingMembers: false,
  },
  private: {
    partyType: 'Private',
    inviteRestriction: 'LeaderOnly',
    onlyLeaderFriendsCanJoin: true,
    presencePermission: 'Noone',
    invitePermission: 'Leader',
    acceptingMembers: false,
  },
} as const satisfies Record<string, PartyPrivacyPreset>;

export type PartyPrivacyValue = keyof typeof PartyPrivacy;

export const PARTY_PRIVACY_LIST = Object.keys(PartyPrivacy) as PartyPrivacyValue[];

export function isPartyPrivacy(value: string): value is PartyPrivacyValue {
  return Object.prototype.hasOwnProperty.call(PartyPrivacy, value);
}

export interface PartyConfig {
  discoverability?: string;
  joinability?: string;
  joinConfirmation?: boolean;
  maxSize?: number;
  chatEnabled?: boolean;
}

export interface PartyIdentity {
  accountId: string;
  connectionId: string;
  displayName: string;
  platform?: string;
  buildId?: string;
}

export interface RawPartyMember {
  account_id: string;
  meta: Record<string, string>;
  revision: number;
  role?: string;
  connections?: unknown[];
  joined_at?: string;
  updated_at?: string;
}

export interface RawParty {
  id: string;
  config: Record<string, unknown>;
  members: RawPartyMember[];
  meta: Record<string, string>;
  revision: number;
  invites?: unknown[];
  intentions?: unknown[];
}

export interface UserParties {
  current: RawParty[];
  pending?: unknown[];
  invites?: unknown[];
  pings?: unknown[];
}

export interface FakeInstruments {
  bass?: string;
  guitar?: string;
  drums?: string;
  keytar?: string;
  microphone?: string;
}

export interface FakeCosmeticLoadout {
  outfit?: string;
  backpack?: string;
  pickaxe?: string;
  contrail?: string;
  shoes?: string;
  glider?: string;
  sidekick?: string;
  bannerIcon?: string;
  bannerColor?: string;
  variants?: Record<string, unknown[]>;
  instruments?: FakeInstruments;
  crowns?: number;
  emote?: string;
  emoji?: string;
  jam?: string;
}

export interface FakeOutfitStyle {
  variants?: number[];
  colors?: { primary?: number | string | null; secondary?: number | string | null };
  sticker?: string | null;
  enlightenment?: [number, number];
}

export interface PartyMemberBanner {
  bannerIconId?: string;
  bannerColorId?: string;
}

export interface PartyMemberBattlePass {
  purchased: boolean;
  level: number;
}

export interface PartyMemberMatchInfo {
  inMatch: boolean;
  playerCount: number;
  startedAt: Date | null;
}

export interface MetaPatch {
  update?: Record<string, string>;
  delete?: string[];
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function staleRevision(error: unknown): number | null {
  if (!(error instanceof EpicApiError)) return null;
  const stale = error.numericErrorCode === 51018 || (error.errorCode ?? '').includes('stale_revision');
  if (!stale) return null;
  const message = typeof error.body === 'object' && error.body ? (error.body as { errorMessage?: string }).errorMessage : '';
  const match = /current one \[(\d+)\]/.exec(message ?? '');
  return match ? Number(match[1]) : null;
}

function bareId(value: string): string {
  if (value === 'None' || value === '') return value;
  let id = value;
  const colon = id.lastIndexOf(':');
  if (colon >= 0) id = id.slice(colon + 1);
  const slash = id.lastIndexOf('/');
  if (slash >= 0) id = id.slice(slash + 1);
  const dot = id.indexOf('.');
  if (dot >= 0) id = id.slice(0, dot);
  return id;
}

function emotePath(value: string, subfolder = ''): string {
  if (value === '' || value === 'None') return 'None';
  if (value.includes('/')) return value;
  const id = bareId(value);
  const folder = subfolder ? `${COSMETIC_ROOT}/Dances/${subfolder}` : `${COSMETIC_ROOT}/Dances`;
  return `${folder}/${id}.${id}`;
}

function frontendEmote(pickable: string, ekey = '', section = -1): Record<string, unknown> {
  return { pickable, emoteEKey: ekey, emoteSection: section, multipurposeEmoteData: -1 };
}

function bannerColourId(value: string): string {
  const match = /^defaultcolor(\d+)$/i.exec(value.trim());
  return match ? `DefaultColor${match[1]}` : value.trim();
}

const OUTFIT_STYLE_SLOTS = { primary: 3, secondary: 4, sticker: 13 } as const;
const STICKER_NONE = 'None';

function stickerValue(raw: string): string {
  const value = raw.trim();
  if (value === '' || value === STICKER_NONE || value.includes(':')) return value;
  return /^Emoji_/i.test(value) ? `AthenaEmoji:${value}` : value;
}

function colourValue(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function outfitVariantArray(style: FakeOutfitStyle): string[] {
  const base = (style.variants ?? []).map((index) => String(index));
  const primary = colourValue(style.colors?.primary);
  const secondary = colourValue(style.colors?.secondary);
  const sticker = typeof style.sticker === 'string' && style.sticker.trim() !== '' ? stickerValue(style.sticker) : null;

  const extras: Array<[number, string]> = [];
  if (primary !== null) extras.push([OUTFIT_STYLE_SLOTS.primary, primary]);
  if (secondary !== null) extras.push([OUTFIT_STYLE_SLOTS.secondary, secondary]);
  if (sticker !== null) extras.push([OUTFIT_STYLE_SLOTS.sticker, sticker]);
  if (extras.length === 0) return base;

  const length = Math.max(base.length, ...extras.map(([index]) => index + 1));
  const out = Array.from({ length }, (_, index) =>
    base[index] ?? (index === OUTFIT_STYLE_SLOTS.sticker ? STICKER_NONE : '0'),
  );
  for (const [index, value] of extras) out[index] = value;
  return out;
}

function loadoutSalt(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

function jamTrackKey(value: string): string {
  return bareId(value).replace(/^sid_placeholder_/i, '').replace(/^sid_/i, '');
}

function randomGuid(): string {
  let out = '';
  for (let i = 0; i < 32; i += 1) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out.toUpperCase();
}

export interface PrivacyPatch {
  update: Record<string, string>;
  delete: string[];
  config: Record<string, unknown>;
}

export function buildPrivacyPatch(meta: Record<string, string>, preset: PartyPrivacyPreset): PrivacyPatch {
  const update: Record<string, string> = {};
  const del: string[] = [];
  const config: Record<string, unknown> = {};

  const rawPrivacy = meta['Default:PrivacySettings_j'];
  let privacyObject: { PrivacySettings?: Record<string, unknown> } = {};
  if (rawPrivacy) {
    try {
      privacyObject = JSON.parse(rawPrivacy) as { PrivacySettings?: Record<string, unknown> };
    } catch {
      privacyObject = {};
    }
  }
  update['Default:PrivacySettings_j'] = JSON.stringify({
    PrivacySettings: {
      ...(privacyObject.PrivacySettings ?? {}),
      partyType: preset.partyType,
      bOnlyLeaderFriendsCanJoin: preset.onlyLeaderFriendsCanJoin,
      partyInviteRestriction: preset.inviteRestriction,
    },
  });

  update['urn:epic:cfg:presence-perm_s'] = preset.presencePermission;
  update['urn:epic:cfg:accepting-members_b'] = String(preset.acceptingMembers);
  update['urn:epic:cfg:invite-perm_s'] = preset.invitePermission;

  if (preset.partyType === 'Private') {
    del.push('urn:epic:cfg:not-accepting-members');
    update['urn:epic:cfg:not-accepting-members-reason_i'] = '7';
    config.discoverability = 'INVITED_ONLY';
    config.joinability = 'INVITE_AND_FORMER';
  } else {
    del.push('urn:epic:cfg:not-accepting-members-reason_i');
    config.discoverability = 'ALL';
    config.joinability = 'OPEN';
  }

  return { update, delete: del, config };
}

function buildJoinPayload(identity: PartyIdentity): Record<string, unknown> {
  const platform = identity.platform ?? PARTY_DEFAULT_PLATFORM;
  return {
    connection: {
      id: identity.connectionId,
      meta: {
        'urn:epic:conn:platform_s': platform,
        'urn:epic:conn:type_s': 'game',
      },
      yield_leadership: false,
    },
    meta: {
      'urn:epic:member:dn_s': identity.displayName,
      'urn:epic:member:joinrequestusers_j': JSON.stringify({
        users: [
          {
            id: identity.accountId,
            dn: identity.displayName,
            plat: platform,
            data: JSON.stringify({ CrossplayPreference: '1', SubGame_u: '1' }),
          },
        ],
      }),
    },
  };
}

export class PartyClient {
  constructor(private readonly rest: EpicRestClient) {}

  async userParties(accessToken: string, accountId: string): Promise<UserParties> {
    requireString(accessToken, 'accessToken');
    requireString(accountId, 'accountId');
    const response = await this.rest.request<UserParties>('GET', `${BASE}/user/${encodeURIComponent(accountId)}`, {
      bearer: accessToken,
    });
    return response.data;
  }

  async updateParty(accessToken: string, partyId: string, body: { revision: number; meta?: MetaPatch; config?: Record<string, unknown> }): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(partyId, 'partyId');
    await this.rest.request('PATCH', `${BASE}/parties/${encodeURIComponent(partyId)}`, {
      bearer: accessToken,
      json: body,
    });
  }

  async updateMemberMeta(accessToken: string, partyId: string, accountId: string, body: { revision: number; update?: Record<string, string>; delete?: string[] }): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(partyId, 'partyId');
    requireString(accountId, 'accountId');
    await this.rest.request('PATCH', `${BASE}/parties/${encodeURIComponent(partyId)}/members/${encodeURIComponent(accountId)}/meta`, {
      bearer: accessToken,
      json: body,
    });
  }

  async promote(accessToken: string, partyId: string, memberId: string): Promise<void> {
    requireString(accessToken, 'accessToken');
    await this.rest.request('POST', `${BASE}/parties/${encodeURIComponent(partyId)}/members/${encodeURIComponent(memberId)}/promote`, {
      bearer: accessToken,
    });
  }

  async kick(accessToken: string, partyId: string, accountId: string): Promise<void> {
    requireString(accessToken, 'accessToken');
    await this.rest.request('DELETE', `${BASE}/parties/${encodeURIComponent(partyId)}/members/${encodeURIComponent(accountId)}`, {
      bearer: accessToken,
    });
  }

  leave(accessToken: string, partyId: string, accountId: string): Promise<void> {
    return this.kick(accessToken, partyId, accountId);
  }

  async invite(accessToken: string, partyId: string, friendId: string, sendPing = true): Promise<void> {
    requireString(accessToken, 'accessToken');
    await this.rest.request('POST', `${BASE}/parties/${encodeURIComponent(partyId)}/invites/${encodeURIComponent(friendId)}`, {
      bearer: accessToken,
      query: { sendPing },
      json: {},
    });
  }

  async requestToJoin(accessToken: string, friendId: string, accountId: string): Promise<void> {
    requireString(accessToken, 'accessToken');
    await this.rest.request('POST', `${BASE}/members/${encodeURIComponent(friendId)}/intentions/${encodeURIComponent(accountId)}`, {
      bearer: accessToken,
      json: {},
    });
  }

  async pings(accessToken: string, accountId: string, pingerId: string): Promise<unknown> {
    requireString(accessToken, 'accessToken');
    const response = await this.rest.request(
      'GET',
      `${BASE}/user/${encodeURIComponent(accountId)}/pings/${encodeURIComponent(pingerId)}/parties`,
      { bearer: accessToken },
    );
    return response.data;
  }

  async lookupParty(accessToken: string, partyId: string): Promise<RawParty> {
    requireString(accessToken, 'accessToken');
    requireString(partyId, 'partyId');
    const response = await this.rest.request<RawParty>('GET', `${BASE}/parties/${encodeURIComponent(partyId)}`, {
      bearer: accessToken,
    });
    return response.data;
  }

  async create(accessToken: string, identity: PartyIdentity, config: PartyConfig = {}): Promise<RawParty> {
    requireString(accessToken, 'accessToken');
    requireString(identity.connectionId, 'connectionId');
    requireString(identity.displayName, 'displayName');
    const platform = identity.platform ?? PARTY_DEFAULT_PLATFORM;
    const chatEnabled = config.chatEnabled ?? true;
    const payload = {
      config: {
        discoverability: config.discoverability ?? 'ALL',
        join_confirmation: config.joinConfirmation ?? false,
        joinability: config.joinability ?? 'OPEN',
        max_size: config.maxSize ?? 16,
      },
      join_info: {
        connection: {
          id: identity.connectionId,
          meta: {
            'urn:epic:conn:platform_s': platform,
            'urn:epic:conn:type_s': 'game',
          },
          yield_leadership: false,
        },
        meta: {
          'urn:epic:member:dn_s': identity.displayName,
        },
      },
      meta: {
        'urn:epic:cfg:party-type-id_s': 'default',
        'urn:epic:cfg:build-id_s': identity.buildId ?? PARTY_BUILD_ID,
        'urn:epic:cfg:join-request-action_s': 'Manual',
        'urn:epic:cfg:chat-enabled_b': String(chatEnabled),
        'urn:epic:cfg:can-join_b': 'true',
        'urn:epic:cfg:presence-perm_s': 'Noone',
        'urn:epic:cfg:accepting-members_b': 'false',
        'urn:epic:cfg:invite-perm_s': 'Noone',
        'urn:epic:cfg:not-accepting-members-reason_i': '0',
      },
    };
    const response = await this.rest.request<RawParty>('POST', `${BASE}/parties`, {
      bearer: accessToken,
      json: payload,
    });
    return response.data;
  }

  async joinById(accessToken: string, partyId: string, identity: PartyIdentity): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(partyId, 'partyId');
    requireString(identity.accountId, 'accountId');
    await this.rest.request('POST', `${BASE}/parties/${encodeURIComponent(partyId)}/members/${encodeURIComponent(identity.accountId)}/join`, {
      bearer: accessToken,
      json: buildJoinPayload(identity),
    });
  }

  async confirmMember(accessToken: string, partyId: string, accountId: string): Promise<void> {
    requireString(accessToken, 'accessToken');
    await this.rest.request('POST', `${BASE}/parties/${encodeURIComponent(partyId)}/members/${encodeURIComponent(accountId)}/confirm`, {
      bearer: accessToken,
      json: {},
    });
  }

  async rejectMember(accessToken: string, partyId: string, accountId: string): Promise<void> {
    requireString(accessToken, 'accessToken');
    await this.rest.request('POST', `${BASE}/parties/${encodeURIComponent(partyId)}/members/${encodeURIComponent(accountId)}/reject`, {
      bearer: accessToken,
      json: {},
    });
  }

  async declineInvite(accessToken: string, partyId: string, accountId: string): Promise<void> {
    requireString(accessToken, 'accessToken');
    await this.rest.request('POST', `${BASE}/parties/${encodeURIComponent(partyId)}/invites/${encodeURIComponent(accountId)}/decline`, {
      bearer: accessToken,
      json: {},
    });
  }

  async sendIntention(accessToken: string, targetId: string, accountId: string, guid = randomGuid()): Promise<void> {
    requireString(accessToken, 'accessToken');
    requireString(targetId, 'targetId');
    requireString(accountId, 'accountId');
    await this.rest.request('POST', `${BASE}/members/${encodeURIComponent(targetId)}/intentions/${encodeURIComponent(accountId)}`, {
      bearer: accessToken,
      json: { 'urn:epic:invite:platformdata_s': `RequestToJoin,guid=${guid}` },
    });
  }
}

export class PartyMember {
  public accountId: string;
  public meta: Record<string, string>;
  public revision: number;
  public role: string;

  constructor(private readonly party: Party, raw: RawPartyMember) {
    this.accountId = raw.account_id;
    this.meta = { ...raw.meta };
    this.revision = raw.revision ?? 0;
    this.role = raw.role ?? 'MEMBER';
  }

  get isLeader(): boolean {
    return this.role === 'CAPTAIN';
  }

  get isSelf(): boolean {
    return this.accountId === this.party.clientAccountId;
  }

  private get loadoutSlots(): Record<string, LoadoutSlot> {
    return this.getProp<{ MpLoadout1?: { s?: Record<string, LoadoutSlot> } }>(MP_LOADOUT_KEY)?.MpLoadout1?.s ?? {};
  }

  private get matchmakingInfo(): Record<string, unknown> {
    return this.getProp<{ MatchmakingInfo?: Record<string, unknown> }>(MATCHMAKING_KEY)?.MatchmakingInfo ?? {};
  }

  private pickableId(key: string, prop: string): string | undefined {
    const pickable = (this.getProp<Record<string, { pickable?: string }>>(key)?.[prop])?.pickable;
    if (!pickable || pickable === 'None') return undefined;
    const dot = pickable.lastIndexOf('.');
    return dot >= 0 ? pickable.slice(dot + 1) : pickable;
  }

  private loadoutStat(name: string): number | undefined {
    const stats = this.getProp<{ LoadoutMeta?: { stats?: unknown[] } }>(LOADOUT_META_KEY)?.LoadoutMeta?.stats;
    if (!Array.isArray(stats)) return undefined;
    for (const entry of stats) {
      if (typeof entry === 'string') {
        const [key, value] = entry.split(':');
        if (key === name) return Number(value);
      } else if (entry && typeof entry === 'object') {
        const stat = entry as { statName?: string; statValue?: number };
        if (stat.statName === name) return stat.statValue;
      }
    }
    return undefined;
  }

  get outfit(): string | undefined {
    return this.loadoutSlots.ac?.i;
  }

  get backpack(): string | undefined {
    return this.loadoutSlots.ab?.i;
  }

  get pickaxe(): string | undefined {
    return this.loadoutSlots.ap?.i;
  }

  get contrail(): string | undefined {
    return this.loadoutSlots.at?.i;
  }

  get shoes(): string | undefined {
    return this.loadoutSlots.as?.i;
  }

  get glider(): string | undefined {
    return this.loadoutSlots.ag?.i;
  }

  get sidekick(): string | undefined {
    return this.loadoutSlots.mm?.i;
  }

  get instruments(): FakeInstruments {
    const s = this.loadoutSlots;
    return { bass: s.sb?.i, guitar: s.sg?.i, drums: s.sd?.i, keytar: s.sk?.i, microphone: s.sm?.i };
  }

  get banner(): PartyMemberBanner | undefined {
    const s = this.loadoutSlots;
    if (!s.li?.i && !s.lc?.i) return undefined;
    return { bannerIconId: s.li?.i, bannerColorId: s.lc?.i };
  }

  get emote(): string | undefined {
    return this.pickableId(EMOTE_KEY, 'FrontendEmote');
  }

  get isEmoting(): boolean {
    return this.emote !== undefined;
  }

  get jamTrack(): string | undefined {
    return this.pickableId(JAM_KEY, 'FrontendSparksSongPart');
  }

  get isJamming(): boolean {
    return this.jamTrack !== undefined;
  }

  get readyState(): ReadyStateValue {
    const status = this.matchmakingInfo['readyStatus'];
    return status === 'Ready' || status === 'SittingOut' ? status : 'NotReady';
  }

  get isReady(): boolean {
    return this.readyState === 'Ready';
  }

  get isSittingOut(): boolean {
    return this.readyState === 'SittingOut';
  }

  get inMatch(): boolean {
    return this.getProp<{ PackedState?: { location?: string } }>(PACKED_STATE_KEY)?.PackedState?.location === 'InGame';
  }

  get matchInfo(): PartyMemberMatchInfo {
    const players = this.getMetaKey(NUM_PLAYERS_KEY);
    const started = this.getMetaKey(MATCH_STARTED_KEY);
    return {
      inMatch: this.inMatch,
      playerCount: players ? Number(players) : 0,
      startedAt: started ? new Date(started) : null,
    };
  }

  get battlePass(): PartyMemberBattlePass | undefined {
    const info = this.getProp<{ BattlePassInfo?: { bHasPurchasedPass?: boolean; passLevel?: number } }>(BATTLEPASS_KEY)?.BattlePassInfo;
    if (!info) return undefined;
    return { purchased: !!info.bHasPurchasedPass, level: info.passLevel ?? 0 };
  }

  get level(): number {
    return this.battlePass?.level ?? 0;
  }

  get platform(): string | undefined {
    return this.getProp<{ PlatformData?: { platform?: { platformDescription?: { name?: string } } } }>(PLATFORM_KEY)
      ?.PlatformData?.platform?.platformDescription?.name;
  }

  get inputMethod(): string | undefined {
    return this.getProp<{ LobbyState?: { currentInputType?: string } }>(LOBBY_STATE_KEY)?.LobbyState?.currentInputType;
  }

  get crowns(): number {
    return this.loadoutStat('TotalVictoryCrowns') ?? 0;
  }

  get hasCrown(): boolean {
    return (this.loadoutStat('HasCrown') ?? 0) > 0;
  }

  getMeta(): Record<string, string> {
    return { ...this.meta };
  }

  getMetaKey(key: string): string | undefined {
    return this.meta[key];
  }

  getProp<T = unknown>(key: string): T | null {
    const raw = this.meta[key];
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  patchMeta(update: Record<string, string> = {}, deleteKeys: string[] = []): Promise<void> {
    return this.party.patchMemberMeta(this, update, deleteKeys);
  }

  updateMetaKey(key: string, value: string): Promise<void> {
    requireString(key, 'key');
    return this.patchMeta({ [key]: value });
  }

  setProp(key: string, value: unknown): Promise<void> {
    requireString(key, 'key');
    return this.patchMeta({ [key]: JSON.stringify(value) });
  }

  private mpLoadout(): { MpLoadout1: { s: Record<string, LoadoutSlot> } } {
    const current = this.getProp<{ MpLoadout1?: { s?: Record<string, LoadoutSlot> } }>(MP_LOADOUT_KEY);
    return { MpLoadout1: { s: current?.MpLoadout1?.s ?? {} } };
  }

  async fakeApplyCosmetics(loadout: FakeCosmeticLoadout): Promise<void> {
    this.requireSelf();
    const mp = this.mpLoadout();
    const slots = mp.MpLoadout1.s;
    const variants = loadout.variants ?? {};

    const apply = (value: string | undefined, key: string): void => {
      if (value === undefined) return;
      if (value === '' || value === 'None') {
        delete slots[key];
        return;
      }
      slots[key] = { i: bareId(value), v: variants[key] ?? [] };
    };

    apply(loadout.outfit, SLOT.outfit);
    apply(loadout.backpack, SLOT.backpack);
    apply(loadout.pickaxe, SLOT.pickaxe);
    apply(loadout.contrail, SLOT.contrail);
    apply(loadout.shoes, SLOT.shoes);
    apply(loadout.glider, SLOT.glider);

    if (loadout.bannerIcon !== undefined) slots[SLOT.bannerIcon] = { i: loadout.bannerIcon, v: [] };
    if (loadout.bannerColor !== undefined) slots[SLOT.bannerColor] = { i: loadout.bannerColor, v: [] };

    if (loadout.instruments) {
      for (const [name, key] of Object.entries(INSTRUMENT_SLOT)) {
        const value = loadout.instruments[name as keyof FakeInstruments];
        if (value === undefined) continue;
        slots[key] = { i: bareId(value), v: variants[key] ?? ['0'] };
      }
    }

    await this.setProp(MP_LOADOUT_KEY, mp);

    if (loadout.sidekick !== undefined) await this.fakeSidekick(loadout.sidekick);
    if (loadout.crowns !== undefined) await this.fakeCrown(loadout.crowns);

    if (loadout.emote !== undefined) await this.fakeEmote(loadout.emote);
    else if (loadout.emoji !== undefined) await this.fakeEmoji(loadout.emoji);
    else if (loadout.jam !== undefined) await this.fakeJam(loadout.jam);
  }

  fakeEquipOutfit(cosmetic: string): Promise<void> {
    return this.fakeApplyCosmetics({ outfit: cosmetic });
  }

  fakeEquipBackpack(cosmetic: string): Promise<void> {
    return this.fakeApplyCosmetics({ backpack: cosmetic });
  }

  fakeEquipPickaxe(cosmetic: string): Promise<void> {
    return this.fakeApplyCosmetics({ pickaxe: cosmetic });
  }

  fakeEquipContrail(cosmetic: string): Promise<void> {
    return this.fakeApplyCosmetics({ contrail: cosmetic });
  }

  fakeEquipShoes(cosmetic: string): Promise<void> {
    return this.fakeApplyCosmetics({ shoes: cosmetic });
  }

  fakeEquipGlider(cosmetic: string): Promise<void> {
    return this.fakeApplyCosmetics({ glider: cosmetic });
  }

  fakeEquipSidekick(cosmetic: string): Promise<void> {
    return this.fakeSidekick(cosmetic);
  }

  fakeInstruments(instruments: FakeInstruments): Promise<void> {
    return this.fakeApplyCosmetics({ instruments });
  }

  async fakeOutfit(cosmetic: string, style: FakeOutfitStyle = {}): Promise<void> {
    this.requireSelf();
    const mp = this.mpLoadout();
    mp.MpLoadout1.s[SLOT.outfit] = { i: bareId(cosmetic), v: outfitVariantArray(style) };
    const loadoutMeta = this.getProp<{ LoadoutMeta?: Record<string, unknown> }>(LOADOUT_META_KEY)?.LoadoutMeta ?? {};
    const scratch =
      style.enlightenment && style.enlightenment.length === 2
        ? [{ t: style.enlightenment[0], v: style.enlightenment[1] }]
        : [];
    await this.patchMeta({
      [MP_LOADOUT_KEY]: JSON.stringify(mp),
      [LOADOUT_META_KEY]: JSON.stringify({ LoadoutMeta: { ...loadoutMeta, scratch, rand: loadoutSalt() } }),
    });
  }

  async fakeSidekick(cosmetic: string | null): Promise<void> {
    this.requireSelf();
    const mp = this.mpLoadout();
    const slots = mp.MpLoadout1.s;
    const loadout = this.getProp<{ AthenaCosmeticLoadout?: Record<string, unknown> }>(ATHENA_LOADOUT_KEY)?.AthenaCosmeticLoadout ?? {};

    if (cosmetic === null || cosmetic === '' || cosmetic === 'None') {
      delete slots[SLOT.sidekick];
      loadout.mimosaDef = 'None';
    } else {
      const id = bareId(cosmetic);
      slots[SLOT.sidekick] = { i: id, v: [] };
      loadout.mimosaDef = `CosmeticCompanion:${id}`;
    }
    loadout.mimosaEKey = '';

    await this.patchMeta({
      [MP_LOADOUT_KEY]: JSON.stringify(mp),
      [ATHENA_LOADOUT_KEY]: JSON.stringify({ AthenaCosmeticLoadout: loadout }),
    });
  }

  async fakeSidekickAnim(anim: SidekickAnimValue | 'None' = 'Emote'): Promise<void> {
    this.requireSelf();
    const current = this.getProp<{ FrontendMimosa?: Record<string, unknown> }>(MIMOSA_KEY)?.FrontendMimosa ?? {};
    await this.setProp(MIMOSA_KEY, {
      FrontendMimosa: { ...current, frontendMimosaAnimType: anim, frontendMimosaInstanceId: '' },
    });
  }

  fakeStopSidekickAnim(): Promise<void> {
    return this.fakeSidekickAnim('None');
  }

  fakeBanner(icon: string, color?: string): Promise<void> {
    this.requireSelf();
    const iconId = bareId(icon);
    const colorId = color !== undefined ? bannerColourId(color) : undefined;

    const mp1 = this.mpLoadout();
    mp1.MpLoadout1.s[SLOT.bannerIcon] = { i: iconId, v: [] };
    if (colorId !== undefined) mp1.MpLoadout1.s[SLOT.bannerColor] = { i: colorId, v: [] };

    const mp2raw = this.getProp<{ MpLoadout2?: { s?: Record<string, LoadoutSlot> } }>(MP_LOADOUT2_KEY);
    const mp2 = { MpLoadout2: { s: { ...(mp2raw?.MpLoadout2?.s ?? {}) } } };
    mp2.MpLoadout2.s[SLOT.bannerIcon] = { i: iconId, v: [] };
    if (colorId !== undefined) mp2.MpLoadout2.s[SLOT.bannerColor] = { i: colorId, v: [] };

    const info = this.getProp<{ AthenaBannerInfo?: Record<string, unknown> }>(BANNER_INFO_KEY)?.AthenaBannerInfo ?? {};
    const bannerInfo: Record<string, unknown> = { ...info, bannerIconId: iconId, seasonLevel: info.seasonLevel ?? 0 };
    if (colorId !== undefined) bannerInfo.bannerColorId = colorId;

    return this.patchMeta({
      [BANNER_INFO_KEY]: JSON.stringify({ AthenaBannerInfo: bannerInfo }),
      [MP_LOADOUT_KEY]: JSON.stringify(mp1),
      [MP_LOADOUT2_KEY]: JSON.stringify(mp2),
    });
  }

  async fakeLoadoutStats(values: Record<string, number>): Promise<void> {
    this.requireSelf();
    const current = this.getProp<{ LoadoutMeta?: Record<string, unknown> }>(LOADOUT_META_KEY)?.LoadoutMeta ?? {};
    const existing = Array.isArray(current.stats) ? (current.stats as unknown[]) : [];
    const merged = new Map<string, string>();
    for (const entry of existing) {
      const text =
        typeof entry === 'string'
          ? entry
          : `${(entry as { statName?: string }).statName ?? ''}:${(entry as { statValue?: number }).statValue ?? 0}`;
      const key = text.split(':')[0];
      if (key) merged.set(key, text);
    }
    for (const [key, value] of Object.entries(values)) {
      merged.set(key, `${key}:${Math.max(0, Math.trunc(value))}`);
    }
    await this.setProp(LOADOUT_META_KEY, { LoadoutMeta: { ...current, stats: [...merged.values()] } });
  }

  async fakeCrown(wins: number, playEmote = false): Promise<void> {
    await this.fakeLoadoutStats({
      TotalVictoryCrowns: wins,
      TotalRoyalRoyales: wins,
      HasCrown: wins > 0 ? 1 : 0,
    });
    if (playEmote) {
      await sleep(CROWN_EMOTE_DELAY_MS);
      await this.fakeEmote(CROWNING_ACHIEVEMENT_EMOTE);
    }
  }

  async fakeBattlePass(purchased: boolean, level: number): Promise<void> {
    this.requireSelf();
    const info = this.getProp<{ BattlePassInfo?: Record<string, unknown> }>(BATTLEPASS_KEY)?.BattlePassInfo ?? {};
    await this.setProp(BATTLEPASS_KEY, {
      BattlePassInfo: { ...info, bHasPurchasedPass: purchased, passLevel: level },
    });
  }

  fakeLevel(level: number): Promise<void> {
    const info = this.getProp<{ BattlePassInfo?: { bHasPurchasedPass?: boolean } }>(BATTLEPASS_KEY)?.BattlePassInfo;
    return this.fakeBattlePass(info?.bHasPurchasedPass ?? false, level);
  }

  async fakePlatform(platform: string): Promise<void> {
    this.requireSelf();
    const name = platform.toUpperCase();
    const platformType = name === 'WIN' ? 'DESKTOP' : ['PSN', 'XBL', 'SWT'].includes(name) ? 'CONSOLE' : 'MOBILE';
    const crossplayPool = name === 'WIN' ? 'DESKTOP' : platformType === 'CONSOLE' ? 'CONSOLE' : 'MOBILE';
    const current = this.getProp<{ PlatformData?: Record<string, any> }>(PLATFORM_KEY)?.PlatformData ?? {};
    const platformObj = current.platform ?? {};
    const description = platformObj.platformDescription ?? {};
    await this.setProp(PLATFORM_KEY, {
      PlatformData: {
        ...current,
        platform: {
          ...platformObj,
          platformDescription: { ...description, name, platformType, crossplayPool },
        },
      },
    });
  }

  async fakePlaying(playing = true, playerCount = 100, startedAt: Date = new Date()): Promise<void> {
    this.requireSelf();
    const packed = this.getProp<{ PackedState?: Record<string, unknown> }>(PACKED_STATE_KEY)?.PackedState ?? {};
    const info = this.getProp<{ MatchmakingInfo?: Record<string, unknown> }>(MATCHMAKING_KEY)?.MatchmakingInfo ?? {};
    await this.patchMeta({
      [PACKED_STATE_KEY]: JSON.stringify({
        PackedState: { ...packed, location: playing ? 'InGame' : 'PreLobby', gameMode: playing ? 'InBattleRoyale' : 'None' },
      }),
      [MATCHMAKING_KEY]: JSON.stringify({ MatchmakingInfo: { ...info, hasPreloadedAthena: playing } }),
      [NUM_PLAYERS_KEY]: String(Math.max(0, Math.trunc(playerCount))),
      [MATCH_STARTED_KEY]: startedAt.toISOString(),
    });
  }

  async fakeSittingOut(sittingOut = true): Promise<void> {
    this.requireSelf();
    const info = this.getProp<{ MatchmakingInfo?: Record<string, unknown> }>(MATCHMAKING_KEY)?.MatchmakingInfo ?? {};
    await this.setProp(MATCHMAKING_KEY, {
      MatchmakingInfo: { ...info, readyStatus: sittingOut ? 'SittingOut' : 'NotReady', readyStatusMMId: '' },
    });
  }

  async fakeEmote(cosmetic: string): Promise<void> {
    this.requireSelf();
    await this.setProp(EMOTE_KEY, { FrontendEmote: frontendEmote(emotePath(cosmetic)) });
  }

  async fakeEmoji(cosmetic: string): Promise<void> {
    this.requireSelf();
    await this.setProp(EMOTE_KEY, { FrontendEmote: frontendEmote(emotePath(cosmetic, 'Emoji')) });
  }

  async fakeJam(cosmetic: string): Promise<void> {
    this.requireSelf();
    const pickable = cosmetic === '' || cosmetic === 'None' ? 'None' : cosmetic.includes('/') ? cosmetic : emotePath(cosmetic);
    await this.patchMeta({
      [EMOTE_KEY]: JSON.stringify({ FrontendEmote: frontendEmote(pickable) }),
      [JAM_KEY]: JSON.stringify({ FrontendSparksSongPart: frontendEmote(pickable) }),
    });
  }

  async fakeJamTrack(trackKey: string, part: JamPartValue = 'Vox'): Promise<void> {
    this.requireSelf();
    const asset = `SparksSongPart_Placeholder_${jamTrackKey(trackKey)}_${part}`;
    const pickable = `${SPARKS_SONGPART_ROOT}/${asset}.${asset}`;
    await this.patchMeta({
      [EMOTE_KEY]: JSON.stringify({ FrontendEmote: frontendEmote(pickable) }),
      [JAM_KEY]: JSON.stringify({ FrontendSparksSongPart: frontendEmote(pickable) }),
    });
  }

  fakeStopEmote(): Promise<void> {
    return this.fakeEmote('None');
  }

  async fakeReady(ready: boolean | ReadyStateValue = true): Promise<void> {
    this.requireSelf();
    const status: ReadyStateValue = typeof ready === 'string' ? ready : ready ? 'Ready' : 'NotReady';
    const info = (this.getProp<{ MatchmakingInfo?: Record<string, unknown> }>(MATCHMAKING_KEY)?.MatchmakingInfo ?? {}) as Record<string, unknown>;
    info['readyStatus'] = status;
    await this.setProp(MATCHMAKING_KEY, { MatchmakingInfo: info });
  }

  private requireSelf(): void {
    if (!this.isSelf) {
      throw new ValidationError('You can only edit your own party member state', 'accountId');
    }
  }
}

export class Party {
  public readonly id: string;
  public revision: number;
  public readonly config: Record<string, unknown>;
  public meta: Record<string, string>;
  public members: PartyMember[];

  constructor(
    private readonly client: PartyClient,
    private readonly token: () => Promise<string>,
    public readonly clientAccountId: string,
    raw: RawParty,
  ) {
    this.id = raw.id;
    this.revision = raw.revision ?? 0;
    this.config = raw.config ?? {};
    this.meta = { ...raw.meta };
    this.members = (raw.members ?? []).map((member) => new PartyMember(this, member));
  }

  get me(): PartyMember | null {
    return this.member(this.clientAccountId);
  }

  get leader(): PartyMember | null {
    return this.members.find((member) => member.isLeader) ?? null;
  }

  member(accountId: string): PartyMember | null {
    return this.members.find((member) => member.accountId === accountId) ?? null;
  }

  async refresh(): Promise<this> {
    const token = await this.token();
    const parties = await this.client.userParties(token, this.clientAccountId);
    const raw = (parties.current ?? []).find((party) => party.id === this.id) ?? parties.current?.[0];
    if (!raw) throw new ValidationError('You are no longer in this party', 'party');
    this.revision = raw.revision ?? this.revision;
    this.meta = { ...raw.meta };
    this.members = (raw.members ?? []).map((member) => new PartyMember(this, member));
    return this;
  }

  async patchMeta(update: Record<string, string> = {}, deleteKeys: string[] = []): Promise<void> {
    const token = await this.token();
    const send = async (revision: number): Promise<void> => {
      await this.client.updateParty(token, this.id, {
        revision,
        meta: { update, ...(deleteKeys.length ? { delete: deleteKeys } : {}) },
      });
    };
    await this.withRevision((revision) => send(revision), () => this.revision, (value) => {
      this.revision = value;
    });
    Object.assign(this.meta, update);
    for (const key of deleteKeys) delete this.meta[key];
  }

  async patchMemberMeta(member: PartyMember, update: Record<string, string>, deleteKeys: string[]): Promise<void> {
    if (member.accountId !== this.clientAccountId) {
      throw new ValidationError('You can only edit your own party member meta', 'accountId');
    }
    const token = await this.token();
    const send = async (revision: number): Promise<void> => {
      await this.client.updateMemberMeta(token, this.id, member.accountId, {
        revision,
        update,
        ...(deleteKeys.length ? { delete: deleteKeys } : {}),
      });
    };
    await this.withRevision((revision) => send(revision), () => member.revision, (value) => {
      member.revision = value;
    });
    Object.assign(member.meta, update);
    for (const key of deleteKeys) delete member.meta[key];
  }

  async leave(): Promise<void> {
    const token = await this.token();
    await this.client.leave(token, this.id, this.clientAccountId);
  }

  async invite(accountId: string, sendPing = true): Promise<void> {
    requireString(accountId, 'accountId');
    const token = await this.token();
    await this.client.invite(token, this.id, accountId, sendPing);
  }

  async promote(accountId: string): Promise<void> {
    requireString(accountId, 'accountId');
    const token = await this.token();
    await this.client.promote(token, this.id, accountId);
  }

  async kick(accountId: string): Promise<void> {
    requireString(accountId, 'accountId');
    const token = await this.token();
    await this.client.kick(token, this.id, accountId);
  }

  async setConfig(patch: Record<string, unknown>): Promise<void> {
    this.requireLeader();
    const token = await this.token();
    await this.withRevision(
      (revision) => this.client.updateParty(token, this.id, { revision, config: patch }),
      () => this.revision,
      (value) => {
        this.revision = value;
      },
    );
    Object.assign(this.config, patch);
  }

  async setPrivacy(privacy: PartyPrivacyValue | PartyPrivacyPreset): Promise<void> {
    this.requireLeader();
    const preset: PartyPrivacyPreset = typeof privacy === 'string' ? PartyPrivacy[privacy] : privacy;
    if (!preset) throw new ValidationError(`Unknown party privacy "${String(privacy)}"`, 'privacy');
    const patch = buildPrivacyPatch(this.meta, preset);
    const token = await this.token();
    await this.withRevision(
      (revision) =>
        this.client.updateParty(token, this.id, {
          revision,
          meta: { update: patch.update, ...(patch.delete.length ? { delete: patch.delete } : {}) },
          config: patch.config,
        }),
      () => this.revision,
      (value) => {
        this.revision = value;
      },
    );
    Object.assign(this.meta, patch.update);
    for (const key of patch.delete) delete this.meta[key];
    Object.assign(this.config, patch.config);
  }

  private requireLeader(): void {
    if (this.me?.isLeader !== true) {
      throw new ValidationError('Only the party leader can perform this action', 'leader');
    }
  }

  private async withRevision(
    send: (revision: number) => Promise<void>,
    get: () => number,
    set: (value: number) => void,
  ): Promise<void> {
    try {
      await send(get());
      set(get() + 1);
    } catch (error) {
      const current = staleRevision(error);
      if (current === null) throw error;
      set(current);
      await send(current);
      set(current + 1);
    }
  }
}
