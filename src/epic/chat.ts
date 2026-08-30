import { ConfigurationError, ValidationError } from '../core/errors.js';
import { EOS_AUTH_BASE_URL, FN_LIVE_DEPLOYMENT_ID } from './eos.js';
import type { EpicRestClient } from './rest.js';

export const CHAT_BASE_URL = EOS_AUTH_BASE_URL;
export const PUBLIC_KEY_BASE_URL = 'https://publickey-service-live.ecosec.on.epicgames.com';
export const CHAT_DEFAULT_PLATFORM = 'WIN';
export const CHAT_DEFAULT_BUILD = '++Fortnite+Release-40.30-CL-53093531';
export const CHAT_MAX_MESSAGE_LENGTH = 2048;

export interface ChatKeypair {
  privateKey: unknown;
  publicKeyB64: string;
}

export interface RegisteredKey {
  jwt?: string;
  [key: string]: unknown;
}

export interface ConversationData {
  conversationId: string;
  isReportable: boolean;
  [key: string]: unknown;
}

export interface ChatMessage {
  id?: string;
  conversationId?: string;
  senderId?: string;
  body?: string;
  time?: string;
  [key: string]: unknown;
}

export interface ChatSendResult {
  id?: string;
  time?: string;
  [key: string]: unknown;
}

export interface SignedMessageInput {
  accountId: string;
  conversationId: string;
  content: string;
  type?: 'Persistent' | 'Party' | (string & {});
  sequence?: number;
}

export interface SignedMessage {
  body: string;
  sig: string;
}

export interface ChatPresenceOptions {
  platform?: string;
  build?: string;
  activity?: string;
  onlineType?: string;
  deploymentId?: string;
  signal?: AbortSignal;
}

function requireString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`"${parameter}" is required and must be a non-empty string`, parameter);
  }
  return value;
}

