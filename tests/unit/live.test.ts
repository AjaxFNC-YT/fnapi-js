import { describe, expect, it, vi } from 'vitest';
import { LiveClient } from '../../src/epic/live.js';
import {
  decodeNotification,
  FRIEND_NOTIFICATION_TYPE,
  FRIENDSHIP_REMOVE_TYPE,
  PARTY_NOTIFICATION_PREFIX,
} from '../../src/epic/notifications.js';
import type { PartyClient } from '../../src/epic/party.js';
import type { EpicAuthSession } from '../../src/epic/session.js';

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

class FakeChannel {
  private readonly listeners = new Map<string, Set<(payload: unknown) => void>>();

  on(event: string, listener: (payload: unknown) => void): this {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return this;
  }

  fire(event: string, payload?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(payload);
  }
}

function partyLike(id: string) {
  return { id, me: { accountId: 'ACC' }, refresh: vi.fn().mockResolvedValue(undefined) };
}

function setup(overrides: Partial<Record<string, unknown>> = {}) {
  const xmpp = new FakeChannel();
  const events = new FakeChannel();
  const partyClient = {
    create: vi.fn(),
    joinById: vi.fn().mockResolvedValue(undefined),
    confirmMember: vi.fn().mockResolvedValue(undefined),
    rejectMember: vi.fn().mockResolvedValue(undefined),
    declineInvite: vi.fn().mockResolvedValue(undefined),
    pings: vi.fn().mockResolvedValue({ current: [{ id: 'party-invited' }] }),
  } as unknown as PartyClient;

  const session = {
    accountId: 'ACC',
    displayName: 'Me',
    connectXmpp: vi.fn().mockResolvedValue(xmpp),
    connectEvents: vi.fn().mockResolvedValue(events),
    friendsListResolved: vi.fn().mockResolvedValue([]),
    getParty: vi.fn().mockResolvedValue(partyLike('party-9')),
    acceptFriendRequests: vi.fn().mockResolvedValue(['REQ']),
    removeFriend: vi.fn().mockResolvedValue(undefined),
    ensureValid: vi.fn().mockResolvedValue('AT'),
    xmpp: { jid: 'jid-1', getPresence: vi.fn() },
    ...overrides,
  } as unknown as EpicAuthSession;

  const bot = new LiveClient(session, partyClient);
  return { bot, xmpp, events, session, partyClient };
}

function partyNotification(event: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ type: `${PARTY_NOTIFICATION_PREFIX}${event}`, party_id: 'party-9', ...extra });
}

describe('decodeNotification', () => {
  it('decodes an incoming friend request', () => {
    const decoded = decodeNotification(
      JSON.stringify({
        type: FRIEND_NOTIFICATION_TYPE,
        payload: { status: 'PENDING', direction: 'INBOUND', accountId: 'REQ', created: '2026-08-22T00:00:00.000Z' },
      }),
    );
    expect(decoded).toMatchObject({ kind: 'friend:request', accountId: 'REQ', direction: 'INBOUND' });
  });

  it('decodes an accepted friend as friend:added', () => {
    const decoded = decodeNotification(
      JSON.stringify({ type: FRIEND_NOTIFICATION_TYPE, payload: { status: 'ACCEPTED', accountId: 'PAL' } }),
    );
    expect(decoded).toMatchObject({ kind: 'friend:added', accountId: 'PAL' });
  });

  it('decodes a friendship removal with its reason', () => {
    const decoded = decodeNotification(
      JSON.stringify({ type: FRIENDSHIP_REMOVE_TYPE, from: 'ACC', to: 'GONE', reason: 'DELETED' }),
    );
    expect(decoded).toMatchObject({ kind: 'friend:removed', from: 'ACC', to: 'GONE', reason: 'DELETED' });
  });

  it('decodes party invites from PING and INITIAL_INVITE', () => {
    expect(decodeNotification(partyNotification('PING', { pinger_id: 'FRIEND' }))).toMatchObject({
      kind: 'party:invite',
      fromId: 'FRIEND',
    });
    expect(decodeNotification(partyNotification('INITIAL_INVITE', { inviter_id: 'FRIEND2' }))).toMatchObject({
      kind: 'party:invite',
      fromId: 'FRIEND2',
    });
  });

  it('decodes member and party lifecycle notifications', () => {
    expect(decodeNotification(partyNotification('MEMBER_JOINED', { account_id: 'X' }))).toMatchObject({
      kind: 'party:member:joined',
      accountId: 'X',
    });
    expect(decodeNotification(partyNotification('MEMBER_NEW_CAPTAIN', { account_id: 'X' }))).toMatchObject({
      kind: 'party:member:promoted',
    });
    expect(decodeNotification(partyNotification('INITIAL_INTENTION', { requester_id: 'R' }))).toMatchObject({
      kind: 'party:join:request',
      requesterId: 'R',
    });
    expect(decodeNotification(partyNotification('PARTY_UPDATED'))).toMatchObject({ kind: 'party:updated' });
    expect(decodeNotification(partyNotification('INVITE_DECLINED', { invitee_id: 'D' }))).toMatchObject({
      kind: 'party:invite:declined',
      accountId: 'D',
    });
  });

  it('returns an unknown descriptor for unrecognised types and null for garbage', () => {
    expect(decodeNotification(JSON.stringify({ type: 'com.example.mystery' }))).toMatchObject({ kind: 'unknown' });
    expect(decodeNotification('not json')).toBeNull();
    expect(decodeNotification(JSON.stringify({ nope: true }))).toBeNull();
  });
});

