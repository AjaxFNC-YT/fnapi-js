import { ValidationError } from '../core/errors.js';
import type { ConnectClientOptions, ConnectFriendMessage, ConnectPartyMessage, ConnectPresenceUpdate } from './connect.js';
import { TypedEmitter, type Listener } from './emitter.js';
import type { ResolvedFriendEntry } from './friends.js';
import {
  decodeNotification,
  type DecodedNotification,
  type FriendDirection,
  type FriendRemoveReason,
  type RawNotification,
} from './notifications.js';
import {
  Party,
  PARTY_BUILD_ID,
  PARTY_DEFAULT_PLATFORM,
  type PartyClient,
  type PartyConfig,
  type PartyIdentity,
  type RawParty,
} from './party.js';
import type { EpicAuthSession } from './session.js';
import type { XmppClientOptions, XmppMessage } from './xmpp.js';

export interface FriendRequestEvent {
  accountId: string;
  displayName?: string;
  direction: FriendDirection;
  favorite: boolean;
  created: string | null;
  accept(): Promise<void>;
  decline(): Promise<void>;
  raw: RawNotification;
}

export interface FriendAddedEvent {
  accountId: string;
  entry: ResolvedFriendEntry;
  raw: RawNotification;
}

export interface FriendRemovedEvent {
  accountId: string;
  reason: FriendRemoveReason;
  raw: RawNotification;
}

export interface PartyInviteEvent {
  fromId: string;
  accept(): Promise<Party | null>;
  decline(): Promise<void>;
  raw: RawNotification;
}

export interface PartyMemberEvent {
  partyId: string;
  accountId: string;
  party: Party | null;
  raw: RawNotification;
}

export interface PartyJoinRequestEvent {
  partyId: string;
  requesterId: string;
  confirm(): Promise<void>;
  reject(): Promise<void>;
  raw: RawNotification;
}

export interface PartyUpdatedEvent {
  partyId: string;
  party: Party | null;
  raw: RawNotification;
}

export interface PartyInviteDeclinedEvent {
  accountId: string;
  raw: RawNotification;
}

export interface LiveEventMap {
  connected: void;
  disconnected: { code: number; reason: string };
  reconnecting: { attempt: number; delay: number };
  reconnected: void;
  error: Error;
  notification: DecodedNotification;
  'party:invite': PartyInviteEvent;
  'party:invite:declined': PartyInviteDeclinedEvent;
  'party:join:request': PartyJoinRequestEvent;
  'party:member:joined': PartyMemberEvent;
  'party:member:left': PartyMemberEvent;
  'party:member:expired': PartyMemberEvent;
  'party:member:kicked': PartyMemberEvent;
  'party:member:connected': PartyMemberEvent;
  'party:member:disconnected': PartyMemberEvent;
  'party:member:updated': PartyMemberEvent;
  'party:member:promoted': PartyMemberEvent;
  'party:member:confirmation': PartyMemberEvent;
  'party:updated': PartyUpdatedEvent;
  'party:disbanded': { partyId: string };
  'friend:request': FriendRequestEvent;
  'friend:added': FriendAddedEvent;
  'friend:removed': FriendRemovedEvent;
  'friend:message': ConnectFriendMessage;
  'party:message': ConnectPartyMessage;
  presence: ConnectPresenceUpdate;
}

export interface LiveClientOptions {
  xmpp?: Partial<Omit<XmppClientOptions, 'accountId' | 'getAccessToken'>>;
  connect?: Partial<Omit<ConnectClientOptions, 'accountId' | 'getAccessToken'>>;
  connectEvents?: boolean;
  seedParty?: boolean;
  seedFriends?: boolean;
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeParties(data: unknown): RawParty[] {
  if (Array.isArray(data)) return data as RawParty[];
  if (data && typeof data === 'object') {
    const record = data as { current?: unknown; parties?: unknown };
    if (Array.isArray(record.current)) return record.current as RawParty[];
    if (Array.isArray(record.parties)) return record.parties as RawParty[];
  }
  return [];
}

export class LiveClient extends TypedEmitter<LiveEventMap> {
  private readonly session: EpicAuthSession;
  private readonly partyClient: PartyClient;
  private readonly options: LiveClientOptions;
  private currentParty: Party | null = null;
  private readonly friendCache = new Map<string, ResolvedFriendEntry>();
  private readonly invites = new Map<string, PartyInviteEvent>();
  private readonly requests = new Map<string, FriendRequestEvent>();
  private started = false;
  private readonly detachers: Array<() => void> = [];