function encodeBase64(input: string): string {
  const bufferCtor = (globalThis as { Buffer?: { from(data: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
  if (bufferCtor) return bufferCtor.from(input, 'utf8').toString('base64');
  const globalBtoa = (globalThis as { btoa?: (value: string) => string }).btoa;
  if (typeof globalBtoa === 'function') {
    const bytes = new TextEncoder().encode(input);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return globalBtoa(binary);
  }
  throw new ConfigurationError('No base64 encoder (Buffer/btoa) is available in this runtime.', 'chat');
}

export function decodeMessageBody(body: string): string {
  try {
    let decoded: string;
    const bufferCtor = (globalThis as { Buffer?: { from(data: string, encoding: string): { toString(encoding: string): string } } }).Buffer;
    if (bufferCtor) {
      decoded = bufferCtor.from(body, 'base64').toString('utf8');
    } else {
      const globalAtob = (globalThis as { atob?: (value: string) => string }).atob;
      if (typeof globalAtob !== 'function') return body;
      const binary = globalAtob(body);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      decoded = new TextDecoder().decode(bytes);
    }
    decoded = decoded.replace(/\0+$/, '');
    const parsed = JSON.parse(decoded) as { msg?: unknown };
    if (parsed && typeof parsed.msg === 'string') return parsed.msg;
    return body;
  } catch {
    return body;
  }
}

async function loadCrypto(): Promise<typeof import('node:crypto')> {
  try {
    return await import('node:crypto');
  } catch {
    throw new ConfigurationError(
      'Ed25519 chat signing requires the Node.js "node:crypto" module, which is not available in this runtime.',
      'chat',
    );
  }
}

export async function generateChatKeypair(): Promise<ChatKeypair> {
  const crypto = await loadCrypto();
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const spki = publicKey.export({ type: 'spki', format: 'der' }) as Buffer;
  const raw = spki.subarray(spki.length - 32);
  return { privateKey, publicKeyB64: raw.toString('base64') };
}

export async function buildSignedMessage(keypair: ChatKeypair, input: SignedMessageInput): Promise<SignedMessage> {
  const crypto = await loadCrypto();
  const timestamp = Math.floor(Date.now() / 1000);
  const messageInfo = {
    mid: crypto.randomBytes(16).toString('hex'),
    sid: input.accountId,
    rid: input.conversationId,
    msg: input.content,
    tst: timestamp,
    seq: input.sequence ?? 1,
    rec: false,
    mts: [],
    cty: input.type ?? 'Persistent',
  };
  const body = encodeBase64(JSON.stringify(messageInfo));
  const message = Buffer.concat([Buffer.from(body, 'utf8'), Buffer.from([0])]);
  const signature = crypto.sign(null, message, keypair.privateKey as Parameters<typeof crypto.sign>[2]);
  return { body, sig: signature.toString('base64') };
}

export function buildPresencePayload(
  options: { platform?: string; build?: string; activity?: string; onlineType?: string } = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    status: options.onlineType ?? 'online',
    props: {
      EOS_Platform: options.platform ?? CHAT_DEFAULT_PLATFORM,
      EOS_IntegratedPlatform: 'EGS',
      EOS_OnlinePlatformType: '100',
      EOS_ProductVersion: options.build ?? CHAT_DEFAULT_BUILD,
      EOS_ProductName: 'Fortnite',
      EOS_Session: '{"version":3}',
      EOS_Lobby: '{"version":3}',
    },
    conn: { props: {} },
  };
  if (typeof options.activity === 'string') {
    payload.activity = { value: options.activity };
  }
  return payload;
}

export class ChatService {
  constructor(
    private readonly chatRest: EpicRestClient,
    private readonly publicKeyRest: EpicRestClient,
  ) {}

  async registerPublicKey(
    gameAccessToken: string,
    publicKeyB64: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<RegisteredKey> {
    requireString(gameAccessToken, 'gameAccessToken');
    requireString(publicKeyB64, 'publicKeyB64');
    const response = await this.publicKeyRest.request<RegisteredKey>('POST', '/publickey/v2/publickey/', {
      bearer: gameAccessToken,
      json: { key: publicKeyB64, algorithm: 'ed25519' },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async getConversation(
    easAccessToken: string,
    accountId: string,
    targetAccountId: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<ConversationData> {
    requireString(easAccessToken, 'easAccessToken');
    requireString(accountId, 'accountId');
    requireString(targetAccountId, 'targetAccountId');
    const response = await this.chatRest.request<ConversationData>('POST', '/epic/chat/v1/public/_/conversations', {
      bearer: easAccessToken,
      query: { createIfExists: 'false' },
      json: { title: '', type: 'dm', members: [accountId, targetAccountId] },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async previousMessages(
    easAccessToken: string,
    accountId: string,
    conversationId: string,
    options: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<ChatMessage[]> {
    requireString(easAccessToken, 'easAccessToken');
    requireString(accountId, 'accountId');
    requireString(conversationId, 'conversationId');
    const path = `/epic/chat/v1/public/_/conversations/${encodeURIComponent(conversationId)}/messages`;
    const response = await this.chatRest.request<{ page?: ChatMessage[] }>('GET', path, {
      bearer: easAccessToken,
      query: { requestingAccountId: accountId, limit: options.limit ?? 30 },
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data.page ?? [];
  }

  async postDMMessage(
    easAccessToken: string,
    accountId: string,
    conversationId: string,
    payload: Record<string, unknown>,
    options: { signal?: AbortSignal } = {},
  ): Promise<ChatSendResult> {
    requireString(easAccessToken, 'easAccessToken');
    requireString(conversationId, 'conversationId');
    const path = `/epic/chat/v1/public/_/conversations/${encodeURIComponent(conversationId)}/messages`;
    const response = await this.chatRest.request<ChatSendResult>('POST', path, {
      bearer: easAccessToken,
      query: { fromAccountId: accountId },
      json: payload,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async postPartyMessage(
    easAccessToken: string,
    accountId: string,
    partyId: string,
    payload: Record<string, unknown>,
    options: { deploymentId?: string; signal?: AbortSignal } = {},
  ): Promise<ChatSendResult> {
    requireString(easAccessToken, 'easAccessToken');
    requireString(partyId, 'partyId');
    const deploymentId = options.deploymentId ?? FN_LIVE_DEPLOYMENT_ID;
    const path =
      `/epic/chat/v1/public/${encodeURIComponent(deploymentId)}/conversations/` +
      `${encodeURIComponent(`p-${partyId}`)}/messages`;
    const response = await this.chatRest.request<ChatSendResult>('POST', path, {
      bearer: easAccessToken,
      query: { fromAccountId: accountId },
      json: payload,
      ...(options.signal ? { signal: options.signal } : {}),
    });
    return response.data;
  }

  async sendPresence(
    easAccessToken: string,
    accountId: string,
    connectionId: string,
    options: ChatPresenceOptions = {},
  ): Promise<void> {
    requireString(easAccessToken, 'easAccessToken');
    requireString(accountId, 'accountId');
    requireString(connectionId, 'connectionId');
    const deploymentId = options.deploymentId ?? FN_LIVE_DEPLOYMENT_ID;
    const path =
      `/epic/presence/v1/${encodeURIComponent(deploymentId)}/` +
      `${encodeURIComponent(accountId)}/presence/${encodeURIComponent(connectionId)}`;
    await this.chatRest.request('PATCH', path, {
      bearer: easAccessToken,
      json: buildPresencePayload(options),
      ...(options.signal ? { signal: options.signal } : {}),
    });
  }
}
