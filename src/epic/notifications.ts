export const PARTY_NOTIFICATION_PREFIX = 'com.epicgames.social.party.notification.v0.';
export const FRIEND_NOTIFICATION_TYPE = 'com.epicgames.friends.core.apiobjects.Friend';
export const FRIENDSHIP_REMOVE_TYPE = 'FRIENDSHIP_REMOVE';

export type FriendDirection = 'INBOUND' | 'OUTBOUND';
export type FriendRemoveReason = 'ABORTED' | 'REJECTED' | 'DELETED';

export interface RawNotification {
  type: string;
  [key: string]: unknown;
}

export type DecodedNotification =
  | { kind: 'party:invite'; fromId: string; raw: RawNotification }
  | { kind: 'party:member:joined'; partyId: string; accountId: string; raw: RawNotification }
  | { kind: 'party:member:left'; partyId: string; accountId: string; raw: RawNotification }
  | { kind: 'party:member:expired'; partyId: string; accountId: string; raw: RawNotification }
  | { kind: 'party:member:kicked'; partyId: string; accountId: string; raw: RawNotification }
  | { kind: 'party:member:disconnected'; partyId: string; accountId: string; raw: RawNotification }
  | { kind: 'party:member:connected'; partyId: string; accountId: string; raw: RawNotification }
  | { kind: 'party:member:updated'; partyId: string; accountId: string; raw: RawNotification }
  | { kind: 'party:member:promoted'; partyId: string; accountId: string; raw: RawNotification }
  | { kind: 'party:member:confirmation'; partyId: string; accountId: string; raw: RawNotification }
  | { kind: 'party:join:request'; partyId: string; requesterId: string; raw: RawNotification }
  | { kind: 'party:updated'; partyId: string; raw: RawNotification }
  | { kind: 'party:invite:declined'; accountId: string; raw: RawNotification }
  | { kind: 'friend:request'; accountId: string; direction: FriendDirection; favorite: boolean; created: string | null; raw: RawNotification }
  | { kind: 'friend:added'; accountId: string; favorite: boolean; created: string | null; raw: RawNotification }
  | { kind: 'friend:removed'; from: string; to: string; reason: FriendRemoveReason; raw: RawNotification }
  | { kind: 'unknown'; type: string; raw: RawNotification };

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function decodeNotification(body: string): DecodedNotification | null {
  let raw: RawNotification;
  try {
    raw = JSON.parse(body) as RawNotification;
  } catch {
    return null;
  }
  if (!raw || typeof raw.type !== 'string') return null;
  const type = raw.type;

  if (type === FRIEND_NOTIFICATION_TYPE) {
    const payload = (raw.payload ?? {}) as Record<string, unknown>;
    const status = str(payload.status);
    const accountId = str(payload.accountId);
    const favorite = payload.favorite === true;
    const created = optionalString(payload.created);
    if (status === 'ACCEPTED') {
      return { kind: 'friend:added', accountId, favorite, created, raw };
    }
    if (status === 'PENDING') {
      const direction: FriendDirection = payload.direction === 'OUTBOUND' ? 'OUTBOUND' : 'INBOUND';
      return { kind: 'friend:request', accountId, direction, favorite, created, raw };
    }
    return { kind: 'unknown', type, raw };
  }

  if (type === FRIENDSHIP_REMOVE_TYPE) {
    const reasonRaw = str(raw.reason);
    const reason: FriendRemoveReason =
      reasonRaw === 'ABORTED' || reasonRaw === 'REJECTED' ? reasonRaw : 'DELETED';
    return { kind: 'friend:removed', from: str(raw.from), to: str(raw.to), reason, raw };
  }

  if (!type.startsWith(PARTY_NOTIFICATION_PREFIX)) {
    return { kind: 'unknown', type, raw };
  }

  const event = type.slice(PARTY_NOTIFICATION_PREFIX.length);
  const partyId = str(raw.party_id);
  const accountId = str(raw.account_id);

  switch (event) {
    case 'PING':
    case 'INITIAL_INVITE':
      return { kind: 'party:invite', fromId: str(raw.pinger_id) || str(raw.inviter_id) || str(raw.sent_by), raw };
    case 'MEMBER_JOINED':
      return { kind: 'party:member:joined', partyId, accountId, raw };
    case 'MEMBER_LEFT':
      return { kind: 'party:member:left', partyId, accountId, raw };
    case 'MEMBER_EXPIRED':
      return { kind: 'party:member:expired', partyId, accountId, raw };
    case 'MEMBER_KICKED':
      return { kind: 'party:member:kicked', partyId, accountId, raw };
    case 'MEMBER_DISCONNECTED':
      return { kind: 'party:member:disconnected', partyId, accountId, raw };
    case 'MEMBER_CONNECTED':
      return { kind: 'party:member:connected', partyId, accountId, raw };
    case 'MEMBER_STATE_UPDATED':
      return { kind: 'party:member:updated', partyId, accountId, raw };
    case 'MEMBER_NEW_CAPTAIN':
      return { kind: 'party:member:promoted', partyId, accountId, raw };
    case 'MEMBER_REQUIRE_CONFIRMATION':
      return { kind: 'party:member:confirmation', partyId, accountId, raw };
    case 'INITIAL_INTENTION':
      return { kind: 'party:join:request', partyId, requesterId: str(raw.requester_id), raw };
    case 'PARTY_UPDATED':
      return { kind: 'party:updated', partyId, raw };
    case 'INVITE_DECLINED':
      return { kind: 'party:invite:declined', accountId: str(raw.invitee_id) || accountId, raw };
    default:
      return { kind: 'unknown', type, raw };
  }
}
