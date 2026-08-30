import { ConfigurationError, ValidationError } from '../core/errors.js';
import { AccountManager, DeviceAuthManager } from './account.js';
import type { AuthManager, ExchangeCodeOptions, TokenRequestOptions } from './auth.js';
import {
  isCustomClientInput,
  resolveAuthClient,
  type AuthClient,
  type AuthClientInput,
} from './clients.js';
import { EpicApiError, EpicPermissionError } from './errors.js';
import {
  buildSignedMessage,
  decodeMessageBody,
  generateChatKeypair,
  CHAT_DEFAULT_PLATFORM,
  CHAT_MAX_MESSAGE_LENGTH,
  ChatService,
  type ChatKeypair,
  type ChatMessage,
  type ChatSendResult,
  type ConversationData,
} from './chat.js';
import { ConnectClient, type ConnectClientOptions } from './connect.js';
import type {
  MCPClient,
  MCPOperation,
  MCPOperationOptions,
  MCPProfileId,
  MCPResponse,
} from './mcp.js';
import {
  EosConnectManager,
  LockerService,
  type EasToken,
  type EosIdAccount,
  type EosProductUserMapping,
  type EosToken,
  type EosTokenOptions,
  type LockerItemsResponse,
} from './eos.js';
import type {
  BlocklistEntry,
  FriendAddOptions,
  FriendEntry,
  FriendsManager,
  FriendsSummary,
  ResolvedFriendEntry,
} from './friends.js';
import type {
  HabaneroBaseOptions,
  HabaneroManager,
  HabaneroProgress,
  HabaneroProgressOptions,
  HabaneroRankingTypeOptions,
  HabaneroTrack,
  HabaneroTracksOptions,
  RankingType,
} from './habanero.js';
import { LiveClient, type LiveClientOptions } from './live.js';
import { Party, type PartyClient } from './party.js';
import { Shop, Gifting, type StorefrontCatalog, type ShopFetchOptions } from './shop.js';
import type {
  FortniteGameManager,
  BrInventory,
  Receipt,
  Timeline,
  VbucksBalance,
  CommonCoreProfile,
  MtxPlatform,
} from './game.js';
import type { LightswitchManager, LightswitchStatus, LightswitchOptions } from './lightswitch.js';
import type { SocialBanManager, SocialBanStatus, SocialBanOptions } from './socialBan.js';
import type { PresenceManager, LastOnlineEntry, LastOnlineResponse, PresenceOptions } from './presence.js';
import { XmppClient } from './xmpp.js';
import type { FriendPresence, XmppClientOptions } from './xmpp.js';
import type {
  StatsProxyManager,
  Leaderboard,
  LeaderboardOptions,
  StatsQueryOptions,
  UserStats,
  UserStatsOptions,
} from './stats.js';
import type {
  UserSearchManager,
  UserSearchOptions,
  UserSearchResult,
  ResolvedUserSearchResult,
} from './userSearch.js';
import type {
  AvatarManager,
  AvatarEntry,
  AvatarOptions,
  AvatarResolveOptions,
  ResolvedAvatar,
} from './avatar.js';
import type {
  CloudStorageManager,
  CloudStorageFile,
  CloudStorageOptions,
  CloudStorageWriteOptions,
} from './cloudstorage.js';
import type {
  MatchmakingManager,
  MatchmakingOptions,
  MatchmakingSession,
  MatchmakingTicketOptions,
  MatchmakingBanResult,
  BanCheckResult,
} from './matchmaking.js';
import type {
  PlaytimeManager,
  PlaytimeInfo,
  PlaytimeOptions,
  PlaytimeSegment,
  PlaytimeAddSecondsOptions,
} from './playtime.js';
import type {
  LibraryManager,
  LibraryItemsResponse,
  LibraryItemsOptions,
  LibraryAllItemsOptions,
  LibraryRecord,
  LibraryCollection,
  LibraryCollectionItem,
  LauncherLibraryResponse,
  LauncherLibraryItemsOptions,
  LibraryRequestOptions,
} from './library.js';
import type {
  EpicStatusManager,
  StatusOptions,
  StatusSummary,
  StatusComponent,
  StatusIncident,
  StatusMaintenance,
} from './status.js';
import type {
  AccountMetadata,
  DeviceAuth,
  EpicAccount,
  ExchangeCode,
  ExternalAuth,
  ExternalAuthAccountMatch,
  ExternalDisplayNameLookup,
  ExternalIdLookup,
  KillType,
  OAuthToken,
  VerifyResponse,
} from './types.js';

export interface EpicAuthSessionInit {
  auth: AuthManager;
  deviceAuths: DeviceAuthManager;
  accounts: AccountManager;
  mcp: MCPClient;
  party: PartyClient;
  eos: EosConnectManager;
  chat: ChatService;
  lockerService: LockerService;
  friends: FriendsManager;
  habanero: HabaneroManager;
  presence: PresenceManager;
  lightswitch: LightswitchManager;
  socialBan: SocialBanManager;
  stats: StatsProxyManager;
  game: FortniteGameManager;
  userSearch: UserSearchManager;
  avatar: AvatarManager;
  cloudStorage: CloudStorageManager;
  matchmaking: MatchmakingManager;
  playtime: PlaytimeManager;
  library: LibraryManager;
  status: EpicStatusManager;
  client: AuthClient;
  token: OAuthToken;
  allowCustomClients?: boolean;
}

const EOS_REFRESH_THRESHOLD_MS = 30_000;

const REFRESH_THRESHOLD_MS = 15_000;

function isReportableMismatch(error: unknown): boolean {
  if (!(error instanceof EpicApiError)) return false;
  return (error.errorCode ?? '').includes('is_reportable');
}

