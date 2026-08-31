import { ConfigurationError } from '../core/errors.js';
import { RestClient } from '../fortnite/rest.js';
import { AccountManager, DeviceAuthManager } from './account.js';
import { AuthManager, type DeviceCodePollOptions, type TokenRequestOptions } from './auth.js';
import {
  AuthClients,
  isCustomClientInput,
  resolveAuthClient,
  type AuthClient,
  type AuthClientInput,
  type AuthClientName,
} from './clients.js';
import { DeviceCodeFlow } from './deviceCode.js';
import { ChatService, PUBLIC_KEY_BASE_URL } from './chat.js';
import { ECOSYSTEM_BASE_URL, EcosystemEndpoint } from './ecosystem.js';
import { EOS_AUTH_BASE_URL, EosConnectManager, LOCKER_BASE_URL, LockerService } from './eos.js';
import { FriendsManager, FRIENDS_BASE_URL } from './friends.js';
import { FortniteGameManager } from './game.js';
import { HABANERO_BASE_URL, HabaneroManager } from './habanero.js';
import {
  LIGHTSWITCH_BASE_URL,
  LIGHTSWITCH_BULK_BASE_URL,
  LightswitchManager,
} from './lightswitch.js';
import { SOCIAL_BAN_BASE_URL, SocialBanManager } from './socialBan.js';
import { MCP_BASE_URL, MCPClient } from './mcp.js';
import { PARTY_BASE_URL, PartyClient } from './party.js';
import { PRESENCE_BASE_URL, PresenceManager } from './presence.js';
import { STATS_PROXY_BASE_URL, StatsProxyManager } from './stats.js';
import { USER_SEARCH_BASE_URL, UserSearchManager } from './userSearch.js';
import { AVATAR_BASE_URL, AvatarManager } from './avatar.js';
import type { AvatarImageResolver } from './avatar.js';
import { CloudStorageManager } from './cloudstorage.js';
import { MatchmakingManager } from './matchmaking.js';
import { PLAYTIME_BASE_URL, PlaytimeManager } from './playtime.js';
import { LAUNCHER_LIBRARY_BASE_URL, LIBRARY_BASE_URL, LibraryManager } from './library.js';
import { STATUS_BASE_URL, EpicStatusManager } from './status.js';
import { EpicRestClient, type EpicRestOptions } from './rest.js';
import { EpicAuthSession } from './session.js';
import type { DeviceAuthCredentials, OAuthToken } from './types.js';

const DEVICE_CODE_CLIENT: AuthClientName = 'fortniteNewSwitch';

export { resolveAuthClient };
export type { AuthClientInput };

export interface EpicClientOptions extends EpicRestOptions {
  defaultClient?: AuthClientInput;
  allowCustomClients?: boolean;
  allowCustomMcpOperations?: boolean;
  avatarImageResolver?: AvatarImageResolver;
}

