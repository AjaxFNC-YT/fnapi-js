export type TokenType = '*' | 'eg1' | 'ep1' | 'epic_id' | 'id_token';

export type GrantType =
  | 'client_credentials'
  | 'authorization_code'
  | 'exchange_code'
  | 'device_auth'
  | 'device_code'
  | 'refresh_token'
  | 'continuation_token'
  | 'token_to_token'
  | 'otp'
  | 'password'
  | 'external_auth';

export interface OAuthToken {
  access_token: string;
  expires_in: number;
  expires_at: string;
  token_type: string;
  refresh_token?: string;
  refresh_expires?: number;
  refresh_expires_at?: string;
  account_id?: string;
  client_id: string;
  internal_client: boolean;
  client_service: string;
  displayName?: string;
  app?: string;
  in_app_id?: string;
  product_id?: string;
  application_id?: string;
  scope?: string[];
  device_id?: string;
  perms?: TokenPermission[];
}

export interface TokenPermission {
  resource: string;
  action: number;
}

export interface VerifyResponse {
  token: string;
  session_id: string;
  token_type: string;
  client_id: string;
  internal_client: boolean;
  client_service: string;
  account_id?: string;
  expires_in: number;
  expires_at: string;
  auth_method?: string;
  display_name?: string;
  app?: string;
  in_app_id?: string;
  device_id?: string;
  perms?: TokenPermission[];
}

export interface ExchangeCode {
  expiresInSeconds: number;
  code: string;
  creatingClientId: string;
  consumingClientId?: string;
}

export interface DeviceCode {
  user_code: string;
  device_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  prompt: string;
  expires_in: number;
  interval: number;
  client_id: string;
}

export interface DeviceAuthAccess {
  location?: string;
  ipAddress?: string;
  dateTime: string;
}

export interface DeviceAuth {
  deviceId: string;
  accountId: string;
  secret?: string;
  userAgent?: string;
  created: DeviceAuthAccess;
  lastAccess?: DeviceAuthAccess;
}

export interface DeviceAuthCredentials {
  accountId: string;
  deviceId: string;
  secret: string;
}

export interface EpicAccount {
  id: string;
  displayName: string;
  name?: string;
  email?: string;
  failedLoginAttempts?: number;
  lastLogin?: string;
  numberOfDisplayNameChanges?: number;
  ageGroup?: string;
  headless?: boolean;
  country?: string;
  lastName?: string;
  preferredLanguage?: string;
  canUpdateDisplayName?: boolean;
  tfaEnabled?: boolean;
  emailVerified?: boolean;
  minorVerified?: boolean;
  minorExpected?: boolean;
  minorStatus?: string;
  cabinedMode?: boolean;
  hasHashedEmail?: boolean;
  externalAuths?: Record<string, ExternalAuth>;
}

export interface ExternalAuth {
  accountId: string;
  type: string;
  externalAuthId?: string;
  externalAuthIdType?: string;
  externalDisplayName?: string;
  authIds?: Array<{ id: string; type: string }>;
  dateAdded?: string;
}

export interface ExternalAuthAccountMatch {
  id: string;
  displayName: string;
  links?: Record<string, unknown>;
  externalAuths?: Record<string, ExternalAuth>;
}

export interface ExternalDisplayNameMatch {
  accountId: string;
  type: string;
  externalAuthIdType?: string;
  externalDisplayName?: string;
}

export interface ExternalIdMatch {
  accountId: string;
  type: string;
  externalAuthId?: string;
  externalAuthIdType?: string;
  authIds?: Array<{ id: string; type: string }>;
}

export type ExternalDisplayNameLookup = Record<string, ExternalDisplayNameMatch[]>;

export type ExternalIdLookup = Record<string, ExternalIdMatch>;

export type AccountMetadata = Record<string, string>;

export type KillType =
  | 'OTHERS_ACCOUNT_CLIENT_SERVICE'
  | 'OTHERS_ACCOUNT_CLIENT'
  | 'OTHERS_SAME_SOURCE_ID'
  | 'OTHERS'
  | 'ALL'
  | 'ALL_ACCOUNT_CLIENT';

export interface EpicErrorBody {
  errorCode?: string;
  errorMessage?: string;
  messageVars?: string[];
  numericErrorCode?: number;
  originatingService?: string;
  intent?: string;
  error?: string;
  error_description?: string;
  [key: string]: unknown;
}
