export {
  AuthClients,
  ALL_AUTH_CLIENTS,
  findAuthClient,
  resolveAuthClient,
} from './clients.js';
export type { AuthClient, AuthClientName, AuthClientInput } from './clients.js';

export { EPIC_ERROR_DESCRIPTIONS, describeEpicError } from './errorCodes.js';

export {
  EpicRestClient,
  EPIC_ACCOUNT_SERVICE,
  basicAuthHeader,
} from './rest.js';
export type { EpicRestOptions, EpicRequestOptions, EpicResponse } from './rest.js';

export {
  EpicApiError,
  EpicAuthError,
  EpicPermissionError,
  EpicNotFoundError,
  EpicRateLimitError,
  createEpicError,
} from './errors.js';
export type { EpicApiErrorContext } from './errors.js';

export { AuthManager } from './auth.js';
export type {
  TokenRequestOptions,
  ExchangeCodeOptions,
  DeviceCodePollOptions,
  DeviceCodePendingInfo,
} from './auth.js';

export { DeviceCodeFlow } from './deviceCode.js';

export {
  MCPClient,
  MCP_OPERATIONS,
  MCP_OPERATIONS_SOURCE_URL,
  MCP_BASE_URL,
  STOREFRONT_CATALOG_PATH,
  MCPProfile,
  MCPRoute,
  isMCPOperation,
  knownMCPOperations,
  refreshMCPOperations,
} from './mcp.js';
export type {
  MCPOperation,
  MCPOperationOptions,
  MCPClientOptions,
  MCPProfileId,
  MCPRouteName,
  MCPResponse,
  RefreshMCPOperationsOptions,
} from './mcp.js';

export {
  EosConnectManager,
  LockerService,
  EOS_AUTH_BASE_URL,
  LOCKER_BASE_URL,
  FN_LIVE_DEPLOYMENT_ID,
} from './eos.js';
export type {
  EosToken,
  EasToken,
  EosTokenOptions,
  EosIdAccount,
  EosProductUserMapping,
  LockerItemsResponse,
  LockerActiveLoadoutGroup,
  LockerSchemaLoadout,
  LockerLoadoutSlot,
  LockerItemCustomization,
} from './eos.js';

export {
  PartyClient,
  Party,
  PartyMember,
  PARTY_BASE_URL,
  PARTY_BUILD_ID,
  PARTY_DEFAULT_PLATFORM,
  ReadyState,
  JamPart,
  SidekickAnim,
  PartyPrivacy,
  PARTY_PRIVACY_LIST,
  isPartyPrivacy,
  buildPrivacyPatch,
} from './party.js';
export type {
  ReadyStateValue,
  JamPartValue,
  SidekickAnimValue,
  PartyPrivacyPreset,
  PartyPrivacyValue,
  PartyConfig,
  PartyIdentity,
  PrivacyPatch,
  FakeCosmeticLoadout,
  FakeOutfitStyle,
  FakeInstruments,
  PartyMemberBanner,
  PartyMemberBattlePass,
  PartyMemberMatchInfo,
  MetaPatch,
  RawParty,
  RawPartyMember,
  UserParties,
} from './party.js';

export { LiveClient } from './live.js';
export type {
  LiveClientOptions,
  LiveEventMap,
  FriendRequestEvent,
  FriendAddedEvent,
  FriendRemovedEvent,
  PartyInviteEvent,
  PartyMemberEvent,
  PartyJoinRequestEvent,
  PartyUpdatedEvent,
  PartyInviteDeclinedEvent,
} from './live.js';

export {
  Shop,
  ShopEntry,
  Gifting,
  GIFT_CURRENCY,
  GIFT_GAME_CONTEXT,
  GIFT_DEFAULT_CURRENCY_SUBTYPE,
} from './shop.js';
export type {
  ShopPrice,
  ShopItem,
  ShopFetchOptions,
  GiftTarget,
  GiftOptions,
  GiftResult,
  StorefrontCatalog,
  RawCatalogEntry,
  RawCatalogPrice,
  RawStorefront,
  RawGiftInfo,
  RawItemGrant,
  RawMetaInfo,
} from './shop.js';

export { AccountManager, DeviceAuthManager } from './account.js';

export { FriendsManager, FRIENDS_BASE_URL } from './friends.js';
export type {
  FriendEntry,
  ResolvedFriendEntry,
  BlocklistEntry,
  FriendSettings,
  FriendsLimitsReached,
  FriendsSummary,
  FriendAddOptions,
} from './friends.js';

export {
  HabaneroManager,
  HABANERO_BASE_URL,
  HABANERO_NAMESPACE,
  HABANERO_MAX_BULK_ACCOUNTS,
  RankingType,
  RANKING_TYPES,
  isRankingType,
} from './habanero.js';
export type {
  HabaneroTrack,
  HabaneroProgress,
  HabaneroBaseOptions,
  HabaneroTracksOptions,
  HabaneroProgressOptions,
  HabaneroRankingTypeOptions,
} from './habanero.js';