export class EpicGamesClient {
  public readonly rest: EpicRestClient;
  public readonly mcpRest: EpicRestClient;
  public readonly partyRest: EpicRestClient;
  public readonly eosRest: EpicRestClient;
  public readonly publicKeyRest: EpicRestClient;
  public readonly lockerRest: EpicRestClient;
  public readonly friendsRest: EpicRestClient;
  public readonly habaneroRest: EpicRestClient;
  public readonly presenceRest: EpicRestClient;
  public readonly lightswitchRest: EpicRestClient;
  public readonly lightswitchBulkRest: EpicRestClient;
  public readonly socialBanRest: EpicRestClient;
  public readonly statsRest: EpicRestClient;
  public readonly userSearchRest: EpicRestClient;
  public readonly ecosystemRest: RestClient;
  public readonly avatarRest: EpicRestClient;
  public readonly playtimeRest: EpicRestClient;
  public readonly libraryRest: EpicRestClient;
  public readonly launcherLibraryRest: EpicRestClient;
  public readonly statusRest: EpicRestClient;
  public readonly auth: AuthManager;
  public readonly deviceAuths: DeviceAuthManager;
  public readonly accounts: AccountManager;
  public readonly mcp: MCPClient;
  public readonly party: PartyClient;
  public readonly eos: EosConnectManager;
  public readonly chat: ChatService;
  public readonly lockerService: LockerService;
  public readonly friends: FriendsManager;
  public readonly habanero: HabaneroManager;
  public readonly presence: PresenceManager;
  public readonly lightswitch: LightswitchManager;
  public readonly socialBan: SocialBanManager;
  public readonly stats: StatsProxyManager;
  public readonly game: FortniteGameManager;
  public readonly userSearch: UserSearchManager;
  public readonly ecosystem: EcosystemEndpoint;
  public readonly avatar: AvatarManager;
  public readonly cloudStorage: CloudStorageManager;
  public readonly matchmaking: MatchmakingManager;
  public readonly playtime: PlaytimeManager;
  public readonly library: LibraryManager;
  public readonly status: EpicStatusManager;

  private readonly defaultClient: AuthClient;
  private readonly allowCustomClients: boolean;

  constructor(options: EpicClientOptions = {}) {
    const {
      defaultClient,
      allowCustomClients,
      allowCustomMcpOperations,
      avatarImageResolver,
      ...restOptions
    } = options;
    this.allowCustomClients = allowCustomClients ?? false;
    this.rest = new EpicRestClient(restOptions);
    this.mcpRest = new EpicRestClient({ ...restOptions, baseUrl: MCP_BASE_URL });
    this.partyRest = new EpicRestClient({ ...restOptions, baseUrl: PARTY_BASE_URL });
    this.eosRest = new EpicRestClient({ ...restOptions, baseUrl: EOS_AUTH_BASE_URL });
    this.publicKeyRest = new EpicRestClient({ ...restOptions, baseUrl: PUBLIC_KEY_BASE_URL });
    this.lockerRest = new EpicRestClient({ ...restOptions, baseUrl: LOCKER_BASE_URL });
    this.friendsRest = new EpicRestClient({ ...restOptions, baseUrl: FRIENDS_BASE_URL });
    this.habaneroRest = new EpicRestClient({ ...restOptions, baseUrl: HABANERO_BASE_URL });
    this.presenceRest = new EpicRestClient({ ...restOptions, baseUrl: PRESENCE_BASE_URL });
    this.lightswitchRest = new EpicRestClient({ ...restOptions, baseUrl: LIGHTSWITCH_BASE_URL });
    this.lightswitchBulkRest = new EpicRestClient({ ...restOptions, baseUrl: LIGHTSWITCH_BULK_BASE_URL });
    this.socialBanRest = new EpicRestClient({ ...restOptions, baseUrl: SOCIAL_BAN_BASE_URL });
    this.statsRest = new EpicRestClient({ ...restOptions, baseUrl: STATS_PROXY_BASE_URL });
    this.userSearchRest = new EpicRestClient({ ...restOptions, baseUrl: USER_SEARCH_BASE_URL });
    this.avatarRest = new EpicRestClient({ ...restOptions, baseUrl: AVATAR_BASE_URL });
    this.playtimeRest = new EpicRestClient({ ...restOptions, baseUrl: PLAYTIME_BASE_URL });
    this.libraryRest = new EpicRestClient({ ...restOptions, baseUrl: LIBRARY_BASE_URL });
    this.launcherLibraryRest = new EpicRestClient({ ...restOptions, baseUrl: LAUNCHER_LIBRARY_BASE_URL });
    this.statusRest = new EpicRestClient({ ...restOptions, baseUrl: STATUS_BASE_URL });
    this.ecosystemRest = new RestClient({
      baseUrl: ECOSYSTEM_BASE_URL,
      timeout: restOptions.timeout,
      retry: restOptions.retry,
      userAgent: restOptions.userAgent,
      fetch: restOptions.fetch,
      headers: restOptions.headers,
    });
    this.auth = new AuthManager(this.rest);
    this.deviceAuths = new DeviceAuthManager(this.rest);
    this.accounts = new AccountManager(this.rest);
    this.mcp = new MCPClient(this.mcpRest, { allowCustomOperations: allowCustomMcpOperations ?? false });
    this.party = new PartyClient(this.partyRest);
    this.eos = new EosConnectManager(this.eosRest);
    this.chat = new ChatService(this.eosRest, this.publicKeyRest);
    this.lockerService = new LockerService(this.lockerRest);
    this.friends = new FriendsManager(this.friendsRest, this.accounts);
    this.habanero = new HabaneroManager(this.habaneroRest);
    this.presence = new PresenceManager(this.presenceRest);
    this.lightswitch = new LightswitchManager(this.lightswitchRest, this.lightswitchBulkRest);
    this.socialBan = new SocialBanManager(this.socialBanRest);
    this.stats = new StatsProxyManager(this.statsRest);
    this.game = new FortniteGameManager(this.mcpRest, this.mcp);
    this.userSearch = new UserSearchManager(this.userSearchRest, this.accounts);
    this.ecosystem = new EcosystemEndpoint(this.ecosystemRest);
    this.avatar = new AvatarManager(
      this.avatarRest,
      avatarImageResolver ? { imageResolver: avatarImageResolver } : undefined,
    );
    this.cloudStorage = new CloudStorageManager(this.mcpRest);
    this.matchmaking = new MatchmakingManager(this.mcpRest);
    this.playtime = new PlaytimeManager(this.playtimeRest);
    this.library = new LibraryManager(this.libraryRest, this.launcherLibraryRest);
    this.status = new EpicStatusManager(this.statusRest);
    this.defaultClient = resolveAuthClient(defaultClient ?? AuthClients.fortniteAndroid);
  }