describe('LiveClient dispatch', () => {
  it('wires XMPP and connect channels on start', async () => {
    const { bot, session } = setup();
    await bot.start();
    expect(session.connectXmpp).toHaveBeenCalledTimes(1);
    expect(session.connectEvents).toHaveBeenCalledTimes(1);
    expect(bot.party?.id).toBe('party-9');
  });

  it('emits a friend:request event whose accept() accepts the request', async () => {
    const { bot, xmpp, session } = setup();
    await bot.start();

    const seen = vi.fn();
    bot.on('friend:request', seen);
    xmpp.fire('message', {
      body: JSON.stringify({
        type: FRIEND_NOTIFICATION_TYPE,
        payload: { status: 'PENDING', direction: 'INBOUND', accountId: 'REQ' },
      }),
    });
    await flush();

    expect(seen).toHaveBeenCalledTimes(1);
    const event = seen.mock.calls[0]![0];
    expect(event.accountId).toBe('REQ');
    expect(bot.incomingRequests.has('REQ')).toBe(true);

    await event.accept();
    expect(session.acceptFriendRequests).toHaveBeenCalledWith(['REQ']);

    await event.decline();
    expect(session.removeFriend).toHaveBeenCalledWith('REQ');
  });

  it('adds and removes friends from the live cache', async () => {
    const { bot, xmpp } = setup();
    await bot.start();

    xmpp.fire('message', {
      body: JSON.stringify({ type: FRIEND_NOTIFICATION_TYPE, payload: { status: 'ACCEPTED', accountId: 'PAL' } }),
    });
    await flush();
    expect(bot.friends.has('PAL')).toBe(true);

    xmpp.fire('message', {
      body: JSON.stringify({ type: FRIENDSHIP_REMOVE_TYPE, from: 'PAL', to: 'ACC', reason: 'DELETED' }),
    });
    await flush();
    expect(bot.friends.has('PAL')).toBe(false);
  });

  it('emits a party:invite whose accept() joins and decline() declines', async () => {
    const { bot, xmpp, partyClient } = setup();
    await bot.start();

    const invites: unknown[] = [];
    bot.on('party:invite', (event) => invites.push(event));
    xmpp.fire('message', { body: partyNotification('PING', { pinger_id: 'FRIEND' }) });
    await flush();

    expect(invites).toHaveLength(1);
    expect(bot.pendingInvites.has('FRIEND')).toBe(true);

    const invite = invites[0] as { accept(): Promise<unknown>; decline(): Promise<void> };
    await invite.accept();
    expect(partyClient.pings).toHaveBeenCalledWith('AT', 'ACC', 'FRIEND');
    expect(partyClient.joinById).toHaveBeenCalledWith(
      'AT',
      'party-invited',
      expect.objectContaining({ accountId: 'ACC', connectionId: 'jid-1', displayName: 'Me' }),
    );
  });

  it('emits a join request whose confirm()/reject() call the party client', async () => {
    const { bot, xmpp, partyClient } = setup();
    await bot.start();

    const events: unknown[] = [];
    bot.on('party:join:request', (event) => events.push(event));
    xmpp.fire('message', { body: partyNotification('INITIAL_INTENTION', { requester_id: 'R' }) });
    await flush();

    const request = events[0] as { confirm(): Promise<void>; reject(): Promise<void> };
    await request.confirm();
    expect(partyClient.confirmMember).toHaveBeenCalledWith('AT', 'party-9', 'R');

    await request.reject();
    expect(partyClient.rejectMember).toHaveBeenCalledWith('AT', 'party-9', 'R');
  });

  it('refreshes the live party on a member joined notification', async () => {
    const { bot, xmpp, session } = setup();
    await bot.start();
    (session.getParty as ReturnType<typeof vi.fn>).mockClear();

    const seen = vi.fn();
    bot.on('party:member:joined', seen);
    xmpp.fire('message', { body: partyNotification('MEMBER_JOINED', { account_id: 'NEW' }) });
    await flush();

    expect(seen).toHaveBeenCalledTimes(1);
    expect(bot.party?.refresh).toHaveBeenCalled();
  });

  it('clears the live party when the bot itself leaves', async () => {
    const { bot, xmpp } = setup();
    await bot.start();

    const disbanded = vi.fn();
    bot.on('party:disbanded', disbanded);
    xmpp.fire('message', { body: partyNotification('MEMBER_KICKED', { account_id: 'ACC' }) });
    await flush();

    expect(disbanded).toHaveBeenCalledWith({ partyId: 'party-9' });
    expect(bot.party).toBeNull();
  });

  it('forwards decoded chat and presence from the connect channel', async () => {
    const { bot, events } = setup();
    await bot.start();

    const dm = vi.fn();
    const presence = vi.fn();
    bot.on('friend:message', dm);
    bot.on('presence', presence);

    events.fire('friend:message', { from: 'FRIEND', body: 'hi' });
    events.fire('presence', { accountId: 'FRIEND', online: true });

    expect(dm).toHaveBeenCalledWith({ from: 'FRIEND', body: 'hi' });
    expect(presence).toHaveBeenCalledWith({ accountId: 'FRIEND', online: true });
  });
});