  constructor(session: EpicAuthSession, partyClient: PartyClient, options: LiveClientOptions = {}) {
    super();
    this.session = session;
    this.partyClient = partyClient;
    this.options = options;
  }

  get party(): Party | null {
    return this.currentParty;
  }

  get friends(): ReadonlyMap<string, ResolvedFriendEntry> {
    return this.friendCache;
  }

  get pendingInvites(): ReadonlyMap<string, PartyInviteEvent> {
    return this.invites;
  }

  get incomingRequests(): ReadonlyMap<string, FriendRequestEvent> {
    return this.requests;
  }

  get running(): boolean {
    return this.started;
  }

  async start(): Promise<this> {
    if (this.started) return this;
    this.started = true;
    try {
      const xmpp = await this.session.connectXmpp(this.options.xmpp);
      this.bind(xmpp, 'message', (message) => {
        void this.onXmppMessage(message);
      });
      this.bind(xmpp, 'disconnected', (payload) => this.emit('disconnected', payload));
      this.bind(xmpp, 'reconnecting', (payload) => this.emit('reconnecting', payload));
      this.bind(xmpp, 'connected', () => {
        void this.resync();
      });
      this.bind(xmpp, 'error', (error) => this.emit('error', error));

      if (this.options.connectEvents !== false) {
        try {
          const events = await this.session.connectEvents(this.options.connect);
          this.bind(events, 'friend:message', (message) => this.emit('friend:message', message));
          this.bind(events, 'party:message', (message) => this.emit('party:message', message));
          this.bind(events, 'presence', (presence) => this.emit('presence', presence));
          this.bind(events, 'error', (error) => this.emit('error', error));
        } catch (error) {
          this.emit('error', error instanceof Error ? error : new Error(String(error)));
        }
      }

      await this.seed();
    } catch (error) {
      this.detach();
      this.started = false;
      throw error;
    }
    this.emit('connected', undefined);
    return this;
  }

  stop(): void {
    this.detach();
    this.started = false;
    this.currentParty = null;
    this.friendCache.clear();
    this.invites.clear();
    this.requests.clear();
  }

  private bind<M extends { error: Error }, K extends keyof M>(
    emitter: TypedEmitter<M>,
    event: K,
    listener: Listener<M[K]>,
  ): void {
    emitter.on(event, listener);
    this.detachers.push(() => emitter.off(event, listener));
  }

  private detach(): void {
    for (const detach of this.detachers.splice(0)) detach();
  }

  private async resync(): Promise<void> {
    await this.seed();
    this.emit('reconnected', undefined);
  }

  async refreshParty(): Promise<Party | null> {
    try {
      this.currentParty = await this.session.getParty();
    } catch {
      this.currentParty = null;
    }
    return this.currentParty;
  }

  async refreshFriends(): Promise<ReadonlyMap<string, ResolvedFriendEntry>> {
    const resolved = await this.session.friendsListResolved();
    this.friendCache.clear();
    for (const entry of resolved) this.friendCache.set(entry.accountId, entry);
    return this.friendCache;
  }

  async createParty(config: PartyConfig = {}): Promise<Party> {
    const token = await this.session.ensureValid();
    const raw = await this.partyClient.create(token, this.identity(), config);
    this.currentParty = new Party(this.partyClient, () => this.session.ensureValid(), this.requireAccountId(), raw);
    return this.currentParty;
  }

  async leaveParty(): Promise<void> {
    if (!this.currentParty) return;
    await this.currentParty.leave();
    this.currentParty = null;
  }