  client(input?: AuthClientInput): AuthClient {
    if (input === undefined) return this.defaultClient;
    if (isCustomClientInput(input) && !this.allowCustomClients) {
      throw new ConfigurationError(
        'Custom auth clients are disabled. Pass `allowCustomClients: true` to the EpicGamesClient ' +
          'constructor to use a custom { clientId, clientSecret }.',
        'allowCustomClients',
      );
    }
    return resolveAuthClient(input);
  }

  session(token: OAuthToken, client?: AuthClientInput): EpicAuthSession {
    return new EpicAuthSession({
      auth: this.auth,
      deviceAuths: this.deviceAuths,
      accounts: this.accounts,
      mcp: this.mcp,
      party: this.party,
      eos: this.eos,
      chat: this.chat,
      lockerService: this.lockerService,
      friends: this.friends,
      habanero: this.habanero,
      presence: this.presence,
      lightswitch: this.lightswitch,
      socialBan: this.socialBan,
      stats: this.stats,
      game: this.game,
      userSearch: this.userSearch,
      avatar: this.avatar,
      cloudStorage: this.cloudStorage,
      matchmaking: this.matchmaking,
      playtime: this.playtime,
      library: this.library,
      status: this.status,
      client: this.client(client),
      token,
      allowCustomClients: this.allowCustomClients,
    });
  }

  async login(
    grant: (auth: AuthManager, client: AuthClient) => Promise<OAuthToken>,
    client?: AuthClientInput,
  ): Promise<EpicAuthSession> {
    const resolved = this.client(client);
    const token = await grant(this.auth, resolved);
    return this.session(token, resolved);
  }

  async loginWithDeviceAuth(
    credentials: DeviceAuthCredentials,
    options?: { client?: AuthClientInput } & TokenRequestOptions,
  ): Promise<EpicAuthSession> {
    const { client, ...tokenOptions } = options ?? {};
    return this.login((auth, resolved) => auth.deviceAuth(resolved, credentials, tokenOptions), client);
  }