export class EpicAuthSession {
  private tokenValue: OAuthToken;
  private readonly auth: AuthManager;
  private readonly deviceAuths: DeviceAuthManager;
  private readonly accounts: AccountManager;
  private readonly mcpClient: MCPClient;
  private readonly partyClient: PartyClient;
  private readonly eos: EosConnectManager;
  private readonly chatService: ChatService;
  private readonly lockerService: LockerService;
  private readonly friendsManager: FriendsManager;
  private readonly habaneroManager: HabaneroManager;
  private readonly presenceManager: PresenceManager;
  private readonly lightswitchManager: LightswitchManager;
  private readonly socialBanManager: SocialBanManager;
  private readonly statsManager: StatsProxyManager;
  private readonly gameManager: FortniteGameManager;
  private readonly userSearchManager: UserSearchManager;
  private readonly avatarManager: AvatarManager;
  private readonly cloudStorageManager: CloudStorageManager;
  private readonly matchmakingManager: MatchmakingManager;
  private readonly playtimeManager: PlaytimeManager;
  private readonly libraryManager: LibraryManager;
  private readonly statusManager: EpicStatusManager;
  private readonly allowCustomClients: boolean;
  private eosTokenValue: EosToken | null = null;
  private easTokenValue: EasToken | null = null;
  private userEasTokenValue: EasToken | null = null;
  private androidTokenValue: OAuthToken | null = null;
  private launcherTokenValue: OAuthToken | null = null;
  private xmppClient: XmppClient | null = null;
  private chatKeypair: ChatKeypair | null = null;
  private chatKeyJwt: string | null = null;
  private readonly conversationCache = new Map<string, ConversationData>();
  private connectClient: ConnectClient | null = null;
  private liveClientValue: LiveClient | null = null;
  private customStatusValue: string | null = null;
  public readonly client: AuthClient;

  constructor(init: EpicAuthSessionInit) {
    this.auth = init.auth;
    this.deviceAuths = init.deviceAuths;
    this.accounts = init.accounts;
    this.mcpClient = init.mcp;
    this.partyClient = init.party;
    this.eos = init.eos;
    this.chatService = init.chat;
    this.lockerService = init.lockerService;
    this.friendsManager = init.friends;
    this.habaneroManager = init.habanero;
    this.presenceManager = init.presence;
    this.lightswitchManager = init.lightswitch;
    this.socialBanManager = init.socialBan;
    this.statsManager = init.stats;
    this.gameManager = init.game;
    this.userSearchManager = init.userSearch;
    this.avatarManager = init.avatar;
    this.cloudStorageManager = init.cloudStorage;
    this.matchmakingManager = init.matchmaking;
    this.playtimeManager = init.playtime;
    this.libraryManager = init.library;
    this.statusManager = init.status;
    this.allowCustomClients = init.allowCustomClients ?? false;
    this.client = init.client;
    this.tokenValue = init.token;
  }

  get token(): OAuthToken {
    return this.tokenValue;
  }

  get accessToken(): string {
    return this.tokenValue.access_token;
  }

  get refreshTokenValue(): string | null {
    return this.tokenValue.refresh_token ?? null;
  }

  get accountId(): string | null {
    return this.tokenValue.account_id ?? null;
  }

  get displayName(): string | null {
    return this.tokenValue.displayName ?? null;
  }

  get expiresAt(): Date {
    return new Date(this.tokenValue.expires_at);
  }

  get expiresInMs(): number {
    return this.expiresAt.getTime() - Date.now();
  }

  get isExpired(): boolean {
    return this.expiresInMs <= 0;
  }

  get canRefresh(): boolean {
    return typeof this.tokenValue.refresh_token === 'string';
  }

  async refresh(options?: TokenRequestOptions): Promise<OAuthToken> {
    if (!this.tokenValue.refresh_token) {
      throw new ValidationError('This session has no refresh token to renew with', 'refreshToken');
    }
    this.tokenValue = await this.auth.refreshToken(
      this.client,
      this.tokenValue.refresh_token,
      options,
    );
    return this.tokenValue;
  }

  async ensureValid(options?: TokenRequestOptions): Promise<string> {
    if (this.expiresInMs <= REFRESH_THRESHOLD_MS && this.canRefresh) {
      await this.refresh(options);
    }
    return this.accessToken;
  }

  verify(options?: { includePerms?: boolean; signal?: AbortSignal }): Promise<VerifyResponse> {
    return this.auth.verify(this.accessToken, options);
  }

  createExchangeCode(options?: ExchangeCodeOptions): Promise<ExchangeCode> {
    return this.auth.createExchangeCode(this.accessToken, options);
  }

  async switchClient(
    toClient: AuthClientInput,
    options?: TokenRequestOptions & { codeChallenge?: string; codeChallengeMethod?: 'S256' | 'plain' },
  ): Promise<EpicAuthSession> {
    if (isCustomClientInput(toClient) && !this.allowCustomClients) {
      throw new ConfigurationError(
        'Custom auth clients are disabled. Construct the EpicGamesClient with `allowCustomClients: true` ' +
          'to switch to a custom { clientId, clientSecret }.',
        'allowCustomClients',
      );
    }
    const target = resolveAuthClient(toClient);
    const exchange = await this.auth.createExchangeCode(this.accessToken, {
      consumingClientId: target.clientId,
      ...(options?.codeChallenge ? { codeChallenge: options.codeChallenge } : {}),
      ...(options?.codeChallengeMethod ? { codeChallengeMethod: options.codeChallengeMethod } : {}),
      ...(options?.signal ? { signal: options.signal } : {}),
      ...(options?.timeout !== undefined ? { timeout: options.timeout } : {}),
    });
    const token = await this.auth.exchangeCode(target, exchange.code, options);
    return new EpicAuthSession({
      auth: this.auth,
      deviceAuths: this.deviceAuths,
      accounts: this.accounts,
      mcp: this.mcpClient,
      party: this.partyClient,
      eos: this.eos,
      chat: this.chatService,
      lockerService: this.lockerService,
      friends: this.friendsManager,
      habanero: this.habaneroManager,
      presence: this.presenceManager,
      lightswitch: this.lightswitchManager,
      socialBan: this.socialBanManager,
      stats: this.statsManager,
      game: this.gameManager,
      userSearch: this.userSearchManager,
      avatar: this.avatarManager,
      cloudStorage: this.cloudStorageManager,
      matchmaking: this.matchmakingManager,
      playtime: this.playtimeManager,
      library: this.libraryManager,
      status: this.statusManager,
      client: target,
      token,
      allowCustomClients: this.allowCustomClients,
    });
  }

  async eosToken(options?: EosTokenOptions): Promise<EosToken> {
    if (this.eosTokenValue) {
      const expiresInMs = new Date(this.eosTokenValue.expires_at).getTime() - Date.now();
      if (expiresInMs > EOS_REFRESH_THRESHOLD_MS) return this.eosTokenValue;
    }
    const token = await this.ensureValid();
    this.eosTokenValue = await this.eos.token(this.client, token, options);
    return this.eosTokenValue;
  }

  async lockerItems(options?: EosTokenOptions): Promise<LockerItemsResponse> {
    const accountId = this.requireAccountId();
    const eos = await this.eosToken(options);
    return this.lockerService.items(eos.access_token, accountId, options);
  }

