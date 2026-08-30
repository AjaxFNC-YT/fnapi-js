import { createPublicKey, verify } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ChatService,
  buildPresencePayload,
  buildSignedMessage,
  decodeMessageBody,
  generateChatKeypair,
  CHAT_BASE_URL,
  PUBLIC_KEY_BASE_URL,
} from '../../src/epic/chat.js';
import { FN_LIVE_DEPLOYMENT_ID } from '../../src/epic/eos.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { ValidationError } from '../../src/core/errors.js';
import { createMockFetch, type MockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function setup(...responses: MockResponseInit[]): { mock: MockFetch; chat: ChatService } {
  const mock = createMockFetch(...responses);
  const chatRest = new EpicRestClient({ baseUrl: CHAT_BASE_URL, fetch: mock.fetch, retry: 1 });
  const publicKeyRest = new EpicRestClient({ baseUrl: PUBLIC_KEY_BASE_URL, fetch: mock.fetch, retry: 1 });
  return { mock, chat: new ChatService(chatRest, publicKeyRest) };
}

async function captureThrow(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to throw');
}

describe('decodeMessageBody', () => {
  it('extracts the msg field from a base64 body', () => {
    const body = Buffer.from(JSON.stringify({ msg: 'hello', sid: 'x' })).toString('base64');
    expect(decodeMessageBody(body)).toBe('hello');
  });

  it('tolerates trailing null bytes', () => {
    const body = Buffer.from(`${JSON.stringify({ msg: 'padded' })}\0\0`).toString('base64');
    expect(decodeMessageBody(body)).toBe('padded');
  });

  it('returns the input unchanged when it is not a signed body', () => {
    expect(decodeMessageBody('not-a-signed-body')).toBe('not-a-signed-body');
  });
});

describe('buildSignedMessage', () => {
  it('encodes the content and produces a verifiable ed25519 signature', async () => {
    const keypair = await generateChatKeypair();
    const signed = await buildSignedMessage(keypair, {
      accountId: 'me',
      conversationId: 'convo-1',
      content: 'signed hi',
    });
    expect(decodeMessageBody(signed.body)).toBe('signed hi');

    const message = Buffer.concat([Buffer.from(signed.body, 'utf8'), Buffer.from([0])]);
    const publicKey = createPublicKey(keypair.privateKey as never);
    const ok = verify(null, message, publicKey, Buffer.from(signed.sig, 'base64'));
    expect(ok).toBe(true);
  });

  it('defaults the sequence to 1 and honors overrides', async () => {
    const keypair = await generateChatKeypair();
    const dm = await buildSignedMessage(keypair, {
      accountId: 'me',
      conversationId: 'c',
      content: 'x',
      sequence: 0,
      type: 'Party',
    });
    const decoded = JSON.parse(Buffer.from(dm.body, 'base64').toString('utf8')) as Record<string, unknown>;
    expect(decoded['seq']).toBe(0);
    expect(decoded['cty']).toBe('Party');
    expect(decoded['rid']).toBe('c');
    expect(decoded['sid']).toBe('me');
  });
});

describe('generateChatKeypair', () => {
  it('produces a raw 32-byte public key encoded as base64', async () => {
    const keypair = await generateChatKeypair();
    expect(Buffer.from(keypair.publicKeyB64, 'base64')).toHaveLength(32);
  });
});

describe('buildPresencePayload', () => {
  it('defaults to online with no activity when none is given', () => {
    const payload = buildPresencePayload();
    expect(payload['status']).toBe('online');
    expect(payload['activity']).toBeUndefined();
    expect((payload['props'] as Record<string, unknown>)['EOS_ProductName']).toBe('Fortnite');
  });

  it('carries the status text in activity.value (the in-game line)', () => {
    const payload = buildPresencePayload({ activity: 'Playing with fnapi-js' });
    expect(payload['activity']).toEqual({ value: 'Playing with fnapi-js' });
  });

  it('maps onlineType onto the status field', () => {
    expect(buildPresencePayload({ onlineType: 'away' })['status']).toBe('away');
  });
});

describe('ChatService', () => {
  it('registers a public key with the ed25519 algorithm', async () => {
    const { mock, chat } = setup({ body: { jwt: 'signed-jwt' } });
    const result = await chat.registerPublicKey('GAME_TOKEN', 'PUBLIC_KEY_B64');
    expect(result.jwt).toBe('signed-jwt');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/publickey/v2/publickey/');
    expect(request.headers['authorization']).toBe('Bearer GAME_TOKEN');
    const json = JSON.parse(request.body ?? '{}') as Record<string, unknown>;
    expect(json['algorithm']).toBe('ed25519');
    expect(json['key']).toBe('PUBLIC_KEY_B64');
  });

  it('creates a dm conversation without creating a duplicate', async () => {
    const { mock, chat } = setup({ body: { conversationId: 'convo-1', isReportable: true } });
    const conversation = await chat.getConversation('EAS', 'me', 'friend');
    expect(conversation.conversationId).toBe('convo-1');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/epic/chat/v1/public/_/conversations');
    expect(request.query.get('createIfExists')).toBe('false');
    const json = JSON.parse(request.body ?? '{}') as Record<string, unknown>;
    expect(json['type']).toBe('dm');
    expect(json['members']).toEqual(['me', 'friend']);
  });

  it('fetches previous messages with the requesting account and limit', async () => {
    const { mock, chat } = setup({ body: { page: [{ id: 'm1', body: 'hi' }] } });
    const messages = await chat.previousMessages('EAS', 'me', 'convo-1', { limit: 5 });
    expect(messages).toHaveLength(1);
    const request = mock.lastRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/epic/chat/v1/public/_/conversations/convo-1/messages');
    expect(request.query.get('requestingAccountId')).toBe('me');
    expect(request.query.get('limit')).toBe('5');
  });

  it('posts a dm message with the fromAccountId query', async () => {
    const { mock, chat } = setup({ body: { id: 'sent-1' } });
    const result = await chat.postDMMessage('EAS', 'me', 'convo-1', { message: { body: 'signed' } });
    expect(result.id).toBe('sent-1');
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/epic/chat/v1/public/_/conversations/convo-1/messages');
    expect(request.query.get('fromAccountId')).toBe('me');
  });

  it('posts a party message to the p-prefixed conversation path', async () => {
    const { mock, chat } = setup({ body: { id: 'sent-2' } });
    await chat.postPartyMessage('EAS', 'me', 'party-9', { message: { body: 'signed' } });
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toContain('/conversations/p-party-9/messages');
    expect(request.query.get('fromAccountId')).toBe('me');
  });

  it('rejects a blank target without issuing a request', async () => {
    const { mock, chat } = setup();
    expect(await captureThrow(() => chat.getConversation('EAS', 'me', ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });

  it('patches EOS presence to the deployment/account/connection path with the activity body', async () => {
    const { mock, chat } = setup({ body: {} });
    await chat.sendPresence('EAS', 'me', 'conn-1', { activity: 'In a match' });
    const request = mock.lastRequest();
    expect(request.method).toBe('PATCH');
    expect(request.path).toBe(`/epic/presence/v1/${FN_LIVE_DEPLOYMENT_ID}/me/presence/conn-1`);
    expect(request.headers['authorization']).toBe('Bearer EAS');
    const json = JSON.parse(request.body ?? '{}') as Record<string, unknown>;
    expect(json['status']).toBe('online');
    expect(json['activity']).toEqual({ value: 'In a match' });
  });

  it('rejects a blank connectionId without issuing a request', async () => {
    const { mock, chat } = setup();
    expect(await captureThrow(() => chat.sendPresence('EAS', 'me', ''))).toBeInstanceOf(ValidationError);
    expect(mock.calls).toBe(0);
  });
});
