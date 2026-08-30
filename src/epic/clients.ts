import { ValidationError } from '../core/errors.js';

export interface AuthClient {
  name: string;
  clientId: string;
  clientSecret?: string;
}

export const AuthClients = {
  fortnitePC: {
    name: 'fortnitePCGameClient',
    clientId: 'ec684b8c687f479fadea3cb2ad83f5c6',
    clientSecret: 'e1f31c211f28413186262d37a13fc84d',
  },
  fortniteIOS: {
    name: 'fortniteIOSGameClient',
    clientId: '3446cd72694c4a4485d81b77adbb2141',
    clientSecret: '9209d4a5e25a457fb9b07489d313b41a',
  },
  fortniteIOSEUAppstore: {
    name: 'fortniteIOSGameClientEUAppstore',
    clientId: 'af43dc71dd91452396fcdffbd7a8e8a9',
    clientSecret: '4YXvSEBLFRPLh1hzGZAkfOi5mqupFohZ',
  },
  fortniteAndroid: {
    name: 'fortniteAndroidGameClient',
    clientId: '3f69e56c7649492c8cc29f1af08a8a12',
    clientSecret: 'b51ee9cb12234f50a69efa67ef53812e',
  },
  fortniteSwitch: {
    name: 'fortniteSwitchGameClient',
    clientId: '5229dcd3ac3845208b496649092f251b',
    clientSecret: 'e3bd2d3e-bf8c-4857-9e7d-f3d947d220c7',
  },
  fortniteNewSwitch: {
    name: 'fortniteNewSwitchGameClient',
    clientId: '98f7e42c2e3a4f86a74eb43fbb41ed39',
    clientSecret: '0a2449a2-001a-451e-afec-3e812901c4d7',
  },
  fortniteXbox: {
    name: 'fortniteXboxGameClient',
    clientId: 'cfaa14c4bf8744e3a5ef9a5d6c34558d',
    clientSecret: 'bcb0cd392fcd4e50a76ad4384c620543',
  },
  fortniteXSX: {
    name: 'fortniteXSXGameClient',
    clientId: 'db84fa58b60e468ba64e3b17209b56e9',
    clientSecret: '332881d7-e586-4681-b25b-377a6d97d24d',
  },
  fortniteValkyrie: {
    name: 'fortniteValkyrieGameClient',
    clientId: '3e13c5c57f594a578abe516eecb673fe',
    clientSecret: '530e316c337e409893c55ec44f22cd62',
  },
  fortniteCN: {
    name: 'fortniteCNGameClient',
    clientId: 'efe3cbb938804c74b20e109d0efc1548',
    clientSecret: '6e31bdbae6a44f258474733db74f39ba',
  },
  fortnitePS4EU: {
    name: 'fortnitePS4EUGameClient',
    clientId: '79a931b375334570ac369234f5da05ec',
    clientSecret: 'ee7335df3c4a412cb57055ab7ade693e',
  },
  fortnitePS4US: {
    name: 'fortnitePS4USGameClient',
    clientId: 'd8566f2e7f5c48f89683173eb529fee1',
    clientSecret: '255c7109c8274241986616e3702678b5',
  },
  kairosPC: {
    name: 'KairosPC',
    clientId: '5b685653b9904c1d92495ee8859dcb00',
    clientSecret: '7Q2mcmneyuvPmoRYfwM7gfErA6iUjhXr',
  },
  kairosAndroid: {
    name: 'Kairos Android',
    clientId: '0716a69cb8b2422fbb2a8b0879501471',
    clientSecret: 'cGthdfG68tyE7M3ZHMu3sXUBwqhibKFp',
  },
  kairosIOS: {
    name: 'Kairos iOS',
    clientId: '61d2f70175e84a6bba80a5089e597e1c',
    clientSecret: 'FbiZv3wbiKpvVKrAeMxiR6WhxZWVbrvA',
  },
  launcherApp: {
    name: 'launcherAppClient2',
    clientId: '34a02cf8f4414e29b15921876da36f9a',
    clientSecret: 'daafbccc737745039dffe53d94fc76cf',
  },
  androidPortal: {
    name: 'androidPortal',
    clientId: '38dbfc3196024d5980386a37b7c792bb',
    clientSecret: 'a6280b87-e45e-409b-9681-8f15eb7dbcf5',
  },
  ut: {
    name: 'utClient',
    clientId: '1252412dc7704a9690f6ea4611bc81ee',
    clientSecret: '2ca0c925b4674852bff92b26f8322434',
  },
  utDedicatedServer: {
    name: 'utDedicatedServer',
    clientId: '6ff43e743edc4d1dbac3594877b4bed9',
    clientSecret: '54619d6f84d443e195200b54ab649a53',
  },
} as const satisfies Record<string, AuthClient>;