  async easToken(options?: EosTokenOptions): Promise<EasToken> {
    if (this.easTokenValue?.expires_at) {
      const expiresInMs = new Date(this.easTokenValue.expires_at).getTime() - Date.now();
      if (expiresInMs > EOS_REFRESH_THRESHOLD_MS) return this.easTokenValue;
    }
    this.easTokenValue = await this.eos.easToken(
      this.client,
      options?.signal ? { signal: options.signal } : {},
    );
    return this.easTokenValue;
  }

  async eosAccounts(accountIds: string[], options?: EosTokenOptions): Promise<EosIdAccount[]> {
    const eas = await this.easToken(options);
    return this.eos.queryAccounts(eas.access_token, accountIds, options);
  }

  async eosProductUsers(productUserIds: string[], options?: EosTokenOptions): Promise<EosProductUserMapping[]> {
    const eos = await this.eosToken(options);
    return this.eos.queryProductUsers(eos.access_token, productUserIds, options);
  }

  async getParty(): Promise<Party> {
    const accountId = this.requireAccountId();
    const token = await this.ensureValid();
    const parties = await this.partyClient.userParties(token, accountId);
    const current = parties.current?.[0];
    if (!current) {
      throw new ValidationError('You are not currently in a party', 'party');
    }
    return new Party(this.partyClient, () => this.ensureValid(), accountId, current);
  }

  async storefrontCatalog<T = StorefrontCatalog>(options?: ShopFetchOptions): Promise<T> {
    const token = await this.ensureValid();
    return this.mcpClient.storefrontCatalog<T>(token, options ?? {});
  }

  async shop(options?: ShopFetchOptions): Promise<Shop> {
    const raw = await this.storefrontCatalog<StorefrontCatalog>(options);
    return new Shop(this, raw);
  }

  gifting(): Gifting {
    return new Gifting(this);
  }

  private requireAccountId(): string {
    if (!this.tokenValue.account_id) {
      throw new ValidationError(
        'This session is not bound to an account (client_credentials grant)',
        'accountId',
      );
    }
    return this.tokenValue.account_id;
  }

  async mcpOperation<T = unknown>(
    operation: MCPOperation | (string & {}),
    options?: MCPOperationOptions,
  ): Promise<MCPResponse<T>> {
    const accountId = this.requireAccountId();
    const token = await this.ensureValid();
    return this.mcpClient.operation<T>(token, accountId, operation, options ?? {});
  }

  async queryProfile<T = unknown>(
    profileId: MCPProfileId | (string & {}) = 'common_core',
    options?: Omit<MCPOperationOptions, 'profileId'>,
  ): Promise<MCPResponse<T>> {
    const accountId = this.requireAccountId();
    const token = await this.ensureValid();
    return this.mcpClient.queryProfile<T>(token, accountId, profileId, options ?? {});
  }

  async queryPublicProfile<T = unknown>(
    accountId: string,
    profileId: MCPProfileId | (string & {}) = 'common_core',
    options?: Omit<MCPOperationOptions, 'profileId' | 'route'>,
  ): Promise<MCPResponse<T>> {
    const token = await this.ensureValid();
    return this.mcpClient.queryPublicProfile<T>(token, accountId, profileId, options ?? {});
  }

  me(options?: { signal?: AbortSignal }): Promise<EpicAccount> {
    return this.accounts.byId(this.accessToken, this.requireAccountId(), options);
  }

  account(accountId: string, options?: { signal?: AbortSignal }): Promise<EpicAccount> {
    return this.accounts.byId(this.accessToken, accountId, options);
  }

  accountsByIds(accountIds: string[], options?: { signal?: AbortSignal }): Promise<EpicAccount[]> {
    return this.accounts.byIds(this.accessToken, accountIds, options);
  }

  accountByDisplayName(displayName: string, options?: { signal?: AbortSignal }): Promise<EpicAccount> {
    return this.accounts.byDisplayName(this.accessToken, displayName, options);
  }

  externalAuths(accountId?: string, options?: { signal?: AbortSignal }): Promise<ExternalAuth[]> {
    return this.accounts.externalAuths(this.accessToken, accountId ?? this.requireAccountId(), options);
  }

  externalAuth(
    externalAuthType: string,
    accountId?: string,
    options?: { signal?: AbortSignal },
  ): Promise<ExternalAuth> {
    return this.accounts.externalAuth(
      this.accessToken,
      accountId ?? this.requireAccountId(),
      externalAuthType,
      options,
    );
  }

  accountByExternalDisplayName(
    externalAuthType: string,
    displayName: string,
    options?: { caseInsensitive?: boolean; signal?: AbortSignal },
  ): Promise<ExternalAuthAccountMatch[]> {
    return this.accounts.byExternalDisplayName(this.accessToken, externalAuthType, displayName, options);
  }

  accountsByExternalDisplayNames(
    authType: string,
    displayNames: string[],
    options?: { signal?: AbortSignal },
  ): Promise<ExternalDisplayNameLookup> {
    return this.accounts.byExternalDisplayNames(this.accessToken, authType, displayNames, options);
  }

  accountsByExternalIds(
    authType: string,
    ids: string[],
    options?: { signal?: AbortSignal },
  ): Promise<ExternalIdLookup> {
    return this.accounts.byExternalIds(this.accessToken, authType, ids, options);
  }

  accountMetadata(accountId?: string, options?: { signal?: AbortSignal }): Promise<AccountMetadata> {
    return this.accounts.metadata(this.accessToken, accountId ?? this.requireAccountId(), options);
  }

  async lastOnline(accountId?: string, options?: PresenceOptions): Promise<LastOnlineResponse> {
    const token = await this.ensureValid();
    return this.presenceManager.lastOnline(token, accountId ?? this.requireAccountId(), options);
  }

  async lastOnlineFor(accountId?: string, options?: PresenceOptions): Promise<LastOnlineEntry | null> {
    const token = await this.ensureValid();
    return this.presenceManager.lastOnlineFor(token, accountId ?? this.requireAccountId(), options);
  }

  async serviceStatus(serviceId?: string, options?: LightswitchOptions): Promise<LightswitchStatus> {
    const token = await this.ensureValid();
    return this.lightswitchManager.status(token, serviceId, options);
  }

  async serviceStatusBulk(serviceIds: string[], options?: LightswitchOptions): Promise<LightswitchStatus[]> {
    const token = await this.ensureValid();
    return this.lightswitchManager.statusBulk(token, serviceIds, options);
  }