export { PresenceManager, PRESENCE_BASE_URL, PRESENCE_NAMESPACE } from './presence.js';
export type {
  FriendPresenceRow,
  LastOnlineEntry,
  LastOnlineResponse,
  PresenceCircle,
  PresenceOptions,
} from './presence.js';

export {
  LightswitchManager,
  LIGHTSWITCH_BASE_URL,
  LIGHTSWITCH_BULK_BASE_URL,
  LIGHTSWITCH_SERVICE_ID,
} from './lightswitch.js';
export type {
  LightswitchStatus,
  LightswitchLauncherInfo,
  LightswitchOptions,
} from './lightswitch.js';

export { SocialBanManager, SOCIAL_BAN_BASE_URL } from './socialBan.js';
export type { SocialBanStatus, SocialBanEntry, SocialBanOptions } from './socialBan.js';

export {
  StatsProxyManager,
  STATS_PROXY_BASE_URL,
  STATS_APP_ID,
  STATS_MAX_TIMESTAMP,
  StatsCategory,
} from './stats.js';
export type {
  UserStats,
  Leaderboard,
  LeaderboardEntry,
  UserStatsOptions,
  StatsQueryOptions,
  LeaderboardOptions,
} from './stats.js';

export {
  FortniteGameManager,
  MtxPlatform,
  MTX_PLATFORM_LIST,
  MTX_CURRENCY_PREFIX,
  isMtxPlatform,
} from './game.js';
export type {
  Timeline,
  TimelineChannel,
  TimelineChannelState,
  BrInventory,
  Receipt,
  CommonCoreProfile,
  CommonCoreItem,
  VbucksEntry,
  VbucksBalance,
} from './game.js';

export {
  UserSearchManager,
  UserSearchPlatform,
  USER_SEARCH_BASE_URL,
  USER_SEARCH_PLATFORM_LIST,
  isUserSearchPlatform,
} from './userSearch.js';
export type {
  UserSearchResult,
  UserSearchMatch,
  UserSearchMatchType,
  ResolvedUserSearchResult,
  UserSearchOptions,
} from './userSearch.js';

export {
  AvatarManager,
  AVATAR_BASE_URL,
  AVATAR_ICON_BASE_URL,
  FNCC_AVATAR_ICON_BASE_URL,
  AVATAR_CHARACTER_NAMESPACE,
  AvatarIconSize,
  AVATAR_ICON_SIZE_LIST,
  isAvatarIconSize,
  AvatarImageSource,
  AVATAR_IMAGE_SOURCE_LIST,
  DEFAULT_AVATAR_IMAGE_SOURCE,
  isAvatarImageSource,
  extractCharacterId,
  buildIconUrl,
  buildIconUrls,
} from './avatar.js';
export type {
  AvatarEntry,
  ResolvedAvatar,
  AvatarOptions,
  AvatarResolveOptions,
  AvatarManagerOptions,
  AvatarImageResolver,
} from './avatar.js';

export { CloudStorageManager, CLOUDSTORAGE_CONTENT_TYPE } from './cloudstorage.js';
export type {
  CloudStorageFile,
  CloudStorageOptions,
  CloudStorageWriteOptions,
} from './cloudstorage.js';

export {
  MatchmakingManager,
  buildBucketId,
  buildUserAgent,
  MATCHMAKING_USER_AGENT_BUILD,
  MATCHMAKING_USER_AGENT_PLATFORM,
  MATCHMAKING_DEFAULT_HOTFIX_VERSION,
  MATCHMAKING_DEFAULT_REGION,
  MATCHMAKING_DEFAULT_PLAYLIST,
  MATCHMAKING_DEFAULT_PLATFORM,
  MATCHMAKING_BAN_ERROR_CODE,
} from './matchmaking.js';
export type {
  MatchmakingBanResult,
  BanCheckResult,
  MatchmakingSession,
  MatchmakingSessionAttributes,
  MatchmakingRequestAttributes,
  MatchmakingRequestEntry,
  BucketIdParts,
  MatchmakingOptions,
  MatchmakingTicketOptions,
} from './matchmaking.js';

export {
  PlaytimeManager,
  PLAYTIME_BASE_URL,
  PLAYTIME_ARTIFACT_ID,
  PLAYTIME_MACHINE_ID,
} from './playtime.js';
export type {
  PlaytimeInfo,
  PlaytimeOptions,
  PlaytimeSegment,
  PlaytimeAddSecondsOptions,
} from './playtime.js';

export {
  LibraryManager,
  LIBRARY_BASE_URL,
  LAUNCHER_LIBRARY_BASE_URL,
  buildLibraryCursor,
} from './library.js';
export type {
  LibraryRecord,
  LibraryResponseMetadata,
  LibraryItemsResponse,
  LibraryItemsOptions,
  LibraryAllItemsOptions,
  LibraryCollection,
  LibraryCollectionItem,
  LibraryCollectionItemsResponse,
  LibraryStateTokenStatus,
  LauncherLibraryRecord,
  LauncherLibraryResponse,
  LauncherLibraryItemsOptions,
  LibraryRequestOptions,
} from './library.js';