  async joinParty(partyId: string): Promise<Party | null> {
    const token = await this.session.ensureValid();
    await this.partyClient.joinById(token, partyId, this.identity());
    await this.syncParty(partyId);
    return this.currentParty;
  }

  async joinFriend(accountId: string): Promise<Party | null> {
    const partyId = this.presenceJoinPartyId(accountId);
    if (!partyId) {
      throw new ValidationError(`No joinable party is present in ${accountId}'s presence`, 'accountId');
    }
    return this.joinParty(partyId);
  }

  async acceptInvite(invite: PartyInviteEvent | string): Promise<Party | null> {
    const fromId = typeof invite === 'string' ? invite : invite.fromId;
    const target = await this.invitedParty(fromId);
    if (!target) {
      throw new ValidationError(`No pending invite was found from ${fromId}`, 'fromId');
    }
    const joined = await this.joinParty(target.id);
    this.invites.delete(fromId);
    return joined;
  }

  async declineInvite(invite: PartyInviteEvent | string): Promise<void> {
    const fromId = typeof invite === 'string' ? invite : invite.fromId;
    const target = await this.invitedParty(fromId);
    const token = await this.session.ensureValid();
    if (target) {
      await this.partyClient.declineInvite(token, target.id, this.requireAccountId());
    }
    this.invites.delete(fromId);
  }

  private async seed(): Promise<void> {
    if (this.options.seedFriends !== false) {
      try {
        await this.refreshFriends();
      } catch {
        this.friendCache.clear();
      }
    }
    if (this.options.seedParty !== false) {
      await this.refreshParty();
    }
  }

  private async onXmppMessage(message: XmppMessage): Promise<void> {
    const decoded = decodeNotification(message.body);
    if (!decoded) return;
    this.emit('notification', decoded);
    await this.dispatch(decoded);
  }

  private async dispatch(decoded: DecodedNotification): Promise<void> {
    switch (decoded.kind) {
      case 'party:invite': {
        const event = this.makeInviteEvent(decoded.fromId, decoded.raw);
        this.invites.set(decoded.fromId, event);
        this.emit('party:invite', event);
        return;
      }
      case 'party:invite:declined': {
        this.emit('party:invite:declined', { accountId: decoded.accountId, raw: decoded.raw });
        return;
      }
      case 'party:join:request': {
        this.emit('party:join:request', this.makeJoinRequestEvent(decoded.partyId, decoded.requesterId, decoded.raw));
        return;
      }
      case 'party:member:joined':
      case 'party:member:expired':
      case 'party:member:connected':
      case 'party:member:disconnected':
      case 'party:member:updated':
      case 'party:member:promoted':
      case 'party:member:confirmation': {
        await this.syncParty(decoded.partyId);
        this.emit(decoded.kind, {
          partyId: decoded.partyId,
          accountId: decoded.accountId,
          party: this.currentParty,
          raw: decoded.raw,
        });
        return;
      }
      case 'party:member:left':
      case 'party:member:kicked': {
        const selfAffected = decoded.accountId === this.session.accountId;
        await this.syncParty(decoded.partyId);
        this.emit(decoded.kind, {
          partyId: decoded.partyId,
          accountId: decoded.accountId,
          party: this.currentParty,
          raw: decoded.raw,
        });
        if (selfAffected) {
          this.currentParty = null;
          this.emit('party:disbanded', { partyId: decoded.partyId });
        }
        return;
      }
      case 'party:updated': {
        await this.syncParty(decoded.partyId);
        this.emit('party:updated', { partyId: decoded.partyId, party: this.currentParty, raw: decoded.raw });
        return;
      }
      case 'friend:request': {
        const event = this.makeFriendRequestEvent(decoded.accountId, decoded.direction, decoded.favorite, decoded.created, decoded.raw);
        if (decoded.direction === 'INBOUND') this.requests.set(decoded.accountId, event);
        this.emit('friend:request', event);
        return;
      }
      case 'friend:added': {
        this.requests.delete(decoded.accountId);
        const entry: ResolvedFriendEntry = {
          accountId: decoded.accountId,
          favorite: decoded.favorite,
          ...(decoded.created ? { created: decoded.created } : {}),
        };
        await this.resolveFriendEntry(entry);
        this.friendCache.set(decoded.accountId, entry);
        this.emit('friend:added', { accountId: decoded.accountId, entry, raw: decoded.raw });
        return;
      }
      case 'friend:removed': {
        const accountId = decoded.to === this.session.accountId ? decoded.from : decoded.to;
        this.friendCache.delete(accountId);
        this.requests.delete(accountId);
        this.emit('friend:removed', { accountId, reason: decoded.reason, raw: decoded.raw });
        return;
      }
      default:
        return;
    }
  }