  async socialBan(accountId?: string, options?: SocialBanOptions): Promise<SocialBanStatus> {
    const token = await this.ensureValid();
    return this.socialBanManager.status(token, accountId ?? this.requireAccountId(), options);
  }

  async userStats(accountId?: string, options?: UserStatsOptions): Promise<UserStats | null> {
    const token = await this.ensureValid();
    return this.statsManager.userStats(token, accountId ?? this.requireAccountId(), options);
  }

  async userStatsBulk(accountIds: string[], options?: StatsQueryOptions): Promise<UserStats[]> {
    const token = await this.ensureValid();
    return this.statsManager.userStatsBulk(token, accountIds, options);
  }

  async leaderboard(leaderboardName: string, options?: LeaderboardOptions): Promise<Leaderboard> {
    const token = await this.ensureValid();
    return this.statsManager.leaderboard(token, leaderboardName, options);
  }

  async timeline(options?: { signal?: AbortSignal }): Promise<Timeline> {
    const token = await this.ensureValid();
    return this.gameManager.timeline(token, options);
  }

  async brInventory(accountId?: string, options?: { signal?: AbortSignal }): Promise<BrInventory> {
    const token = await this.ensureValid();
    return this.gameManager.brInventory(token, accountId ?? this.requireAccountId(), options);
  }

  async vbucks(options?: { signal?: AbortSignal }): Promise<number> {
    const token = await this.ensureValid();
    return this.gameManager.vbucks(token, this.requireAccountId(), options);
  }

  async vbucksBalance(options?: { signal?: AbortSignal }): Promise<VbucksBalance> {
    const token = await this.ensureValid();
    return this.gameManager.vbucksBalance(token, this.requireAccountId(), options);
  }

  async mtxPlatform(options?: { signal?: AbortSignal }): Promise<string> {
    const token = await this.ensureValid();
    return this.gameManager.mtxPlatform(token, this.requireAccountId(), options);
  }

  async setMtxPlatform(
    platform: MtxPlatform | (string & {}),
    options?: { signal?: AbortSignal },
  ): Promise<CommonCoreProfile | null> {
    const token = await this.ensureValid();
    return this.gameManager.setMtxPlatform(token, this.requireAccountId(), platform, options);
  }

  async commonCore(options?: { signal?: AbortSignal }): Promise<CommonCoreProfile> {
    const token = await this.ensureValid();
    return this.gameManager.commonCore(token, this.requireAccountId(), options);
  }

  async receipts(accountId?: string, options?: { signal?: AbortSignal }): Promise<Receipt[]> {
    const token = await this.ensureValid();
    return this.gameManager.receipts(token, accountId ?? this.requireAccountId(), options);
  }

  async searchUsers(prefix: string, options?: UserSearchOptions): Promise<UserSearchResult[]> {
    const token = await this.ensureValid();
    return this.userSearchManager.search(token, this.requireAccountId(), prefix, options);
  }

  async searchUsersResolved(
    prefix: string,
    options?: UserSearchOptions,
  ): Promise<ResolvedUserSearchResult[]> {
    const token = await this.ensureValid();
    return this.userSearchManager.searchResolved(token, this.requireAccountId(), prefix, options);
  }

  friendsSummary(options?: { signal?: AbortSignal }): Promise<FriendsSummary> {
    return this.friendsManager.summary(this.accessToken, this.requireAccountId(), options);
  }

  friendsList(options?: { signal?: AbortSignal }): Promise<FriendEntry[]> {
    return this.friendsManager.list(this.accessToken, this.requireAccountId(), options);
  }

  friendsListResolved(options?: { signal?: AbortSignal }): Promise<ResolvedFriendEntry[]> {
    return this.friendsManager.listResolved(this.accessToken, this.requireAccountId(), options);
  }

  resolveFriends(entries: FriendEntry[], options?: { signal?: AbortSignal }): Promise<ResolvedFriendEntry[]> {
    return this.friendsManager.resolveEntries(this.accessToken, entries, options);
  }

  resolveAccounts(accountIds: string[], options?: { signal?: AbortSignal }): Promise<Map<string, EpicAccount>> {
    return this.accounts.resolveAccounts(this.accessToken, accountIds, options);
  }

  resolveAccountNames(accountIds: string[], options?: { signal?: AbortSignal }): Promise<Map<string, string>> {
    return this.accounts.resolveNames(this.accessToken, accountIds, options);
  }

  incomingFriendRequests(options?: { signal?: AbortSignal }): Promise<FriendEntry[]> {
    return this.friendsManager.incoming(this.accessToken, this.requireAccountId(), options);
  }

  outgoingFriendRequests(options?: { signal?: AbortSignal }): Promise<FriendEntry[]> {
    return this.friendsManager.outgoing(this.accessToken, this.requireAccountId(), options);
  }

  suggestedFriends(options?: { signal?: AbortSignal }): Promise<FriendEntry[]> {
    return this.friendsManager.suggested(this.accessToken, this.requireAccountId(), options);
  }

  acceptFriendRequests(targetIds: string[], options?: { signal?: AbortSignal }): Promise<string[]> {
    return this.friendsManager.acceptBulk(this.accessToken, this.requireAccountId(), targetIds, options);
  }

  clearFriends(options?: { signal?: AbortSignal }): Promise<void> {
    return this.friendsManager.clearAll(this.accessToken, this.requireAccountId(), options);
  }

  friend(friendId: string, options?: { signal?: AbortSignal }): Promise<FriendEntry> {
    return this.friendsManager.get(this.accessToken, this.requireAccountId(), friendId, options);
  }

  addFriend(friendId: string, options?: FriendAddOptions): Promise<void> {
    return this.friendsManager.add(this.accessToken, this.requireAccountId(), friendId, options);
  }

  removeFriend(friendId: string, options?: { signal?: AbortSignal }): Promise<void> {
    return this.friendsManager.remove(this.accessToken, this.requireAccountId(), friendId, options);
  }

  mutualFriends(friendId: string, options?: { signal?: AbortSignal }): Promise<string[]> {
    return this.friendsManager.mutual(this.accessToken, this.requireAccountId(), friendId, options);
  }

  setFriendNickname(friendId: string, nickname: string, options?: { signal?: AbortSignal }): Promise<void> {
    return this.friendsManager.setNickname(this.accessToken, this.requireAccountId(), friendId, nickname, options);
  }