export {
  EpicStatusManager,
  STATUS_BASE_URL,
  STATUS_FORTNITE_PATTERN,
} from './status.js';
export type {
  StatusIndicator,
  ComponentStatus,
  IncidentImpact,
  IncidentStatus,
  MaintenanceStatus,
  StatusPage,
  StatusSummaryStatus,
  StatusComponent,
  StatusIncidentUpdate,
  StatusAffectedComponent,
  StatusIncident,
  StatusMaintenance,
  StatusSummary,
  StatusResponse,
  StatusComponentsResponse,
  StatusIncidentsResponse,
  StatusMaintenancesResponse,
  StatusOptions,
} from './status.js';

export {
  XmppClient,
  XMPP_WEBSOCKET_URL,
  XMPP_DOMAIN,
  XMPP_SUBPROTOCOL,
  XMPP_DEFAULT_APP,
  XMPP_DEFAULT_PLATFORM,
  PRESENCE_OFFLINE_PERSIST_STAMP,
} from './xmpp.js';
export type {
  PresenceShow,
  AwayStatus,
  XmppState,
  FortniteStatus,
  FriendPresence,
  XmppMessage,
  SetStatusInput,
  CustomStatusOptions,
  WebSocketLike,
  WebSocketFactory,
  XmppClientOptions,
  XmppEventMap,
} from './xmpp.js';

export {
  parseStanza,
  parseStanzas,
  buildStanza,
  escapeXml,
  unescapeXml,
  findChild,
  findChildren,
  localName,
} from './xml.js';
export type { XmlNode, StanzaInput } from './xml.js';

export {
  ChatService,
  generateChatKeypair,
  buildSignedMessage,
  buildPresencePayload,
  decodeMessageBody,
  CHAT_BASE_URL,
  PUBLIC_KEY_BASE_URL,
  CHAT_DEFAULT_PLATFORM,
  CHAT_DEFAULT_BUILD,
  CHAT_MAX_MESSAGE_LENGTH,
} from './chat.js';
export type {
  ChatKeypair,
  RegisteredKey,
  ConversationData,
  ChatMessage,
  ChatSendResult,
  SignedMessageInput,
  SignedMessage,
  ChatPresenceOptions,
} from './chat.js';

export {
  ConnectClient,
  CONNECT_WEBSOCKET_URL,
  CONNECT_SUBPROTOCOL,
  CONNECT_SEC_PROTOCOLS,
  normalizeConnectPresence,
  decodeEosProps,
} from './connect.js';
export type {
  ConnectState,
  ConnectSocketOptions,
  ConnectWebSocketFactory,
  ConnectFrame,
  ConnectFriendMessage,
  ConnectPartyMessage,
  ConnectPresenceUpdate,
  ConnectClientOptions,
  ConnectEventMap,
} from './connect.js';

export { EpicAuthSession } from './session.js';
export type { EpicAuthSessionInit } from './session.js';

export { EpicGamesClient } from './client.js';
export type { EpicClientOptions } from './client.js';

export {
  ECOSYSTEM_BASE_URL,
  EcosystemRoutes,
  EcosystemEndpoint,
  EcosystemInterval,
  ECOSYSTEM_INTERVALS,
  isEcosystemInterval,
  IslandMetric,
  ISLAND_METRICS,
  isIslandMetric,
  EcosystemMetric,
  ECOSYSTEM_METRICS,
  isEcosystemMetric,
} from './ecosystem.js';
export type {
  EcosystemDate,
  EcosystemBaseOptions,
  EcosystemPageOptions,
  EcosystemRangeOptions,
  EcosystemIslandMetricsOptions,
  EcosystemMetricsOptions,
  EcosystemGenreRankingOptions,
  EcosystemIslandSummary,
  EcosystemCursorMeta,
  EcosystemPaginatedIsland,
  EcosystemPaginationLinks,
  EcosystemPageCursors,
  EcosystemPaginationMeta,
  EcosystemIslandsResponse,
  EcosystemMetricValue,
  EcosystemMetricSeries,
  EcosystemMetricResponse,
  EcosystemRetentionValue,
  EcosystemRetentionResponse,
  EcosystemIslandMetricsResponse,
  EcosystemFilterableIslandMetricsResponse,
  EcosystemMetricsResponse,
  EcosystemFilterableMetricsResponse,
  EcosystemGenre,
  EcosystemGenreListResponse,
  EcosystemGenreRankingMeta,
  EcosystemGenreRankingItem,
  EcosystemGenreRankingResponse,
  EcosystemIslandRankingGenre,
  EcosystemIslandRankingSnapshot,
  EcosystemIslandRankingResponse,
  EcosystemErrorResponse,
} from './ecosystem.js';

export type * from './types.js';