  private makeInviteEvent(fromId: string, raw: RawNotification): PartyInviteEvent {
    return {
      fromId,
      raw,
      accept: () => this.acceptInvite(fromId),
      decline: () => this.declineInvite(fromId),
    };
  }

  private makeJoinRequestEvent(partyId: string, requesterId: string, raw: RawNotification): PartyJoinRequestEvent {
    return {
      partyId,
      requesterId,
      raw,
      confirm: async () => {
        const token = await this.session.ensureValid();
        await this.partyClient.confirmMember(token, partyId, requesterId);
      },
      reject: async () => {
        const token = await this.session.ensureValid();
        await this.partyClient.rejectMember(token, partyId, requesterId);
      },
    };
  }

  private makeFriendRequestEvent(
    accountId: string,
    direction: FriendDirection,
    favorite: boolean,
    created: string | null,
    raw: RawNotification,
  ): FriendRequestEvent {
    return {
      accountId,
      direction,
      favorite,
      created,
      raw,
      accept: async () => {
        await this.session.acceptFriendRequests([accountId]);
      },
      decline: async () => {
        await this.session.removeFriend(accountId);
      },
    };
  }

  private async resolveFriendEntry(entry: ResolvedFriendEntry): Promise<void> {
    try {
      const account = await this.session.account(entry.accountId);
      entry.account = account;
      if (account.displayName) entry.displayName = account.displayName;
    } catch {
      // display name stays unresolved
    }
  }

  private async syncParty(partyId: string): Promise<void> {
    try {
      if (this.currentParty && this.currentParty.id === partyId) {
        await this.currentParty.refresh();
        if (!this.currentParty.me) this.currentParty = null;
        return;
      }
      const party = await this.session.getParty();
      if (party.id === partyId) this.currentParty = party;
    } catch {
      if (this.currentParty?.id === partyId) this.currentParty = null;
    }
  }

  private async invitedParty(fromId: string): Promise<RawParty | null> {
    const token = await this.session.ensureValid();
    const data = await this.partyClient.pings(token, this.requireAccountId(), fromId);
    return normalizeParties(data)[0] ?? null;
  }

  private presenceJoinPartyId(accountId: string): string | null {
    const presence = this.session.xmpp?.getPresence(accountId);
    const properties = presence?.status?.Properties;
    if (!properties) return null;
    for (const [key, value] of Object.entries(properties)) {
      if (!/party\.joininfodata/i.test(key)) continue;
      const info = typeof value === 'string' ? safeParse(value) : value;
      if (info && typeof info === 'object') {
        const partyId = (info as Record<string, unknown>).partyId;
        if (typeof partyId === 'string' && partyId.length > 0) return partyId;
      }
    }
    return null;
  }

  private identity(): PartyIdentity {
    const accountId = this.requireAccountId();
    const connectionId = this.session.xmpp?.jid;
    const displayName = this.session.displayName;
    if (!connectionId) {
      throw new ValidationError('XMPP must be connected before joining or creating a party', 'connectionId');
    }
    if (!displayName) {
      throw new ValidationError('This session has no display name to present to the party', 'displayName');
    }
    return {
      accountId,
      connectionId,
      displayName,
      platform: PARTY_DEFAULT_PLATFORM,
      buildId: PARTY_BUILD_ID,
    };
  }

  private requireAccountId(): string {
    const accountId = this.session.accountId;
    if (!accountId) {
      throw new ValidationError('This session is not bound to an account', 'accountId');
    }
    return accountId;
  }
}