  removeFriendNickname(friendId: string, options?: { signal?: AbortSignal }): Promise<void> {
    return this.friendsManager.removeNickname(this.accessToken, this.requireAccountId(), friendId, options);
  }

  setFriendNote(friendId: string, note: string, options?: { signal?: AbortSignal }): Promise<void> {
    return this.friendsManager.setNote(this.accessToken, this.requireAccountId(), friendId, note, options);
  }

  removeFriendNote(friendId: string, options?: { signal?: AbortSignal }): Promise<void> {
    return this.friendsManager.removeNote(this.accessToken, this.requireAccountId(), friendId, options);
  }

  blocklist(options?: { signal?: AbortSignal }): Promise<BlocklistEntry[]> {
    return this.friendsManager.blocklist(this.accessToken, this.requireAccountId(), options);
  }

  blockAccount(userId: string, options?: { signal?: AbortSignal }): Promise<void> {
    return this.friendsManager.block(this.accessToken, this.requireAccountId(), userId, options);
  }

  unblockAccount(userId: string, options?: { signal?: AbortSignal }): Promise<void> {
    return this.friendsManager.unblock(this.accessToken, this.requireAccountId(), userId, options);
  }

  rankedTracks(options?: HabaneroTracksOptions): Promise<HabaneroTrack[]> {
    return this.habaneroManager.tracks(this.accessToken, options);
  }

  rankedTrack(trackguid: string, options?: HabaneroBaseOptions): Promise<HabaneroTrack> {
    return this.habaneroManager.trackByGuid(this.accessToken, trackguid, options);
  }

  rankedActiveTracks(startDate: string, options?: HabaneroBaseOptions): Promise<HabaneroTrack[]> {
    return this.habaneroManager.activeTracks(this.accessToken, startDate, options);
  }

  rankedProgress(
    trackguid: string,
    accountId?: string,
    options?: HabaneroBaseOptions,
  ): Promise<HabaneroProgress> {
    return this.habaneroManager.progress(
      this.accessToken,
      accountId ?? this.requireAccountId(),
      trackguid,
      options,
    );
  }

  rankedProgressAll(accountId?: string, options?: HabaneroProgressOptions): Promise<HabaneroProgress[]> {
    return this.habaneroManager.allProgress(this.accessToken, accountId ?? this.requireAccountId(), options);
  }

  rankedProgressBulk(
    trackguid: string,
    accountIds: string[],
    options?: HabaneroBaseOptions,
  ): Promise<HabaneroProgress[]> {
    return this.habaneroManager.bulkProgress(this.accessToken, trackguid, accountIds, options);
  }

  rankedProgressBulkByType(
    rankingType: RankingType | (string & {}),
    accountIds: string[],
    options?: HabaneroRankingTypeOptions,
  ): Promise<HabaneroProgress[]> {
    return this.habaneroManager.bulkProgressByRankingType(
      this.accessToken,
      rankingType,
      accountIds,
      options,
    );
  }