  async loginWithExchangeCode(
    code: string,
    options?: { client?: AuthClientInput; codeVerifier?: string } & TokenRequestOptions,
  ): Promise<EpicAuthSession> {
    const { client, ...tokenOptions } = options ?? {};
    return this.login((auth, resolved) => auth.exchangeCode(resolved, code, tokenOptions), client);
  }

  async loginWithAuthorizationCode(
    code: string,
    options?: { client?: AuthClientInput; codeVerifier?: string } & TokenRequestOptions,
  ): Promise<EpicAuthSession> {
    const { client, ...tokenOptions } = options ?? {};
    return this.login((auth, resolved) => auth.authorizationCode(resolved, code, tokenOptions), client);
  }

  async loginWithRefreshToken(
    refreshToken: string,
    options?: { client?: AuthClientInput } & TokenRequestOptions,
  ): Promise<EpicAuthSession> {
    const { client, ...tokenOptions } = options ?? {};
    return this.login((auth, resolved) => auth.refreshToken(resolved, refreshToken, tokenOptions), client);
  }

  async loginClientCredentials(
    options?: { client?: AuthClientInput } & TokenRequestOptions,
  ): Promise<EpicAuthSession> {
    const { client, ...tokenOptions } = options ?? {};
    return this.login((auth, resolved) => auth.clientCredentials(resolved, tokenOptions), client);
  }

  async loginWithExternalAuth(
    externalAuthType: string,
    externalAuthToken: string,
    options?: { client?: AuthClientInput } & TokenRequestOptions,
  ): Promise<EpicAuthSession> {
    const { client, ...tokenOptions } = options ?? {};
    return this.login(
      (auth, resolved) => auth.externalAuth(resolved, externalAuthType, externalAuthToken, tokenOptions),
      client,
    );
  }

  async loginWithTokenToToken(
    accessToken: string,
    options?: { client?: AuthClientInput } & TokenRequestOptions,
  ): Promise<EpicAuthSession> {
    const { client, ...tokenOptions } = options ?? {};
    return this.login((auth, resolved) => auth.tokenToToken(resolved, accessToken, tokenOptions), client);
  }

  async changeClient(
    accessToken: string,
    toClient: AuthClientInput,
    options?: TokenRequestOptions & { codeChallenge?: string; codeChallengeMethod?: 'S256' | 'plain' },
  ): Promise<EpicAuthSession> {
    const target = this.client(toClient);
    const exchange = await this.auth.createExchangeCode(accessToken, {
      consumingClientId: target.clientId,
      ...(options?.codeChallenge ? { codeChallenge: options.codeChallenge } : {}),
      ...(options?.codeChallengeMethod ? { codeChallengeMethod: options.codeChallengeMethod } : {}),
      ...(options?.signal ? { signal: options.signal } : {}),
      ...(options?.timeout !== undefined ? { timeout: options.timeout } : {}),
    });
    const token = await this.auth.exchangeCode(target, exchange.code, options);
    return this.session(token, target);
  }

  async startDeviceCode(options?: { client?: AuthClientInput }): Promise<DeviceCodeFlow> {
    const client = this.client(options?.client ?? DEVICE_CODE_CLIENT);
    const appToken = await this.auth.clientCredentials(client);
    const deviceCode = await this.auth.createDeviceCode(appToken.access_token);
    return new DeviceCodeFlow(this.auth, (token) => this.session(token, client), client, deviceCode);
  }

  async loginWithDeviceCode(
    options?: {
      client?: AuthClientInput;
      onPrompt?: (flow: DeviceCodeFlow) => void | Promise<void>;
    } & DeviceCodePollOptions,
  ): Promise<EpicAuthSession> {
    const { client, onPrompt, ...pollOptions } = options ?? {};
    const flow = await this.startDeviceCode({ client });
    if (onPrompt) await onPrompt(flow);
    return flow.poll(pollOptions);
  }
}
