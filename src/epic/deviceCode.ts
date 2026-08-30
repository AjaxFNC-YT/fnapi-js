import type { AuthManager, DeviceCodePollOptions } from './auth.js';
import type { AuthClient } from './clients.js';
import type { EpicAuthSession } from './session.js';
import type { DeviceCode, OAuthToken } from './types.js';

export class DeviceCodeFlow {
  public readonly client: AuthClient;
  public readonly userCode: string;
  public readonly deviceCode: string;
  public readonly verificationUri: string;
  public readonly verificationUriComplete: string;
  public readonly intervalSeconds: number;
  public readonly expiresAt: Date;

  private readonly auth: AuthManager;
  private readonly toSession: (token: OAuthToken) => EpicAuthSession;

  constructor(
    auth: AuthManager,
    toSession: (token: OAuthToken) => EpicAuthSession,
    client: AuthClient,
    response: DeviceCode,
  ) {
    this.auth = auth;
    this.toSession = toSession;
    this.client = client;
    this.userCode = response.user_code;
    this.deviceCode = response.device_code;
    this.verificationUri = response.verification_uri;
    this.verificationUriComplete = response.verification_uri_complete;
    this.intervalSeconds = response.interval;
    this.expiresAt = new Date(Date.now() + response.expires_in * 1000);
  }

  get expiresInMs(): number {
    return this.expiresAt.getTime() - Date.now();
  }

  get isExpired(): boolean {
    return this.expiresInMs <= 0;
  }

  pollForToken(options: DeviceCodePollOptions = {}): Promise<OAuthToken> {
    return this.auth.pollDeviceCode(this.client, this.deviceCode, {
      intervalMs: this.intervalSeconds * 1000,
      expiresAt: this.expiresAt,
      ...options,
    });
  }

  async poll(options: DeviceCodePollOptions = {}): Promise<EpicAuthSession> {
    const token = await this.pollForToken(options);
    return this.toSession(token);
  }
}