export type AuthClientName = keyof typeof AuthClients;

export const ALL_AUTH_CLIENTS: readonly AuthClient[] = [
  { name: 'fortnitePCGameClient', clientId: 'ec684b8c687f479fadea3cb2ad83f5c6', clientSecret: 'e1f31c211f28413186262d37a13fc84d' },
  { name: 'fortniteIOSGameClientEUAppstore', clientId: 'af43dc71dd91452396fcdffbd7a8e8a9', clientSecret: '4YXvSEBLFRPLh1hzGZAkfOi5mqupFohZ' },
  { name: 'fortniteIOSGameClient', clientId: '3446cd72694c4a4485d81b77adbb2141', clientSecret: '9209d4a5e25a457fb9b07489d313b41a' },
  { name: 'fortniteSwitchGameClient', clientId: '5229dcd3ac3845208b496649092f251b', clientSecret: 'e3bd2d3e-bf8c-4857-9e7d-f3d947d220c7' },
  { name: 'fortniteNewSwitchGameClient', clientId: '98f7e42c2e3a4f86a74eb43fbb41ed39', clientSecret: '0a2449a2-001a-451e-afec-3e812901c4d7' },
  { name: 'fortniteAndroidGameClient', clientId: '3f69e56c7649492c8cc29f1af08a8a12', clientSecret: 'b51ee9cb12234f50a69efa67ef53812e' },
  { name: 'fortniteXboxGameClient', clientId: 'cfaa14c4bf8744e3a5ef9a5d6c34558d', clientSecret: 'bcb0cd392fcd4e50a76ad4384c620543' },
  { name: 'fortniteXSXGameClient', clientId: 'db84fa58b60e468ba64e3b17209b56e9', clientSecret: '332881d7-e586-4681-b25b-377a6d97d24d' },
  { name: 'fortniteValkyrieGameClient', clientId: '3e13c5c57f594a578abe516eecb673fe', clientSecret: '530e316c337e409893c55ec44f22cd62' },
  { name: 'fortniteCNGameClient', clientId: 'efe3cbb938804c74b20e109d0efc1548', clientSecret: '6e31bdbae6a44f258474733db74f39ba' },
  { name: 'fortnitePS4EUGameClient', clientId: '79a931b375334570ac369234f5da05ec', clientSecret: 'ee7335df3c4a412cb57055ab7ade693e' },
  { name: 'fortnitePS4USGameClient', clientId: 'd8566f2e7f5c48f89683173eb529fee1', clientSecret: '255c7109c8274241986616e3702678b5' },
  { name: 'KairosPC', clientId: '5b685653b9904c1d92495ee8859dcb00', clientSecret: '7Q2mcmneyuvPmoRYfwM7gfErA6iUjhXr' },
  { name: 'Kairos Android', clientId: '0716a69cb8b2422fbb2a8b0879501471', clientSecret: 'cGthdfG68tyE7M3ZHMu3sXUBwqhibKFp' },
  { name: 'Kairos iOS', clientId: '61d2f70175e84a6bba80a5089e597e1c', clientSecret: 'FbiZv3wbiKpvVKrAeMxiR6WhxZWVbrvA' },
  { name: 'launcherAppClient2', clientId: '34a02cf8f4414e29b15921876da36f9a', clientSecret: 'daafbccc737745039dffe53d94fc76cf' },
  { name: 'androidPortal', clientId: '38dbfc3196024d5980386a37b7c792bb', clientSecret: 'a6280b87-e45e-409b-9681-8f15eb7dbcf5' },
  { name: 'utClient', clientId: '1252412dc7704a9690f6ea4611bc81ee', clientSecret: '2ca0c925b4674852bff92b26f8322434' },
  { name: 'wexPCGameClient', clientId: '3cf78cd3b00b439a8755a878b160c7ad', clientSecret: 'b383e0f4-f0cc-4d14-99e3-813c33fc1e9d' },
  { name: 'wexAndroidGameClient', clientId: 'e645e4b96298419cbffbfa353ebf8b82', clientSecret: 'd03089fd-628a-448a-ac39-0e8c5b022a11' },
  { name: 'wexIOSGameClient', clientId: 'ec813099a59f48d4a338f1901c1609db', clientSecret: '72f6db62-0e3e-4439-97df-ee21f7b0ae94' },
  { name: 'utDedicatedServer', clientId: '6ff43e743edc4d1dbac3594877b4bed9', clientSecret: '54619d6f84d443e195200b54ab649a53' },
  { name: 'Diesel - Monomi Park - Slime Rancher', clientId: '7c0e608d74ec4f40a1d58beb26639367', clientSecret: 'P9A63tad7Yk5FPRRmqbopgACDq99em' },
  { name: 'Among Us', clientId: 'xyza7891qtrmoYLr86we6DlfCA1RRsp8', clientSecret: 'nGThQanzvthA2HPaARXe/xutzsKyx5WJveNkBx44ti4' },
  { name: 'Fall Guys', clientId: 'xyza7891mADED0tPNJFOiF8OmI0DwY0J', clientSecret: '8w2sDwL5/GuUjeVbHZIxe1FAFwi+tuQI2msSCVIO+EA' },
  { name: 'Fortnite', clientId: 'xyza7891343Fr4ZSPkQZ3kaL3I2sX8B5', clientSecret: 'F8BVRyHIqmct8cN9KSPbXsJszpiIZEYEFDiySxc1wuA' },
];