  private async readCapableToken(options?: { signal?: AbortSignal }): Promise<string> {
    const target = resolveAuthClient('fortnitePC');
    const exchange = await this.auth.createExchangeCode(this.accessToken, {
      consumingClientId: target.clientId,
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    const token = await this.auth.exchangeCode(
      target,
      exchange.code,
      options?.signal ? { signal: options.signal } : undefined,
    );
    return token.access_token;
  }

  private async withDeviceAuthRead<T>(
    run: (token: string, accountId: string) => Promise<T>,
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    const accountId = this.requireAccountId();
    const token = await this.ensureValid(options);
    try {
      return await run(token, accountId);
    } catch (error) {
      if (!(error instanceof EpicPermissionError)) throw error;
      const readToken = await this.readCapableToken(options);
      return run(readToken, accountId);
    }
  }

  listDeviceAuths(options?: { signal?: AbortSignal }): Promise<DeviceAuth[]> {
    return this.withDeviceAuthRead(
      (token, accountId) => this.deviceAuths.list(token, accountId, options),
      options,
    );
  }

  createDeviceAuth(options?: { signal?: AbortSignal }): Promise<DeviceAuth> {
    return this.deviceAuths.create(this.accessToken, this.requireAccountId(), options);
  }

  getDeviceAuth(deviceId: string, options?: { signal?: AbortSignal }): Promise<DeviceAuth> {
    return this.withDeviceAuthRead(
      (token, accountId) => this.deviceAuths.get(token, accountId, deviceId, options),
      options,
    );
  }

  deleteDeviceAuth(deviceId: string, options?: { signal?: AbortSignal }): Promise<void> {
    return this.deviceAuths.delete(this.accessToken, this.requireAccountId(), deviceId, options);
  }

  killOtherSessions(options?: { signal?: AbortSignal }): Promise<void> {
    return this.auth.killSessions(this.accessToken, 'OTHERS_ACCOUNT_CLIENT_SERVICE', options);
  }

  killSessions(killType: KillType, options?: { signal?: AbortSignal }): Promise<void> {
    return this.auth.killSessions(this.accessToken, killType, options);
  }

  private async launcherToken(options?: TokenRequestOptions): Promise<string> {
    if (this.launcherTokenValue) {
      const expiresInMs = new Date(this.launcherTokenValue.expires_at).getTime() - Date.now();
      if (expiresInMs > REFRESH_THRESHOLD_MS) return this.launcherTokenValue.access_token;
      if (this.launcherTokenValue.refresh_token) {
        this.launcherTokenValue = await this.auth.refreshToken(
          resolveAuthClient('launcherApp'),
          this.launcherTokenValue.refresh_token,
          options,
        );
        return this.launcherTokenValue.access_token;
      }
    }
    const target = resolveAuthClient('launcherApp');
    const accessToken = await this.ensureValid();
    const exchange = await this.auth.createExchangeCode(accessToken, {
      consumingClientId: target.clientId,
      ...(options?.signal ? { signal: options.signal } : {}),
      ...(options?.timeout !== undefined ? { timeout: options.timeout } : {}),
    });
    this.launcherTokenValue = await this.auth.exchangeCode(target, exchange.code, options);
    return this.launcherTokenValue.access_token;
  }

  async playtime(artifactId?: string, options?: PlaytimeOptions): Promise<PlaytimeInfo> {
    const token = await this.launcherToken();
    return this.playtimeManager.get(token, this.requireAccountId(), artifactId, options);
  }

  async playtimeAll(options?: PlaytimeOptions): Promise<PlaytimeInfo[]> {
    const token = await this.launcherToken();
    return this.playtimeManager.getAll(token, this.requireAccountId(), options);
  }

  async addPlaytime(segment: PlaytimeSegment, options?: PlaytimeOptions): Promise<void> {
    const token = await this.launcherToken();
    return this.playtimeManager.add(token, this.requireAccountId(), segment, options);
  }

  async addPlaytimeSeconds(seconds: number, options?: PlaytimeAddSecondsOptions): Promise<void> {
    const token = await this.launcherToken();
    return this.playtimeManager.addSeconds(token, this.requireAccountId(), seconds, options);
  }

  async library(options?: LibraryItemsOptions): Promise<LibraryItemsResponse> {
    const token = await this.launcherToken();
    return this.libraryManager.items(token, options);
  }

  async libraryAll(options?: LibraryAllItemsOptions): Promise<LibraryRecord[]> {
    const token = await this.launcherToken();
    return this.libraryManager.allItems(token, options);
  }

  async libraryStateTokenStatus(stateToken: string, options?: LibraryRequestOptions): Promise<boolean> {
    const token = await this.launcherToken();
    return this.libraryManager.stateTokenStatus(token, stateToken, options);
  }

  async libraryCollections(options?: LibraryRequestOptions): Promise<LibraryCollection[]> {
    const token = await this.launcherToken();
    return this.libraryManager.collections(token, this.requireAccountId(), options);
  }

  async libraryCollectionItems(
    collectionId: string,
    options?: LibraryRequestOptions,
  ): Promise<LibraryCollectionItem[]> {
    const token = await this.launcherToken();
    return this.libraryManager.collectionItems(token, collectionId, this.requireAccountId(), options);
  }

  async createLibraryCollection(name: string, options?: LibraryRequestOptions): Promise<LibraryCollection> {
    const token = await this.launcherToken();
    return this.libraryManager.createCollection(token, this.requireAccountId(), name, options);
  }

  async updateLibraryCollection(
    collectionId: string,
    name: string,
    options?: LibraryRequestOptions,
  ): Promise<LibraryCollection> {
    const token = await this.launcherToken();
    return this.libraryManager.updateCollection(token, this.requireAccountId(), collectionId, name, options);
  }

  async deleteLibraryCollection(collectionId: string, options?: LibraryRequestOptions): Promise<void> {
    const token = await this.launcherToken();
    return this.libraryManager.deleteCollection(token, this.requireAccountId(), collectionId, options);
  }

  async addLibraryCollectionItem(
    collectionId: string,
    item: LibraryCollectionItem,
    options?: LibraryRequestOptions,
  ): Promise<LibraryCollection> {
    const token = await this.launcherToken();
    return this.libraryManager.addCollectionItem(token, this.requireAccountId(), collectionId, item, options);
  }

  async removeLibraryCollectionItem(
    collectionId: string,
    item: LibraryCollectionItem,
    options?: LibraryRequestOptions,
  ): Promise<LibraryCollection> {
    const token = await this.launcherToken();
    return this.libraryManager.removeCollectionItem(token, this.requireAccountId(), collectionId, item, options);
  }

  async launcherLibrary(options?: LauncherLibraryItemsOptions): Promise<LauncherLibraryResponse> {
    const token = await this.launcherToken();
    return this.libraryManager.launcherItems(token, options);
  }

  async avatars(accountIds: readonly string[], options?: AvatarOptions): Promise<AvatarEntry[]> {
    const token = await this.ensureValid();
    return this.avatarManager.get(token, accountIds, options);
  }

  async avatar(accountId?: string, options?: AvatarOptions): Promise<AvatarEntry | null> {
    const token = await this.ensureValid();
    return this.avatarManager.getFor(token, accountId ?? this.requireAccountId(), options);
  }

  async resolveAvatars(
    accountIds: readonly string[],
    options?: AvatarResolveOptions,
  ): Promise<ResolvedAvatar[]> {
    const token = await this.ensureValid();
    return this.avatarManager.resolve(token, accountIds, options);
  }

  async resolveAvatar(
    accountId?: string,
    options?: AvatarResolveOptions,
  ): Promise<ResolvedAvatar | null> {
    const token = await this.ensureValid();
    return this.avatarManager.resolveFor(token, accountId ?? this.requireAccountId(), options);
  }

  async cloudStorageFiles(options?: CloudStorageOptions): Promise<CloudStorageFile[]> {
    const token = await this.ensureValid();
    return this.cloudStorageManager.listUser(token, this.requireAccountId(), options);
  }

  async readCloudStorage(filename: string, options?: CloudStorageOptions): Promise<Uint8Array> {
    const token = await this.ensureValid();
    return this.cloudStorageManager.readUser(token, this.requireAccountId(), filename, options);
  }

  async readCloudStorageText(filename: string, options?: CloudStorageOptions): Promise<string> {
    const token = await this.ensureValid();
    return this.cloudStorageManager.readUserText(token, this.requireAccountId(), filename, options);
  }

  async writeCloudStorage(
    filename: string,
    data: string | Uint8Array,
    options?: CloudStorageWriteOptions,
  ): Promise<void> {
    const token = await this.ensureValid();
    return this.cloudStorageManager.writeUser(token, this.requireAccountId(), filename, data, options);
  }

  async deleteCloudStorage(filename: string, options?: CloudStorageOptions): Promise<void> {
    const token = await this.ensureValid();
    return this.cloudStorageManager.deleteUser(token, this.requireAccountId(), filename, options);
  }

  async systemCloudStorageFiles(options?: CloudStorageOptions): Promise<CloudStorageFile[]> {
    const token = await this.ensureValid();
    return this.cloudStorageManager.listSystem(token, options);
  }

  async readSystemCloudStorage(filename: string, options?: CloudStorageOptions): Promise<Uint8Array> {
    const token = await this.ensureValid();
    return this.cloudStorageManager.readSystem(token, filename, options);
  }

  async readSystemCloudStorageText(filename: string, options?: CloudStorageOptions): Promise<string> {
    const token = await this.ensureValid();
    return this.cloudStorageManager.readSystemText(token, filename, options);
  }

  async matchmakingNetCL(options?: MatchmakingOptions): Promise<string> {
    const token = await this.ensureValid();
    return this.matchmakingManager.netCL(token, options);
  }

  async matchmakingBan(options?: MatchmakingTicketOptions): Promise<MatchmakingBanResult> {
    const token = await this.ensureValid();
    return this.matchmakingManager.ticketBan(token, this.requireAccountId(), options);
  }

  async sessionInfo(options?: MatchmakingOptions): Promise<MatchmakingSession[]> {
    const token = await this.ensureValid();
    return this.matchmakingManager.sessionInfo(token, this.requireAccountId(), options);
  }

  async checkBan(options?: MatchmakingTicketOptions): Promise<BanCheckResult> {
    const token = await this.ensureValid();
    const accountId = this.requireAccountId();
    const signalOptions = options?.signal ? { signal: options.signal } : undefined;
    const [lightswitch, matchmaking, socialBan] = await Promise.all([
      this.lightswitchManager.status(token, undefined, signalOptions),
      this.matchmakingManager.ticketBan(token, accountId, options),
      this.socialBanManager.status(token, accountId, signalOptions),
    ]);
    const permanent = lightswitch.banned === true;
    const temporary = matchmaking.banned;
    const social = socialBan.active;
    return {
      banned: permanent || temporary || social,
      permanent,
      temporary,
      social,
      banDaysRemaining: matchmaking.banDaysRemaining,
      matchmaking,
      socialBan,
    };
  }

  statusSummary(options?: StatusOptions): Promise<StatusSummary> {
    return this.statusManager.summary(options);
  }

  statusComponents(options?: StatusOptions): Promise<StatusComponent[]> {
    return this.statusManager.components(options);
  }

  statusIncidents(options?: StatusOptions): Promise<StatusIncident[]> {
    return this.statusManager.unresolvedIncidents(options);
  }

  statusMaintenances(options?: StatusOptions): Promise<StatusMaintenance[]> {
    return this.statusManager.activeMaintenances(options);
  }

  private async androidToken(options?: TokenRequestOptions): Promise<OAuthToken> {
    if (this.androidTokenValue) {
      const expiresInMs = new Date(this.androidTokenValue.expires_at).getTime() - Date.now();
      if (expiresInMs > REFRESH_THRESHOLD_MS) return this.androidTokenValue;
      if (this.androidTokenValue.refresh_token) {
        try {
          this.androidTokenValue = await this.auth.refreshToken(
            resolveAuthClient('fortniteAndroid'),
            this.androidTokenValue.refresh_token,
            options,
          );
          return this.androidTokenValue;
        } catch {
          this.androidTokenValue = null;
        }
      }
    }
    const target = resolveAuthClient('fortniteAndroid');
    const accessToken = await this.ensureValid();
    const exchange = await this.auth.createExchangeCode(accessToken, {
      consumingClientId: target.clientId,
      ...(options?.signal ? { signal: options.signal } : {}),
      ...(options?.timeout !== undefined ? { timeout: options.timeout } : {}),
    });
    this.androidTokenValue = await this.auth.exchangeCode(target, exchange.code, options);
    return this.androidTokenValue;
  }

  private async userEasToken(options?: { signal?: AbortSignal }): Promise<EasToken> {
    if (this.userEasTokenValue?.expires_at) {
      const expiresInMs = new Date(this.userEasTokenValue.expires_at).getTime() - Date.now();
      if (expiresInMs > EOS_REFRESH_THRESHOLD_MS) return this.userEasTokenValue;
    }
    const android = resolveAuthClient('fortniteAndroid');
    const signalOptions = options?.signal ? { signal: options.signal } : {};
    if (this.userEasTokenValue?.refresh_token) {
      try {
        this.userEasTokenValue = await this.eos.easRefreshGrant(
          android,
          this.userEasTokenValue.refresh_token,
          signalOptions,
        );
        return this.userEasTokenValue;
      } catch {
        this.userEasTokenValue = null;
      }
    }
    const androidToken = await this.androidToken();
    if (!androidToken.refresh_token) {
      throw new ConfigurationError(
        'The Android auth token did not include a refresh token to mint an EAS user token with.',
        'chat',
      );
    }
    this.userEasTokenValue = await this.eos.easRefreshGrant(android, androidToken.refresh_token, signalOptions);
    return this.userEasTokenValue;
  }

  private async ensureChatKey(): Promise<{ keypair: ChatKeypair; jwt: string }> {
    if (this.chatKeypair && this.chatKeyJwt) {
      return { keypair: this.chatKeypair, jwt: this.chatKeyJwt };
    }
    const keypair = this.chatKeypair ?? (await generateChatKeypair());
    this.chatKeypair = keypair;
    const gameToken = await this.ensureValid();
    const registered = await this.chatService.registerPublicKey(gameToken, keypair.publicKeyB64);
    const jwt = typeof registered.jwt === 'string' ? registered.jwt : null;
    if (!jwt) {
      throw new ConfigurationError('The public key registration did not return a signing JWT.', 'chat');
    }
    this.chatKeyJwt = jwt;
    return { keypair, jwt };
  }

  private async conversation(targetAccountId: string): Promise<ConversationData> {
    const cached = this.conversationCache.get(targetAccountId);
    if (cached) return cached;
    const me = this.requireAccountId();
    const eas = await this.userEasToken();
    const conversation = await this.chatService.getConversation(eas.access_token, me, targetAccountId);
    this.conversationCache.set(targetAccountId, conversation);
    return conversation;
  }

  async sendDM(targetAccountId: string, content: string): Promise<ChatSendResult> {
    if (typeof targetAccountId !== 'string' || targetAccountId.trim().length === 0) {
      throw new ValidationError('sendDM requires a target accountId.', 'targetAccountId');
    }
    if (typeof content !== 'string' || content.length === 0) {
      throw new ValidationError('sendDM requires a non-empty message.', 'content');
    }
    if (content.length >= CHAT_MAX_MESSAGE_LENGTH) {
      throw new ValidationError(
        `A chat message must be shorter than ${CHAT_MAX_MESSAGE_LENGTH} characters.`,
        'content',
      );
    }
    const me = this.requireAccountId();
    const { keypair, jwt } = await this.ensureChatKey();
    const conversation = await this.conversation(targetAccountId);
    const eas = await this.userEasToken();
    const signed = await buildSignedMessage(keypair, {
      accountId: me,
      conversationId: conversation.conversationId,
      content,
      type: 'Persistent',
      sequence: 0,
    });
    const metadata = {
      TmV: '2',
      Pub: jwt,
      Sig: signed.sig,
      PlfNm: CHAT_DEFAULT_PLATFORM,
      PlfId: me,
    };
    const payload: Record<string, unknown> = {
      allowedRecipients: [targetAccountId, me],
      message: { body: signed.body },
      isReportable: conversation.isReportable,
      metadata,
    };
    try {
      return await this.chatService.postDMMessage(eas.access_token, me, conversation.conversationId, payload);
    } catch (error) {
      if (isReportableMismatch(error)) {
        const retry: Record<string, unknown> = {
          allowedRecipients: [targetAccountId, me],
          message: { body: signed.body },
          metadata,
        };
        return this.chatService.postDMMessage(eas.access_token, me, conversation.conversationId, retry);
      }
      throw error;
    }
  }

  async sendPartyMessage(content: string): Promise<ChatSendResult> {
    if (typeof content !== 'string' || content.length === 0) {
      throw new ValidationError('sendPartyMessage requires a non-empty message.', 'content');
    }
    if (content.length >= CHAT_MAX_MESSAGE_LENGTH) {
      throw new ValidationError(
        `A chat message must be shorter than ${CHAT_MAX_MESSAGE_LENGTH} characters.`,
        'content',
      );
    }
    const me = this.requireAccountId();
    const party = await this.getParty();
    const recipients = party.members
      .map((member) => member.accountId)
      .filter((accountId) => accountId !== me);
    if (recipients.length === 0) {
      throw new ValidationError('There is no one else in your party to message.', 'party');
    }
    const { keypair, jwt } = await this.ensureChatKey();
    const eas = await this.userEasToken();
    const signed = await buildSignedMessage(keypair, {
      accountId: me,
      conversationId: party.id,
      content,
      type: 'Party',
    });
    const payload: Record<string, unknown> = {
      allowedRecipients: recipients,
      message: { body: signed.body },
      isReportable: false,
      metadata: {
        TmV: '2',
        NPM: '1',
        Pub: jwt,
        Sig: signed.sig,
        PlfNm: CHAT_DEFAULT_PLATFORM,
        PlfId: me,
      },
    };
    return this.chatService.postPartyMessage(eas.access_token, me, party.id, payload);
  }

  async chatHistory(
    targetAccountId: string,
    options?: { limit?: number; signal?: AbortSignal },
  ): Promise<ChatMessage[]> {
    const me = this.requireAccountId();
    const conversation = await this.conversation(targetAccountId);
    const eas = await this.userEasToken();
    const messages = await this.chatService.previousMessages(
      eas.access_token,
      me,
      conversation.conversationId,
      options,
    );
    return messages.map((message) =>
      typeof message.body === 'string' ? { ...message, body: decodeMessageBody(message.body) } : message,
    );
  }

  get events(): ConnectClient | null {
    return this.connectClient;
  }

  async connectEvents(
    options?: Partial<Omit<ConnectClientOptions, 'accountId' | 'getAccessToken'>>,
  ): Promise<ConnectClient> {
    const accountId = this.requireAccountId();
    if (this.connectClient && this.connectClient.connected) {
      return this.connectClient;
    }
    if (!this.connectClient) {
      this.connectClient = new ConnectClient({
        ...options,
        accountId,
        getAccessToken: async () => (await this.userEasToken()).access_token,
        onConnected: async (connectionId) => {
          const eas = await this.userEasToken();
          await this.chatService.sendPresence(eas.access_token, accountId, connectionId, {
            ...(this.customStatusValue !== null ? { activity: this.customStatusValue } : {}),
          });
        },
      });
    }
    await this.connectClient.connect();
    return this.connectClient;
  }

  async disconnectEvents(): Promise<void> {
    if (!this.connectClient) return;
    await this.connectClient.disconnect();
    this.connectClient = null;
  }

  async setCustomStatus(
    status: string,
    options?: { onlineType?: string; signal?: AbortSignal },
  ): Promise<void> {
    if (typeof status !== 'string' || status.trim().length === 0) {
      throw new ValidationError('"status" is required and must be a non-empty string', 'status');
    }
    const accountId = this.requireAccountId();
    this.customStatusValue = status;
    await this.connectEvents();
    const connectionId = this.connectClient?.connection;
    if (!connectionId) {
      throw new ConfigurationError('The connect session did not provide a connection id for presence.', 'connect');
    }
    const eas = await this.userEasToken(options?.signal ? { signal: options.signal } : {});
    await this.chatService.sendPresence(eas.access_token, accountId, connectionId, {
      activity: status,
      ...(options?.onlineType ? { onlineType: options.onlineType } : {}),
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  }

  async clearCustomStatus(options?: { signal?: AbortSignal }): Promise<void> {
    this.customStatusValue = null;
    const connectionId = this.connectClient?.connection;
    if (!connectionId) return;
    const accountId = this.requireAccountId();
    const eas = await this.userEasToken(options?.signal ? { signal: options.signal } : {});
    await this.chatService.sendPresence(eas.access_token, accountId, connectionId, {
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  }

  get xmpp(): XmppClient | null {
    return this.xmppClient;
  }

  async connectXmpp(
    options?: Partial<Omit<XmppClientOptions, 'accountId' | 'getAccessToken'>>,
  ): Promise<XmppClient> {
    const accountId = this.requireAccountId();
    if (this.xmppClient && this.xmppClient.connected) {
      return this.xmppClient;
    }
    if (!this.xmppClient) {
      this.xmppClient = new XmppClient({
        accountId,
        getAccessToken: () => this.ensureValid(),
        ...options,
      });
    }
    await this.xmppClient.connect();
    return this.xmppClient;
  }

  async disconnectXmpp(): Promise<void> {
    if (!this.xmppClient) return;
    await this.xmppClient.disconnect();
    this.xmppClient = null;
  }

  async friendPresences(): Promise<FriendPresence[]> {
    const client = await this.connectXmpp();
    return [...client.presences.values()];
  }

  get liveClient(): LiveClient | null {
    return this.liveClientValue;
  }

  async live(options?: LiveClientOptions): Promise<LiveClient> {
    if (this.liveClientValue) return this.liveClientValue;
    const client = new LiveClient(this, this.partyClient, options ?? {});
    await client.start();
    this.liveClientValue = client;
    return client;
  }

  async disconnectLive(): Promise<void> {
    if (!this.liveClientValue) return;
    this.liveClientValue.removeAllListeners();
    this.liveClientValue = null;
    await this.disconnectXmpp();
    await this.disconnectEvents();
  }

  async logout(options?: { signal?: AbortSignal }): Promise<void> {
    this.liveClientValue?.removeAllListeners();
    this.liveClientValue = null;
    await this.disconnectXmpp();
    await this.disconnectEvents();
    return this.auth.killSession(this.accessToken, options);
  }
}