const CLIENT_INDEX = new Map<string, AuthClient>(
  ALL_AUTH_CLIENTS.flatMap((client) => [
    [client.clientId.toLowerCase(), client] as [string, AuthClient],
    [client.name.toLowerCase(), client] as [string, AuthClient],
  ]),
);

export function findAuthClient(idOrName: string): AuthClient | null {
  return CLIENT_INDEX.get(idOrName.trim().toLowerCase()) ?? null;
}

export type AuthClientInput = AuthClient | AuthClientName | (string & {});

export function isCustomClientInput(input: AuthClientInput): boolean {
  if (typeof input !== 'object' || input === null) return false;
  return findAuthClient(input.clientId) === null;
}

export function resolveAuthClient(input: AuthClientInput): AuthClient {
  if (typeof input === 'object' && input !== null) {
    if (typeof input.clientId !== 'string' || input.clientId.length === 0) {
      throw new ValidationError('A custom auth client requires a non-empty "clientId"', 'clientId');
    }
    return input;
  }

  if (typeof input === 'string') {
    if (input in AuthClients) {
      return AuthClients[input as AuthClientName];
    }
    const found = findAuthClient(input);
    if (found) return found;
    throw new ValidationError(
      `Unknown auth client "${input}". Pass a known client name/id or a custom { clientId, clientSecret }.`,
      'client',
    );
  }

  throw new ValidationError('An auth client is required', 'client');
}
