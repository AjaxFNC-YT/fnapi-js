import { readFileSync, writeFileSync } from 'node:fs';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import {
  AvatarIconSize,
  CosmeticSearchBuilder,
  CosmeticType,
  DillyAPI,
  EpicGamesClient,
  FnccAPI,
  FortniteAPI,
  JamPart,
  LauncherInstaller,
  Locker,
  QuestBook,
  QuestCatalog,
  type QuestMode,
  type Quest,
  LOCKER_SLOTS,
  MatchMethod,
  MCPProfile,
  MTX_PLATFORM_LIST,
  PARTY_PRIVACY_LIST,
  isLanguage,
  isPartyPrivacy,
  type ConnectFriendMessage,
  type ConnectPartyMessage,
  type ConnectPresenceUpdate,
  type EpicAccount,
  type EpicAuthSession,
  type Tournament,
  type Island,
  type FriendPresence,
  type JamPartValue,
  type LockerEquippedItem,
  type LockerPreset,
  type LockerSlotName,
  type LockerVariantSelection,
  type RankedStanding,
  type XmppMessage,
} from '../src/index.js';

interface DeviceAuth {
  accountId?: string;
  deviceId?: string;
  secret?: string;
}

interface Config {
  apiKey?: string;
  language?: string;
  epic?: { client?: string; deviceAuth?: DeviceAuth };
  [key: string]: unknown;
}

const CONFIG_PATH = fileURLToPath(new URL('../config.json', import.meta.url));

function loadConfig(): Config {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Config;
  } catch {
    return {};
  }
}

function saveConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
}

const config = loadConfig();
const language = isLanguage(config.language) ? config.language : undefined;

const fortnite = new FortniteAPI({
  apiKey: config.apiKey || undefined,
  ...(language ? { language } : {}),
  cache: { enabled: true, ttl: 300_000 },
});
const dilly = new DillyAPI();
const fncc = new FnccAPI();
const epic = new EpicGamesClient({
  avatarImageResolver: async (characterId, size) => {
    try {
      const cosmetic = await fncc.cosmetics.get('br', characterId);
      const images = cosmetic.images ?? {};
      if (size === AvatarIconSize.SmallIcon) return images.smallIcon ?? images.icon ?? null;
      return images.icon ?? images.smallIcon ?? null;
    } catch {
      return null;
    }
  },
});
const rl = createInterface({ input, output });

let session: EpicAuthSession | null = null;

function ask(question: string): Promise<string> {
  return rl.question(question).then((answer) => answer.trim());
}

async function loginDeviceCode(): Promise<EpicAuthSession> {
  const login = await epic.loginWithDeviceCode({
    onPrompt(flow) {
      console.log(`\n  Open: ${flow.verificationUriComplete}`);
      console.log(`  Code: ${flow.userCode}`);
      process.stdout.write('  waiting');
    },
    onPending() {
      process.stdout.write('.');
    },
    onCanceled(error) {
      console.log(`\n  canceled: ${error.description ?? error.message}`);
    },
  });

  console.log(`\nlogged in as ${login.displayName} (${login.accountId})`);
  console.log('creating a reusable device auth...');

  const android = await login.switchClient('fortniteAndroid');
  const deviceAuth = await android.createDeviceAuth();

  config.epic = {
    ...(config.epic ?? {}),
    deviceAuth: {
      accountId: deviceAuth.accountId,
      deviceId: deviceAuth.deviceId,
      secret: deviceAuth.secret,
    },
  };
  saveConfig(config);
  console.log('saved device auth to config.json');

  await login.logout();
  session = android;
  return android;
}

async function getSession(): Promise<EpicAuthSession> {
  if (session) {
    await session.ensureValid();
    return session;
  }

  const saved = config.epic?.deviceAuth;
  if (saved?.accountId && saved.deviceId && saved.secret) {
    console.log('logging in with saved device auth...');
    session = await epic.loginWithDeviceAuth({
      accountId: saved.accountId,
      deviceId: saved.deviceId,
      secret: saved.secret,
    });
    console.log(`logged in as ${session.displayName}`);
    return session;
  }

  return loginDeviceCode();
}

async function searchCosmetics(): Promise<void> {
  const name = await ask('cosmetic name: ');
  if (!name) return;
  const results = await fortnite.cosmetics.searchAll({ name, matchMethod: MatchMethod.Contains });
  console.log(`${results.length} results:`);
  for (const cosmetic of results.slice(0, 15)) {
    console.log(`  ${cosmetic.id}  ${cosmetic.name}  [${cosmetic.rarity.displayValue} ${cosmetic.type.displayValue}]`);
  }
}

async function itemShop(): Promise<void> {
  const shop = await fortnite.shop.get();
  console.log(`${shop.entries.length} entries for ${shop.date}`);
  for (const entry of shop.entries.slice(0, 10)) {
    console.log(`  ${entry.brItems?.[0]?.name ?? entry.devName} — ${entry.finalPrice} V-Bucks`);
  }
}

async function playerStats(): Promise<void> {
  if (!config.apiKey) {
    console.log('set "apiKey" in config.json to use stats');
    return;
  }
  const name = await ask('player name: ');
  if (!name) return;
  const stats = await fortnite.stats.byName(name);
  const solo = stats.stats.all?.solo;
  console.log(`${stats.account.name}: ${solo?.wins ?? 0} solo wins, ${solo?.kd ?? 0} K/D`);
}

async function aesKeys(): Promise<void> {
  const aes = await fortnite.aes.get();
  console.log(`build ${aes.build}`);
  console.log(`main key ${aes.mainKey}`);
  console.log(`${aes.dynamicKeys.length} dynamic keys`);
}

async function creatorCode(): Promise<void> {
  const code = await ask('creator code: ');
  if (!code) return;
  const creator = await fortnite.creatorCode.get(code);
  console.log(`${creator.code} -> ${creator.account.name} (${creator.status})`);
}

function latestValue(series?: { value: number | null }[]): number | string {
  const last = series?.[series.length - 1];
  return last?.value ?? 'n/a';
}

async function ecosystemIslands(): Promise<void> {
  const { data } = await epic.ecosystem.islands({ size: 15 });
  console.log(`${data.length} islands:`);
  for (const island of data) {
    const tags = island.tags.length ? `  [${island.tags.slice(0, 3).join(', ')}]` : '';
    console.log(`  ${island.code}  ${island.title}${tags}`);
  }
}

async function ecosystemIsland(): Promise<void> {
  const code = await ask('island code: ');
  if (!code) return;
  const island = await epic.ecosystem.findIsland(code);
  if (!island) {
    console.log(`no island with code "${code}"`);
    return;
  }
  console.log(`${island.title} (${island.code})`);
  console.log(`  creator:  ${island.creatorCode ?? '?'}`);
  console.log(`  category: ${island.category ?? '?'}`);
  console.log(`  created:  ${island.createdIn ?? '?'}`);
  console.log(`  tags:     ${island.tags.join(', ') || 'none'}`);
}

async function ecosystemIslandMetrics(): Promise<void> {
  const code = await ask('island code: ');
  if (!code) return;
  const metrics = await epic.ecosystem.islandMetrics(code);
  console.log(`peak ccu:       ${latestValue(metrics.peakCCU)}`);
  console.log(`unique players: ${latestValue(metrics.uniquePlayers)}`);
  console.log(`minutes played: ${latestValue(metrics.minutesPlayed)}`);
  console.log(`plays:          ${latestValue(metrics.plays)}`);
  console.log(`favorites:      ${latestValue(metrics.favorites)}`);
  console.log(`recommendations:${latestValue(metrics.recommendations)}`);
}

async function ecosystemGenres(): Promise<void> {
  const { data } = await epic.ecosystem.genres();
  console.log(`${data.length} genres:`);
  for (const genre of data) console.log(`  ${genre.slug}  —  ${genre.displayName}`);
}

async function ecosystemGenreRankings(): Promise<void> {
  const slug = await ask('genre slug: ');
  if (!slug) return;
  const board = await epic.ecosystem.genreRankings(slug, { size: 15 });
  console.log(`${board.data.length} ranked islands:`);
  for (const entry of board.data) console.log(`  #${entry.rank}  ${entry.islandCode}`);
}

async function ecosystemGlobalMetrics(): Promise<void> {
  const metrics = await epic.ecosystem.metrics('hour');
  console.log(`in-match peak ccu:  ${latestValue(metrics.inMatchPeakCCU)}`);
  console.log(`in-client peak ccu: ${latestValue(metrics.inClientPeakCCU)}`);
}

async function accountInfo(): Promise<void> {
  const active = await getSession();
  const me = await active.me();
  console.log(`${me.displayName} (${me.id})`);
  console.log(`country ${me.country ?? '?'}, 2FA ${me.tfaEnabled ?? false}`);
}

async function showLocker(): Promise<void> {
  const active = await getSession();
  const locker = new Locker(active, fortnite.cosmetics);
  const snapshot = await locker.fetch({ enrich: true });
  const label = (slot: LockerEquippedItem | null): string => slot?.name ?? slot?.cosmeticId ?? 'none';

  console.log(`${snapshot.items.length} cosmetics owned, ${snapshot.items.filter((item) => item.favorite).length} favorited`);
  console.log(`skin ${label(snapshot.loadout.character)} | back ${label(snapshot.loadout.backpack)} | pickaxe ${label(snapshot.loadout.pickaxe)}`);
  console.log(`glider ${label(snapshot.loadout.glider)} | contrail ${label(snapshot.loadout.contrail)} | shoes ${label(snapshot.loadout.shoes)}`);
  console.log(`emotes ${snapshot.loadout.emotes.map(label).join(', ')}`);
  console.log(`car ${label(snapshot.loadout.car.body)} | companion ${label(snapshot.loadout.companion)}`);
  console.log(`presets: ${snapshot.presets.map((preset) => preset.name).join(', ') || 'none'}`);
}

const SLOT_BY_BACKEND: Record<string, LockerSlotName | 'emote' | 'wrap'> = {
  AthenaCharacter: 'character',
  AthenaBackpack: 'backpack',
  AthenaPickaxe: 'pickaxe',
  AthenaGlider: 'glider',
  AthenaSkyDiveContrail: 'contrail',
  AthenaLoadingScreen: 'loadingScreen',
  AthenaMusicPack: 'lobbyMusic',
  CosmeticShoes: 'shoes',
  SparksAura: 'aura',
  AthenaDance: 'emote',
  AthenaItemWrap: 'wrap',
};

function parseVariants(input: string): LockerVariantSelection[] {
  return input
    .split(',')
    .map((pair) => pair.split('=').map((part) => part.trim()))
    .filter((pair): pair is [string, string] => pair.length === 2 && pair[0]!.length > 0 && pair[1]!.length > 0)
    .map(([channel, variant]) => ({ channel, variant }));
}

async function editLocker(): Promise<void> {
  const active = await getSession();
  const locker = new Locker(active, fortnite.cosmetics);
  const name = await ask('cosmetic name to equip (skin/emote/wrap/etc): ');
  if (!name) return;

  const cosmetic = await fortnite.cosmetics.find(new CosmeticSearchBuilder().name(name).matchMethod(MatchMethod.Contains));
  if (!cosmetic) {
    console.log(`no cosmetic matching "${name}"`);
    return;
  }

  const backend = cosmetic.type?.backendValue ?? '';
  const target = SLOT_BY_BACKEND[backend];
  if (!target) {
    console.log(`"${cosmetic.name}" is a ${cosmetic.type?.displayValue ?? backend} — not an equippable locker slot`);
    return;
  }

  const variants = parseVariants(await ask('styles as channel=value,channel=value (blank = default): '));
  const options = variants.length ? { variants } : {};
  let describe: string = target;
  let run: () => Promise<unknown>;
  if (target === 'emote') {
    const index = Number.parseInt(await ask('emote slot (0-7): '), 10) || 0;
    describe = `emote slot ${index}`;
    run = () => locker.equipEmote(cosmetic.id, index, options);
  } else if (target === 'wrap') {
    const raw = await ask('wrap slot (0-6, blank = all): ');
    const index = raw === '' ? undefined : Number.parseInt(raw, 10);
    describe = index === undefined ? 'every wrap slot' : `wrap slot ${index}`;
    run = () => locker.equipWrap(cosmetic.id, index, options);
  } else {
    run = () => locker.equip(target, cosmetic.id, options);
  }

  console.log(`about to equip ${cosmetic.name} (${cosmetic.id}) to ${describe} on your REAL account`);
  if (!/^y/i.test(await ask('continue? [y/N]: '))) {
    console.log('cancelled');
    return;
  }
  await run();
  console.log(`equipped ${cosmetic.name} to ${describe}`);
}

async function saveLockerPreset(): Promise<void> {
  const active = await getSession();
  const locker = new Locker(active);
  const presetName = await ask('preset name: ');
  if (!presetName) return;
  if (!/^y/i.test(await ask(`save your current fit as "${presetName}" on your REAL account? [y/N]: `))) {
    console.log('cancelled');
    return;
  }
  const preset = await locker.savePreset(presetName);
  console.log(`saved preset "${preset.name}" (${preset.id})`);
}

async function pickPreset(locker: Locker): Promise<LockerPreset | null> {
  const presets = await locker.presets();
  if (presets.length === 0) {
    console.log('no presets saved');
    return null;
  }
  presets.forEach((preset, index) => console.log(`  ${index + 1}. ${preset.name}${preset.favorite ? ' ★' : ''}`));
  const picked = presets[Number.parseInt(await ask('preset number: '), 10) - 1];
  if (!picked) console.log('no such preset');
  return picked ?? null;
}

async function applyLockerPreset(): Promise<void> {
  const locker = new Locker(await getSession());
  const preset = await pickPreset(locker);
  if (!preset) return;
  if (!/^y/i.test(await ask(`equip "${preset.name}" on your REAL account? [y/N]: `))) return;
  await locker.applyPreset(preset.id);
  console.log(`equipped "${preset.name}"`);
}

async function deleteLockerPreset(): Promise<void> {
  const locker = new Locker(await getSession());
  const preset = await pickPreset(locker);
  if (!preset) return;
  if (!/^y/i.test(await ask(`delete "${preset.name}" from your REAL account? [y/N]: `))) return;
  await locker.deletePreset(preset.id);
  console.log(`deleted "${preset.name}"`);
}

async function colorLockerItem(): Promise<void> {
  const locker = new Locker(await getSession());
  const slotName = (await ask('slot (glider, carBody, suvBody, ...): ')) as LockerSlotName;
  if (!LOCKER_SLOTS[slotName]) {
    console.log(`unknown slot "${slotName}"`);
    return;
  }
  const color = await ask('colour (#RRGGBB): ');
  if (!color) return;
  if (!/^y/i.test(await ask(`recolour ${slotName} on your REAL account? [y/N]: `))) return;
  const loadout = await locker.setColor(slotName, color);
  console.log(`${slotName} now ${loadout.slots[slotName]?.variants.map((variant) => variant.additionalData).filter(Boolean).join(', ')}`);
}

async function queryAthena(): Promise<void> {
  const active = await getSession();
  const profile = await active.queryProfile(MCPProfile.athena);
  console.log(`athena revision ${profile.profileRevision}, ${profile.profileChanges.length} changes`);
}

let fakeReadyState = false;

async function partyInfo(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  console.log(`party ${party.id} — ${party.members.length} member(s), leader ${party.leader?.accountId ?? '?'}`);
  for (const member of party.members) {
    const tags = [member.isReady ? 'ready' : member.isSittingOut ? 'sitting-out' : 'not-ready'];
    if (member.inMatch) tags.push('in-match');
    if (member.isEmoting) tags.push(`emote:${member.emote}`);
    if (member.isJamming) tags.push(`jam:${member.jamTrack}`);
    console.log(`  ${member.accountId}${member.isSelf ? ' (you)' : ''} [${member.role}] {${tags.join(', ')}}`);
  }

  const me = party.me;
  if (!me) return;
  console.log('your party-meta state:');
  console.log(`  outfit    ${me.outfit ?? 'none'}`);
  console.log(`  backpack  ${me.backpack ?? 'none'}`);
  console.log(`  pickaxe   ${me.pickaxe ?? 'none'}`);
  console.log(`  glider    ${me.glider ?? 'none'}`);
  console.log(`  sidekick  ${me.sidekick ?? 'none'}`);
  console.log(`  banner    ${me.banner?.bannerIconId ?? 'none'} / ${me.banner?.bannerColorId ?? 'none'}`);
  console.log(`  emote     ${me.emote ?? 'none'}`);
  console.log(`  jam track ${me.jamTrack ?? 'none'}`);
  console.log(`  platform  ${me.platform ?? '?'}`);
  console.log(`  level     ${me.level}`);
  console.log(`  crowns    ${me.crowns}${me.hasCrown ? ' (crowned)' : ''}`);
  console.log(`  ready     ${me.readyState}`);
  console.log(`  in match  ${me.inMatch} (${me.matchInfo.playerCount} left)`);
}

async function fakeSkin(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  const name = await ask('skin name: ');
  if (!name) return;
  const skin = await fortnite.cosmetics.find(
    new CosmeticSearchBuilder().type(CosmeticType.outfit).name(name).matchMethod(MatchMethod.Contains),
  );
  if (!skin) {
    console.log(`no outfit matching "${name}"`);
    return;
  }
  await party.me?.fakeEquipOutfit(skin.id);
  console.log(`fake-applied ${skin.name} (${skin.id}) — only others in your party see it`);
}

async function fakeEmote(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  const input = await ask('emote/emoji name, or a full /Game def path: ');
  if (!input) return;

  if (input.includes('/')) {
    await party.me?.fakeEmote(input);
    console.log('applied that def path as a fake emote');
    return;
  }

  const emote = await fortnite.cosmetics.find(
    new CosmeticSearchBuilder().type(CosmeticType.emote).name(input).matchMethod(MatchMethod.Contains),
  );
  if (emote) {
    await party.me?.fakeEmote(emote.id);
    console.log(`fake emote ${emote.name} (${emote.id})`);
    return;
  }
  console.log(`no emote matching "${input}"`);
}

async function fakeReadyToggle(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  fakeReadyState = !fakeReadyState;
  await party.me?.fakeReady(fakeReadyState);
  console.log(`ready state set to ${fakeReadyState ? 'Ready' : 'NotReady'}`);
}

async function fakeCrown(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  const wins = Number.parseInt(await ask('victory-crown wins: '), 10);
  if (!Number.isFinite(wins)) return;
  const playEmote = /^y/i.test(await ask('play Crowning Achievement emote after? [y/N]: '));
  await party.me?.fakeCrown(wins, playEmote);
  console.log(`fake crown set to ${wins} win(s)${playEmote ? ' + Crowning Achievement emote' : ''}`);
}

async function fakeSidekick(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  const id = await ask('companion id (e.g. PetCarrier_Doggo), blank to clear: ');
  await party.me?.fakeSidekick(id || null);
  console.log(id ? `fake sidekick ${id}` : 'sidekick cleared');
}

async function fakeJamTrackByKey(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  const input = await ask('jam track key (digits / sid_placeholder_430), name, or full /Game def path: ');
  if (!input) return;

  if (input.includes('/')) {
    await party.me?.fakeJam(input);
    console.log('applied that def path as a fake jam track');
    return;
  }

  let key = input;
  if (!/^(sid_|\d)/i.test(input)) {
    const tracks = await fortnite.cosmetics.tracks();
    const track = tracks.find((t) => t.title.toLowerCase().includes(input.toLowerCase()));
    if (!track) {
      console.log(`no jam track matching "${input}"`);
      return;
    }
    key = track.id;
    console.log(`found "${track.title}" by ${track.artist} (id ${track.id})`);
  }

  const partName = (await ask('part [vocals/lead/bass/drums] (default vocals): ')).toLowerCase();
  const part: JamPartValue =
    partName in JamPart ? JamPart[partName as keyof typeof JamPart] : JamPart.vocals;
  await party.me?.fakeJamTrack(key, part);
  console.log(`fake jam track ${key} (${part})`);
}

async function fakeBanner(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  const icon = await ask('banner icon id: ');
  if (!icon) return;
  const color = await ask('banner color id (e.g. DefaultColor18), blank to skip: ');
  await party.me?.fakeBanner(icon, color || undefined);
  console.log(`fake banner ${icon}${color ? ` / ${color}` : ''}`);
}

async function fakeLevel(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  const level = Number.parseInt(await ask('battle pass level: '), 10);
  if (!Number.isFinite(level)) return;
  await party.me?.fakeLevel(level);
  console.log(`fake level set to ${level}`);
}

async function fakePlatform(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  const platform = await ask('platform (WIN/PSN/XBL/SWT/AND/IOS): ');
  if (!platform) return;
  await party.me?.fakePlatform(platform);
  console.log(`fake platform ${platform.toUpperCase()}`);
}

let fakePlayingState = false;

async function fakePlayingToggle(): Promise<void> {
  const active = await getSession();
  const party = await active.getParty();
  fakePlayingState = !fakePlayingState;
  await party.me?.fakePlaying(fakePlayingState);
  console.log(`playing state set to ${fakePlayingState ? 'InGame' : 'PreLobby'}`);
}

async function friendsSummary(): Promise<void> {
  const active = await getSession();
  const summary = await active.friendsSummary();
  console.log(`friends:   ${summary.friends.length}`);
  console.log(`incoming:  ${summary.incoming.length}`);
  console.log(`outgoing:  ${summary.outgoing.length}`);
  console.log(`suggested: ${summary.suggested.length}`);
  console.log(`blocked:   ${summary.blocklist.length}`);
  const shown = summary.friends.slice(0, 15);
  const names = await active.resolveAccountNames(shown.map((friend) => friend.accountId));
  for (const friend of shown) {
    const name = names.get(friend.accountId) ?? friend.accountId;
    const nickname = friend.nickname ? ` "${friend.nickname}"` : '';
    console.log(`  ${name}${nickname}${friend.favorite ? ' *' : ''}`);
  }
}

async function friendsList(): Promise<void> {
  const active = await getSession();
  const friends = await active.friendsListResolved();
  console.log(`${friends.length} friends:`);
  for (const friend of friends.slice(0, 25)) {
    const name = friend.displayName ?? friend.accountId;
    const nickname = friend.nickname ? ` "${friend.nickname}"` : '';
    const note = friend.note ? `  — ${friend.note}` : '';
    console.log(`  ${name}${nickname}${note}`);
  }
}

async function friendsRequests(): Promise<void> {
  const active = await getSession();
  const [incoming, outgoing] = await Promise.all([
    active.incomingFriendRequests(),
    active.outgoingFriendRequests(),
  ]);
  console.log(`incoming (${incoming.length}):`);
  for (const req of incoming.slice(0, 15)) console.log(`  ${req.accountId}`);
  console.log(`outgoing (${outgoing.length}):`);
  for (const req of outgoing.slice(0, 15)) console.log(`  ${req.accountId}`);
}

async function friendsAdd(): Promise<void> {
  const active = await getSession();
  const id = await ask('account id to add/accept: ');
  if (!id) return;
  await active.addFriend(id);
  console.log(`sent/accepted friend request to ${id}`);
}

async function friendsRemove(): Promise<void> {
  const active = await getSession();
  const id = await ask('account id to remove: ');
  if (!id) return;
  await active.removeFriend(id);
  console.log(`removed ${id}`);
}

async function friendsNickname(): Promise<void> {
  const active = await getSession();
  const id = await ask('friend account id: ');
  if (!id) return;
  const nickname = await ask('nickname (blank to clear): ');
  if (nickname) {
    await active.setFriendNickname(id, nickname);
    console.log(`set nickname "${nickname}" on ${id}`);
  } else {
    await active.removeFriendNickname(id);
    console.log(`cleared nickname on ${id}`);
  }
}

async function friendsBlocklist(): Promise<void> {
  const active = await getSession();
  const blocked = await active.blocklist();
  console.log(`${blocked.length} blocked:`);
  for (const entry of blocked.slice(0, 25)) console.log(`  ${entry.accountId}  (${entry.created})`);
}

async function friendsBlock(): Promise<void> {
  const active = await getSession();
  const id = await ask('account id to block: ');
  if (!id) return;
  await active.blockAccount(id);
  console.log(`blocked ${id}`);
}

async function friendsUnblock(): Promise<void> {
  const active = await getSession();
  const id = await ask('account id to unblock: ');
  if (!id) return;
  await active.unblockAccount(id);
  console.log(`unblocked ${id}`);
}

function printStandings(standings: RankedStanding[]): void {
  if (standings.length === 0) {
    console.log('  no ranked tracks');
    return;
  }
  for (const standing of standings) {
    const mode = standing.mode.name.padEnd(26);
    if (!standing.played) {
      console.log(`  ${mode} Unranked`);
      continue;
    }
    const placement = standing.unrealRank !== null ? ` #${standing.unrealRank}` : ` ${Math.round(standing.progress * 100)}%`;
    const peak = standing.highest.division > standing.current.division ? `  (peak ${standing.highest.name})` : '';
    const seasonal = standing.current.seasonalName ? ` "${standing.current.seasonalName}"` : '';
    const season = standing.active ? '' : `  [${standing.track?.endTime.slice(0, 10) ?? 'past'}]`;
    console.log(`  ${mode} ${standing.current.name}${seasonal}${placement}${peak}${season}`);
  }
}

async function pickTournament(active: EpicAuthSession): Promise<Tournament | null> {
  const region = ((await ask('region (NAE/NAW/NAC/EU/BR/ASIA/OCE/ME, blank = EU): ')) || 'EU').toUpperCase();
  const tournaments = await active.tournaments({ region, showPastEvents: true });
  if (tournaments.length === 0) {
    console.log('no tournaments');
    return null;
  }
  tournaments.slice(0, 30).forEach((tournament, index) => {
    const when = tournament.nextWindow ? new Date(tournament.nextWindow.beginTime).toLocaleString() : 'finished';
    console.log(`  ${String(index + 1).padStart(2)}. [${tournament.status}] ${tournament.name} — ${when}`);
  });
  const picked = tournaments[Number.parseInt(await ask('tournament number: '), 10) - 1];
  if (!picked) console.log('no such tournament');
  return picked ?? null;
}

async function listTournaments(): Promise<void> {
  const active = await getSession();
  const region = ((await ask('region (blank = EU): ')) || 'EU').toUpperCase();
  for (const tournament of await active.tournaments({ region })) {
    const next = tournament.nextWindow;
    const eligible = next?.eligible === false ? ' (not eligible)' : '';
    console.log(`[${tournament.status}] ${tournament.name} · ${tournament.type ?? '?'}${eligible}`);
    if (next) console.log(`    round ${next.round} ${new Date(next.beginTime).toLocaleString()} → ${new Date(next.endTime).toLocaleString()} · ${next.playlistId ?? '?'}`);
  }
}

async function tournamentDetail(): Promise<void> {
  const active = await getSession();
  const tournament = await pickTournament(active);
  if (!tournament) return;
  console.log(`${tournament.name}${tournament.subtitle ? ` — ${tournament.subtitle}` : ''}`);
  if (tournament.description) console.log(tournament.description);
  console.log(`min level ${tournament.minimumAccountLevel ?? '?'} · regions ${tournament.regions.join(', ')}`);
  for (const window of tournament.windows) {
    const prizes = window.payouts.flatMap((tier) => tier.ranks).length;
    console.log(
      `  ${window.id} [${window.status}] ${new Date(window.beginTime).toLocaleString()} · cap ${window.matchCap ?? '?'} · ${prizes} prize tier(s) · ${window.brackets.length} bracket(s) · eligible ${window.eligible}`,
    );
  }
}

async function tournamentLeaderboard(): Promise<void> {
  const active = await getSession();
  const tournament = await pickTournament(active);
  if (!tournament) return;
  tournament.windows.forEach((window, index) => console.log(`  ${index + 1}. ${window.id} [${window.status}]`));
  const window = tournament.windows[Number.parseInt(await ask('window number: '), 10) - 1];
  if (!window) return;
  const page = Number.parseInt((await ask('page (0-99, blank = 0): ')) || '0', 10);
  const board = await active.tournamentLeaderboard(tournament.eventId, window.id, { page });
  console.log(`page ${board.page + 1}/${board.totalPages}, updated ${board.updatedTime}`);
  const ids = [...new Set(board.entries.slice(0, 25).flatMap((entry) => entry.teamAccountIds))];
  const names = new Map((await active.accountsByIds(ids)).map((account) => [account.id, account.displayName]));
  for (const entry of board.entries.slice(0, 25)) {
    console.log(`  #${entry.rank} ${entry.pointsEarned} pts — ${entry.teamAccountIds.map((id) => names.get(id) ?? id).join(', ')}`);
  }
}

async function myTournamentHistory(): Promise<void> {
  const active = await getSession();
  const tournament = await pickTournament(active);
  if (!tournament) return;
  const history = await active.tournamentHistory(tournament.eventId);
  if (history.length === 0) console.log('no scores in this tournament');
  for (const score of history) {
    console.log(`  ${score.scoreKey?.eventWindowId ?? score.eventWindowId}: #${score.rank} · ${score.pointsEarned} pts · ${score.sessionHistory.length} match(es)`);
  }
}

async function myTournamentTokens(): Promise<void> {
  const active = await getSession();
  const player = await active.tournamentPlayer();
  console.log(`${player.tokens.length} tokens:`);
  console.log(player.tokens.join(', '));
}

function printIsland(island: Island): void {
  console.log(`${island.title} (${island.code}) by ${island.creator.name || island.creator.accountId}`);
  console.log(`  ${island.type} v${island.version} · ${island.state ?? (island.active ? 'active' : 'inactive')} · ${island.moderationStatus ?? '?'}`);
  if (island.tagline) console.log(`  ${island.tagline}`);
  if (island.tags.length) console.log(`  tags: ${island.tags.join(', ')}`);
  if (island.players.max !== null) console.log(`  players: ${island.players.min ?? '?'}-${island.players.max}`);
  if (island.image) console.log(`  image: ${island.image}`);
}

async function islandLookup(): Promise<void> {
  const code = (await ask('island / playlist code: ')).trim();
  if (!code) return;
  const island = await (await getSession()).island(code);
  if (!island) {
    console.log(`no active link for "${code}"`);
    return;
  }
  printIsland(island);
}

async function islandRelatedView(): Promise<void> {
  const code = (await ask('island / playlist code: ')).trim();
  if (!code) return;
  const related = await (await getSession()).islandRelated(code);
  console.log(`parents: ${related.parentLinks.map((link) => link.mnemonic).join(', ') || 'none'}`);
  console.log(`links: ${Object.keys(related.links).join(', ')}`);
}

async function creatorIslandsView(): Promise<void> {
  const active = await getSession();
  const name = (await ask('creator display name: ')).trim();
  if (!name) return;
  const account = await active.accountByDisplayName(name);
  const page = await active.creatorIslands(account.id);
  if (page.links.length === 0) {
    console.log('no published islands');
    return;
  }
  const islands = await active.islands(page.links.map((link) => link.linkCode));
  const titles = new Map(islands.map((island) => [island.code, island.title]));
  for (const link of page.links) {
    console.log(`  ${link.linkCode} ${titles.get(link.linkCode) ?? ''}${link.globalCCU >= 0 ? ` · ${link.globalCCU} playing` : ''}`);
  }
  if (page.hasMore) console.log('  …more available');
}

async function myIslandsView(): Promise<void> {
  const mine = await (await getSession()).myIslands();
  if (mine.length === 0) console.log('no links on this account');
  for (const island of mine) printIsland(island);
}

const questCatalog = new QuestCatalog(fncc.quests);

function printQuest(quest: Quest, indent = '    '): void {
  const objectives = quest.objectives
    .map((objective) => `${objective.progress}/${objective.target ?? '?'}`)
    .join(', ');
  const stage = quest.objectives.find((objective) => objective.stage !== null && objective.stageCount !== null);
  const flags = [
    stage ? `stage ${stage.stage}/${stage.stageCount}` : null,
    quest.completed ? 'done' : null,
    quest.tracked ? 'tracked' : null,
  ]
    .filter(Boolean)
    .join(', ');
  console.log(`${indent}${quest.name ?? quest.templateId} — ${objectives}${flags ? ` (${flags})` : ''}`);
}

async function questLogView(): Promise<void> {
  const active = await getSession();
  const raw = (await ask('mode (battle-royale/festival/lego/rocket-racing/…, blank = all): ')).trim();
  const log = await new QuestBook(active, questCatalog).log(raw ? { mode: raw as QuestMode } : {});
  if (log.xp) console.log(`season ${log.xp.seasonNumber} · level ${log.xp.seasonLevel}`);
  for (const category of log.categories) {
    console.log(`\n${category.name}${category.mode ? ` [${category.mode}]` : ''}`);
    for (const header of category.headers) {
      if (header.name) console.log(`  ${header.name}`);
      for (const quest of header.quests) printQuest(quest);
    }
  }
  if (log.uncategorized.length) {
    console.log(`\nOther (${log.uncategorized.length})`);
    for (const quest of log.uncategorized.slice(0, 20)) printQuest(quest);
  }
}

async function stwQuestLogView(): Promise<void> {
  const log = await new QuestBook(await getSession(), questCatalog).stw();
  console.log(`save the world · ${log.quests.length} active quests · ${log.dailyRerolls} daily reroll(s) left`);
  for (const category of log.categories) {
    console.log(`\n${category.name}`);
    for (const quest of category.quests) printQuest(quest);
  }
  if (log.uncategorized.length) {
    console.log('\nOther');
    for (const quest of log.uncategorized) printQuest(quest);
  }
}

async function rerollStwDaily(): Promise<void> {
  const book = new QuestBook(await getSession(), questCatalog);
  const log = await book.stw();
  if (log.dailies.length === 0) {
    console.log('no active STW daily quests');
    return;
  }
  console.log(`STW daily quests (the only rerollable ones) · ${log.dailyRerolls} reroll(s) left today:`);
  log.dailies.forEach((quest, index) => printQuest(quest, `  ${index + 1}. `));
  if (log.dailyRerolls <= 0) {
    console.log('no rerolls left — they refresh with the daily reset');
    return;
  }
  const quest = log.dailies[Number.parseInt(await ask('daily to reroll: '), 10) - 1];
  if (!quest) return;
  if (!/^y/i.test(await ask(`reroll "${quest.name ?? quest.templateId}" on your REAL account? [y/N]: `))) return;
  await book.reroll(quest);
  const after = await book.stw();
  console.log(`rerolled · ${after.dailyRerolls} reroll(s) left. dailies now:`);
  after.dailies.forEach((entry, index) => printQuest(entry, `  ${index + 1}. `));
}

async function questLookup(): Promise<void> {
  const id = (await ask('quest template id (e.g. Quest:quest_s42_weekly_w07_q01): ')).trim();
  if (!id) return;
  const quest = await fncc.quests.get(id);
  console.log(`${quest.name ?? quest.templateId} [${quest.source}]`);
  if (quest.description) console.log(`  ${quest.description}`);
  for (const [objectiveId, objective] of Object.entries(quest.objectives)) {
    console.log(`  ${objectiveId}: ${objective.description ?? '?'} (${objective.count ?? '?'})`);
  }
}

async function saveQuestCatalog(): Promise<void> {
  const file = (await ask('save catalog to (blank = quest-catalog.json): ')).trim() || 'quest-catalog.json';
  writeFileSync(file, JSON.stringify(await questCatalog.export()));
  console.log(`saved ${questCatalog.size} quest entries to ${file}`);
}

async function rankedMyStandings(): Promise<void> {
  const active = await getSession();
  console.log(`ranked for ${active.displayName ?? active.accountId}:`);
  printStandings(await active.rankedStandings());
}

async function rankedPlayerStandings(): Promise<void> {
  const name = (await ask('display name: ')).trim();
  if (!name) return;
  const active = await getSession();
  const account = await active.accountByDisplayName(name);
  console.log(`ranked for ${account.displayName}:`);
  printStandings(await active.rankedStandings(account.id));
}

async function rankedHistory(): Promise<void> {
  const active = await getSession();
  const history = await active.rankedStandings(undefined, { history: true, playedOnly: true });
  console.log(`${history.length} played ranked track(s):`);
  printStandings(history);
}

async function rankedTracks(): Promise<void> {
  const active = await getSession();
  const tracks = await active.rankedTracks();
  console.log(`${tracks.length} tracks:`);
  for (const track of tracks.slice(0, 20)) {
    console.log(`  ${track.trackguid}  ${track.rankingType}  (${track.divisionCount} divisions)`);
  }
}

async function rankedMyProgress(): Promise<void> {
  const active = await getSession();
  const guid = await ask('track guid: ');
  if (!guid) return;
  const progress = await active.rankedProgress(guid);
  console.log(`account:      ${progress.accountId}`);
  console.log(`ranking type: ${progress.rankingType}`);
  console.log(`division:     ${progress.currentDivision} (peak ${progress.highestDivision})`);
  console.log(`promotion:    ${(progress.promotionProgress * 100).toFixed(1)}%`);
  console.log(`ranking:      ${progress.currentPlayerRanking ?? 'n/a'}`);
  console.log(`updated:      ${progress.lastUpdated}`);
}

async function rankedAllProgress(): Promise<void> {
  const active = await getSession();
  const all = await active.rankedProgressAll();
  console.log(`${all.length} tracks with progress:`);
  for (const progress of all.slice(0, 20)) {
    console.log(`  ${progress.rankingType}  div ${progress.currentDivision} (peak ${progress.highestDivision})`);
  }
}

async function externalConnections(): Promise<void> {
  const active = await getSession();
  const connections = await active.externalAuths();
  if (connections.length === 0) {
    console.log('no external connections linked');
    return;
  }
  console.log(`${connections.length} linked connection(s):`);
  for (const conn of connections) {
    const name = conn.externalDisplayName ?? conn.externalAuthId ?? '?';
    console.log(`  ${conn.type}  ${name}  (added ${conn.dateAdded ?? '?'})`);
  }
}

async function lookupExternalDisplayName(): Promise<void> {
  const active = await getSession();
  const type = await ask('external auth type (xbl/psn/nintendo): ');
  if (!type) return;
  const name = await ask('external display name: ');
  if (!name) return;
  const matches = await active.accountByExternalDisplayName(type, name, { caseInsensitive: true });
  console.log(`${matches.length} match(es):`);
  for (const match of matches.slice(0, 15)) {
    console.log(`  ${match.id}  ${match.displayName}`);
  }
}

async function searchUsers(): Promise<void> {
  const active = await getSession();
  const prefix = await ask('username to search: ');
  if (!prefix) return;
  const platform = (await ask('platform (epic/psn/xbl/steam/nsw, blank = epic): ')) || undefined;
  const results = await active.searchUsersResolved(prefix, platform ? { platform } : undefined);
  if (results.length === 0) {
    console.log('no matches');
    return;
  }
  console.log(`${results.length} match(es):`);
  for (const result of results.slice(0, 20)) {
    const name = result.displayName ?? result.accountId;
    const platforms = result.matches.map((m) => `${m.platform}:${m.value}`).join(', ');
    console.log(`  [${result.matchType}] ${name}  (${platforms})`);
  }
}

async function accountMetadata(): Promise<void> {
  const active = await getSession();
  const metadata = await active.accountMetadata();
  const keys = Object.keys(metadata);
  if (keys.length === 0) {
    console.log('no metadata on this account');
    return;
  }
  console.log(`${keys.length} metadata field(s):`);
  for (const key of keys) console.log(`  ${key} = ${metadata[key]}`);
}

async function presenceLastOnline(): Promise<void> {
  const active = await getSession();
  const id = await ask('account id (blank = you): ');
  const entry = await active.lastOnlineFor(id || undefined);
  if (!entry) {
    console.log('no last-online record');
    return;
  }
  console.log(`last online: ${entry.last_online}`);
}

async function serviceStatus(): Promise<void> {
  const active = await getSession();
  const status = await active.serviceStatus();
  console.log(`service:     ${status.serviceInstanceId}`);
  console.log(`status:      ${status.status}`);
  console.log(`message:     ${status.message ?? '(none)'}`);
  console.log(`banned:      ${status.banned ?? false}`);
  console.log(`maintenance: ${status.maintenanceUri ?? '(none)'}`);
  console.log(`actions:     ${status.allowedActions?.join(', ') ?? '(none)'}`);
}

async function accountVbucks(): Promise<void> {
  const active = await getSession();
  const balance = await active.vbucksBalance();
  console.log(`platform: ${balance.platform}`);
  console.log(`total:    ${balance.total} V-Bucks`);
  if (balance.entries.length === 0) {
    console.log('no currency items on this account');
    return;
  }
  console.log('breakdown:');
  for (const entry of balance.entries) {
    const source = entry.platform ? `${entry.category} (${entry.platform})` : entry.category;
    console.log(`  ${String(entry.amount).padStart(7)}  ${source}`);
  }
}

async function accountSetPlatform(): Promise<void> {
  const active = await getSession();
  console.log(`valid platforms: ${MTX_PLATFORM_LIST.join(', ')}`);
  const platform = await ask('new V-Bucks platform: ');
  if (!platform) return;
  await active.setMtxPlatform(platform);
  const current = await active.mtxPlatform();
  console.log(`platform set to ${current}`);
}

async function accountReceipts(): Promise<void> {
  const active = await getSession();
  const receipts = await active.receipts();
  console.log(`${receipts.length} receipt(s):`);
  for (const receipt of receipts.slice(0, 20)) {
    console.log(`  ${receipt.appStore}  ${receipt.receiptId}`);
  }
}

async function accountUserStats(): Promise<void> {
  const active = await getSession();
  const stats = await active.userStats();
  if (!stats) {
    console.log('stats are private or empty');
    return;
  }
  const keys = Object.keys(stats.stats);
  console.log(`${keys.length} stat(s) for ${stats.accountId}:`);
  for (const key of keys.slice(0, 20)) console.log(`  ${key} = ${stats.stats[key]}`);
}

async function accountTimeline(): Promise<void> {
  const active = await getSession();
  const timeline = await active.timeline();
  const channels = Object.keys(timeline.channels);
  console.log(`server time: ${timeline.currentTime}`);
  console.log(`${channels.length} channel(s):`);
  for (const channel of channels.slice(0, 20)) console.log(`  ${channel}`);
}

function preview(value: unknown, max = 140): string {
  const text = JSON.stringify(value);
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function sessionInfoSummary(): Promise<void> {
  const active = await getSession();
  console.log(`account:     ${active.displayName} (${active.accountId})`);
  console.log(`expires at:  ${active.expiresAt.toISOString()}`);
  console.log(`expires in:  ${Math.round(active.expiresInMs / 1000)}s`);
  console.log(`expired:     ${active.isExpired}`);
  console.log(`can refresh: ${active.canRefresh}`);
}

async function sessionRefresh(): Promise<void> {
  const active = await getSession();
  await active.refresh();
  console.log(`refreshed — new expiry ${active.expiresAt.toISOString()}`);
}

async function sessionVerify(): Promise<void> {
  const active = await getSession();
  const info = await active.verify({ includePerms: true });
  console.log(preview(info, 400));
}

async function sessionKillOthers(): Promise<void> {
  const active = await getSession();
  if (!/^y/i.test(await ask('kill ALL OTHER sessions for this account? [y/N]: '))) {
    console.log('cancelled');
    return;
  }
  await active.killOtherSessions();
  console.log('killed other sessions');
}

async function accountById(): Promise<void> {
  const active = await getSession();
  const id = await ask('account id: ');
  if (!id) return;
  const account = await active.account(id);
  console.log(`${account.displayName} (${account.id})`);
}

async function accountByName(): Promise<void> {
  const active = await getSession();
  const name = await ask('epic display name: ');
  if (!name) return;
  const account = await active.accountByDisplayName(name);
  console.log(`${account.displayName} (${account.id})`);
}

async function friendDetail(): Promise<void> {
  const active = await getSession();
  const id = await ask('friend account id: ');
  if (!id) return;
  const [friend, mutuals] = await Promise.all([active.friend(id), active.mutualFriends(id)]);
  console.log(`${friend.accountId}${friend.nickname ? ` "${friend.nickname}"` : ''}`);
  console.log(`favorite: ${friend.favorite ?? false}`);
  console.log(`note:     ${friend.note ?? '(none)'}`);
  console.log(`mutuals:  ${mutuals.length}`);
}

async function friendsSuggested(): Promise<void> {
  const active = await getSession();
  const suggested = await active.suggestedFriends();
  console.log(`${suggested.length} suggested:`);
  for (const entry of suggested.slice(0, 20)) console.log(`  ${entry.accountId}`);
}

async function friendNote(): Promise<void> {
  const active = await getSession();
  const id = await ask('friend account id: ');
  if (!id) return;
  const note = await ask('note (blank to clear): ');
  if (note) {
    await active.setFriendNote(id, note);
    console.log(`set note on ${id}`);
  } else {
    await active.removeFriendNote(id);
    console.log(`cleared note on ${id}`);
  }
}

async function rankedTrackDetail(): Promise<void> {
  const active = await getSession();
  const guid = await ask('track guid: ');
  if (!guid) return;
  const track = await active.rankedTrack(guid);
  console.log(`${track.trackguid}  ${track.rankingType}  (${track.divisionCount} divisions)`);
  console.log(`begins: ${track.beginTime ?? '?'}  ends: ${track.endTime ?? '?'}`);
}

async function leaderboardView(): Promise<void> {
  const active = await getSession();
  const name = await ask('leaderboard name: ');
  if (!name) return;
  const board = await active.leaderboard(name);
  console.log(preview(board, 400));
}

async function quickVbucks(): Promise<void> {
  const active = await getSession();
  const total = await active.vbucks();
  console.log(`${total} V-Bucks`);
}

async function brInventoryView(): Promise<void> {
  const active = await getSession();
  const inventory = await active.brInventory();
  console.log(preview(inventory, 400));
}

async function commonCoreView(): Promise<void> {
  const active = await getSession();
  const profile = await active.commonCore();
  const items = Object.keys(profile.items).length;
  const platform = profile.stats.attributes.current_mtx_platform ?? '?';
  console.log(`common_core — ${items} items, mtx platform ${platform}`);
}

async function playtimeView(): Promise<void> {
  const active = await getSession();
  const all = await active.playtimeAll();
  console.log(`${all.length} playtime record(s):`);
  for (const entry of all.slice(0, 20)) console.log(`  ${preview(entry)}`);
}

async function contentNotices(): Promise<void> {
  const notices = await epic.content.emergencyNotices();
  console.log(notices.length === 0 ? 'no emergency notices right now' : `${notices.length} emergency notice(s):`);
  for (const notice of notices) {
    console.log(`  ${notice.hidden ? '(hidden) ' : ''}${notice.title}: ${notice.body}`);
  }
  const login = await epic.content.loginMessage();
  if (login) console.log(`login message: ${login.title} — ${login.body}`);
}

async function contentMotds(): Promise<void> {
  const active = await getSession();
  const motds = await active.motds();
  console.log(motds.length === 0 ? 'no motds right now' : `${motds.length} motd(s):`);
  for (const motd of motds) {
    const fields = motd.contentFields;
    console.log(`  ${fields.TeaserTitle ?? fields.FullScreenTitle ?? motd.contentHash}`);
    if (fields.FullScreenBody) console.log(`    ${fields.FullScreenBody.split('\n')[0]}`);
  }
}

async function contentTournaments(): Promise<void> {
  const tournaments = await epic.content.tournaments();
  console.log(`${tournaments.length} tournament display entries (showing 15):`);
  for (const tournament of tournaments.slice(0, 15)) {
    const title = tournament.long_format_title ?? [tournament.title_line_1, tournament.title_line_2].filter(Boolean).join(' ');
    console.log(`  ${tournament.tournament_display_id.padEnd(36)} ${title}`);
  }
}

async function contentBackgrounds(): Promise<void> {
  for (const background of await epic.content.backgrounds()) {
    console.log(`  ${background.key.padEnd(8)} ${background.stage.padEnd(16)} ${background.backgroundimage ?? '(default)'}`);
  }
}

async function contentBuild(): Promise<void> {
  const version = await epic.game.version();
  console.log(`server:  ${version.version} (CL ${version.cln}, built ${version.buildDate})`);
  const active = await getSession();
  const build = await active.fortniteBuild();
  console.log(`client:  ${build.version} (CL ${build.changelist})  ${build.buildVersion}`);
}

async function contentInstaller(): Promise<void> {
  const installer = await epic.launcher.installer(LauncherInstaller.LauncherWindows);
  console.log(`${installer.fileName ?? installer.app}: ${installer.url}`);
}

async function islandPackageView(): Promise<void> {
  const code = (await ask('island code (e.g. 7865-8305-9184): ')).trim();
  if (!code) return;
  const active = await getSession();
  const pack = await active.islandPackage(code);
  console.log(`${pack.projectFlags.meta.title} — ${pack.status}, ${pack.content.length} modules, encrypted: ${pack.isEncrypted}`);
  console.log(`live link v${pack.projectFlags.liveLink.linkVersion}, published ${pack.projectFlags.liveLink.lastPublished}`);
  console.log(`root module ${pack.resolved.root.moduleId} v${pack.resolved.root.version}`);
}

async function islandKeysView(): Promise<void> {
  const code = (await ask('island code: ')).trim();
  if (!code) return;
  const active = await getSession();
  const keys = await active.islandKeys(code);
  if (keys.length === 0) {
    console.log('island is not encrypted');
    return;
  }
  for (const key of keys) console.log(`  guid ${key.guid}\n  key  ${key.key}`);
}

async function islandLaunch(): Promise<void> {
  const code = (await ask('island code to launch on this account: ')).trim();
  if (!code) return;
  if ((await ask(`queue ${code} on your account? (y/N): `)).trim().toLowerCase() !== 'y') return;
  const active = await getSession();
  const result = await active.launchIsland(code);
  console.log(result.status === 'notified' ? 'launched in the running game' : `status: ${result.status}`);
}

async function libraryView(): Promise<void> {
  const active = await getSession();
  const records = await active.libraryAll();
  console.log(`${records.length} library record(s):`);
  for (const record of records.slice(0, 30)) {
    const name = record.sandboxName ?? record.namespace;
    console.log(`  ${name} — ${record.recordType ?? '?'} (${record.catalogItemId})`);
  }
}

async function libraryItemView(): Promise<void> {
  const active = await getSession();
  const id = (await ask('catalog item id (or appName): ')).trim();
  if (!id) {
    console.log('cancelled');
    return;
  }
  const records = await active.libraryAll();
  const needle = id.toLowerCase();
  const record = records.find(
    (r) => r.catalogItemId.toLowerCase() === needle || r.appName?.toLowerCase() === needle,
  );
  if (!record) {
    console.log(`no library record for "${id}"`);
    return;
  }
  console.log(`name:        ${record.sandboxName ?? record.namespace}`);
  console.log(`namespace:   ${record.namespace}`);
  console.log(`catalogItem: ${record.catalogItemId}`);
  console.log(`appName:     ${record.appName ?? '-'}`);
  console.log(`productId:   ${record.productId ?? '-'}`);
  console.log(`recordType:  ${record.recordType ?? '-'}`);
  console.log(`acquired:    ${record.acquisitionDate ?? '-'}`);
  console.log(`sandboxType: ${record.sandboxType ?? '-'}`);
  console.log(`deps:        ${record.dependencies?.length ? record.dependencies.join(', ') : '-'}`);
  console.log(`raw:         ${preview(record, 600)}`);
}

async function libraryCollectionsView(): Promise<void> {
  const active = await getSession();
  const collections = await active.libraryCollections();
  console.log(`${collections.length} collection(s):`);
  for (const collection of collections) {
    console.log(`  ${collection.name} (${collection.collectionId})`);
  }
}

async function libraryCollectionItemsView(): Promise<void> {
  const active = await getSession();
  const collectionId = await ask('collection id: ');
  if (!collectionId) {
    console.log('cancelled');
    return;
  }
  const items = await active.libraryCollectionItems(collectionId);
  console.log(`${items.length} item(s):`);
  for (const item of items.slice(0, 30)) console.log(`  ${preview(item)}`);
}

async function avatarView(): Promise<void> {
  const active = await getSession();
  const id = await ask('account id (blank = you): ');
  const resolved = await active.resolveAvatar(id || undefined, { size: AvatarIconSize.Icon });
  if (!resolved) {
    console.log('no avatar record');
    return;
  }
  console.log(`avatarId:    ${resolved.avatarId}`);
  console.log(`characterId: ${resolved.characterId ?? 'none'}`);
  console.log(`source:      ${resolved.source}`);
  console.log(`iconUrl:     ${resolved.iconUrl ?? 'none'}`);
  for (const [source, url] of Object.entries(resolved.iconUrls)) {
    console.log(`  ${source.padEnd(12)} ${url ?? 'none'}`);
  }
}

async function matchmakingSessions(): Promise<void> {
  const active = await getSession();
  const sessions = await active.sessionInfo();
  console.log(`${sessions.length} session(s):`);
  for (const s of sessions.slice(0, 15)) console.log(`  ${preview(s)}`);
}

async function matchmakingBanCheck(): Promise<void> {
  const active = await getSession();
  const result = await active.checkBan();
  console.log(preview(result, 300));
}

async function matchmakingNetCl(): Promise<void> {
  const active = await getSession();
  const netCL = await active.matchmakingNetCL();
  console.log(`current netCL (buildUniqueId): ${netCL}`);
}

async function socialBanCheck(): Promise<void> {
  const active = await getSession();
  const accountId = (await ask('account id (blank = you): ')).trim();
  const status = await active.socialBan(accountId.length > 0 ? accountId : undefined);
  console.log(`active: ${status.active}`);
  console.log(`bans: ${status.bans.length}  warnings: ${status.warnings.length}`);
  console.log(preview(status, 300));
}

function describePresence(presence: FriendPresence, name?: string): string {
  const who = name ? `${name} (${presence.accountId})` : presence.accountId;
  const state = presence.available ? presence.show ?? 'online' : 'offline';
  const platform = presence.platform ? ` [${presence.platform}]` : '';
  const statusText = presence.statusText ?? presence.status?.Status;
  const text = statusText ? ` — ${statusText}` : '';
  const flags = [presence.playing ? 'playing' : null, presence.joinable ? 'joinable' : null]
    .filter(Boolean)
    .join(', ');
  const flagText = flags ? ` (${flags})` : '';
  return `${who}  ${state}${platform}${text}${flagText}`;
}

async function xmppConnectWatch(): Promise<void> {
  const active = await getSession();
  const client = await active.connectXmpp();
  console.log(`connected — jid ${client.jid}`);
  console.log(`resource   ${client.resource}`);
  console.log('watching presence + messages for 20s...\n');

  const onPresence = (presence: FriendPresence): void => {
    console.log(`presence  ${describePresence(presence)}`);
  };
  const onMessage = (message: XmppMessage): void => {
    console.log(`message   ${message.accountId}: ${message.body}`);
  };
  const onReconnecting = ({ attempt, delay }: { attempt: number; delay: number }): void => {
    console.log(`reconnect scheduled — attempt ${attempt} in ${delay}ms`);
  };
  const onDisconnected = ({ code }: { code: number; reason: string }): void => {
    console.log(`disconnected (code ${code})`);
  };
  const onConnected = (): void => {
    console.log(`connected — jid ${client.jid}`);
  };

  client.on('presence', onPresence);
  client.on('message', onMessage);
  client.on('reconnecting', onReconnecting);
  client.on('disconnected', onDisconnected);
  client.on('connected', onConnected);
  await new Promise((resolve) => setTimeout(resolve, 20_000));
  client.off('presence', onPresence);
  client.off('message', onMessage);
  client.off('reconnecting', onReconnecting);
  client.off('disconnected', onDisconnected);
  client.off('connected', onConnected);

  console.log(`\ndone — ${client.presences.size} friends currently visible online`);
}

async function xmppListPresences(): Promise<void> {
  const active = await getSession();
  const client = await active.connectEvents();
  if (client.presences.size === 0) {
    console.log('opened EOS stream — collecting friend presence...');
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
  const presences = await active.friendPresences();
  if (presences.length === 0) {
    console.log('no friends currently online');
    return;
  }
  let names = new Map<string, EpicAccount>();
  try {
    names = await active.resolveAccounts(presences.map((presence) => presence.accountId));
  } catch {
    names = new Map();
  }
  console.log(`${presences.length} friends online:`);
  for (const presence of presences) {
    console.log(`  ${describePresence(presence, names.get(presence.accountId)?.displayName)}`);
  }
}

async function xmppSendMessage(): Promise<void> {
  const active = await getSession();
  const target = await ask('target account id: ');
  if (!target) return;
  const body = await ask('message: ');
  if (!body) return;
  const client = await active.connectXmpp();
  client.sendMessage(target, body);
  console.log(`sent to ${target}`);
}

async function xmppDisconnect(): Promise<void> {
  const active = await getSession();
  await active.disconnectXmpp();
  console.log('xmpp disconnected');
}

async function chatSendDM(): Promise<void> {
  const active = await getSession();
  const target = await ask('target account id: ');
  if (!target) return;
  const content = await ask('message: ');
  if (!content) return;
  const result = await active.sendDM(target, content);
  console.log('sent');
  console.log(preview(result, 200));
}

async function chatSendParty(): Promise<void> {
  const active = await getSession();
  const content = await ask('message: ');
  if (!content) return;
  const result = await active.sendPartyMessage(content);
  console.log('sent to party');
  console.log(preview(result, 200));
}

async function chatViewHistory(): Promise<void> {
  const active = await getSession();
  const target = await ask('target account id: ');
  if (!target) return;
  const messages = await active.chatHistory(target, { limit: 20 });
  if (messages.length === 0) {
    console.log('no messages in this conversation yet');
    return;
  }
  for (const message of messages.reverse()) {
    console.log(`  ${message.senderId ?? '?'}: ${message.body ?? ''}`);
  }
}

async function presenceSetCustomStatus(): Promise<void> {
  const active = await getSession();
  const status = await ask('custom status text (renders in-game): ');
  if (!status) return;
  console.log('  online indicator: 1) online  2) away  3) extended away');
  const pick = await ask('  choose 1-3 (blank = online): ');
  const onlineType = pick === '2' ? 'away' : pick === '3' ? 'xa' : 'online';
  const presence = await active.setCustomStatus(status, { onlineType });
  const stored = presence?.perNs[0]?.activity?.value ?? '(not echoed)';
  console.log(`custom status set — epic stored "${stored}" (${presence?.status ?? onlineType}), re-applied on every reconnect.`);
  console.log('(leaving this menu keeps the session; "disconnect live events" or "clear custom status" ends it)');
}

async function presenceClearCustomStatus(): Promise<void> {
  const active = await getSession();
  await active.clearCustomStatus();
  console.log('custom status cleared');
}

async function chatConnectEvents(): Promise<void> {
  const active = await getSession();
  const client = await active.connectEvents();
  console.log(`connected — connection ${client.connection ?? '(pending)'}`);
  console.log('watching live DM / party / presence events for 30s...\n');

  const onFriend = (message: ConnectFriendMessage): void => {
    console.log(`dm        ${message.accountId}: ${message.body}`);
  };
  const onParty = (message: ConnectPartyMessage): void => {
    console.log(`party     ${message.accountId}: ${message.body}`);
  };
  const onPresence = (presence: ConnectPresenceUpdate): void => {
    console.log(`presence  ${presence.accountId} ${preview(presence.payload, 80)}`);
  };

  client.on('friend:message', onFriend);
  client.on('party:message', onParty);
  client.on('presence', onPresence);
  await new Promise((resolve) => setTimeout(resolve, 30_000));
  client.off('friend:message', onFriend);
  client.off('party:message', onParty);
  client.off('presence', onPresence);
  console.log('\ndone watching');
}

async function chatDisconnectEvents(): Promise<void> {
  const active = await getSession();
  await active.disconnectEvents();
  console.log('live events disconnected');
}

async function shopList(): Promise<void> {
  const active = await getSession();
  const shop = await active.shop();
  console.log(`${shop.entries.length} catalog entries — expires ${shop.expiration ?? '?'}`);
  for (const entry of shop.entries.slice(0, 25)) {
    const price = entry.price ? `${entry.price.finalPrice} ${entry.price.currencyType}` : 'n/a';
    console.log(`  ${entry.offerId}  ${entry.name} — ${price} [${entry.giftable ? 'giftable' : 'not-giftable'}]`);
  }
}

async function shopGiftable(): Promise<void> {
  const active = await getSession();
  const shop = await active.shop();
  const giftable = shop.giftable;
  console.log(`${giftable.length} giftable entries:`);
  for (const entry of giftable.slice(0, 25)) {
    console.log(`  ${entry.name} — ${entry.price?.finalPrice ?? '?'} V-Bucks  (${entry.offerId})`);
  }
}

async function shopGift(): Promise<void> {
  const active = await getSession();
  const shop = await active.shop();
  const query = await ask('shop item name or offerId: ');
  if (!query) return;
  const entry = shop.find(query);
  if (!entry) {
    console.log(`no shop entry matches "${query}"`);
    return;
  }
  console.log(`matched ${entry.name} — ${entry.price?.finalPrice ?? '?'} V-Bucks (${entry.offerId})`);
  if (!entry.giftable) console.log('warning: this entry is not marked giftable — the gift may be rejected');
  const targets = (await ask('recipient display name(s) or account id(s), comma separated: '))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (targets.length === 0) return;
  const message = await ask('personal message (blank = none): ');
  if (!/^y/i.test(await ask(`gift ${entry.name} to ${targets.length} recipient(s) on your REAL account? [y/N]: `))) {
    console.log('cancelled');
    return;
  }
  const [result] = await shop.gift(entry, targets, message ? { message } : {});
  console.log(`gifted — offer ${result?.offerId}, ${result?.receiverAccountIds.length} recipient(s), total ${result?.totalPrice} V-Bucks`);
}

async function shopSetReceiveGifts(): Promise<void> {
  const active = await getSession();
  const enable = /^y/i.test(await ask('enable receiving gifts? [y/N]: '));
  await active.gifting().setReceiveGiftsEnabled(enable);
  console.log(`receive gifts ${enable ? 'enabled' : 'disabled'}`);
}

async function liveWatch(): Promise<void> {
  const active = await getSession();
  const bot = await active.live();
  console.log(`live client connected — party ${bot.party?.id ?? 'none'}, ${bot.friends.size} friend(s) cached`);
  console.log('watching decoded live events for 60s...\n');

  bot.on('friend:request', (event) => console.log(`friend:request    ${event.accountId} (${event.direction}) — accept via "pending requests"`));
  bot.on('friend:added', (event) => console.log(`friend:added      ${event.accountId}`));
  bot.on('friend:removed', (event) => console.log(`friend:removed    ${event.accountId} (${event.reason})`));
  bot.on('party:invite', (event) => console.log(`party:invite      from ${event.fromId} — accept via "pending invites"`));
  bot.on('party:invite:declined', (event) => console.log(`party:invite:declined ${event.accountId}`));
  bot.on('party:join:request', (event) => console.log(`party:join:req    ${event.requesterId} on ${event.partyId}`));
  bot.on('party:member:joined', (event) => console.log(`party:joined      ${event.accountId}`));
  bot.on('party:member:left', (event) => console.log(`party:left        ${event.accountId}`));
  bot.on('party:member:kicked', (event) => console.log(`party:kicked      ${event.accountId}`));
  bot.on('party:member:promoted', (event) => console.log(`party:promoted    ${event.accountId}`));
  bot.on('party:updated', (event) => console.log(`party:updated     ${event.partyId}`));
  bot.on('party:disbanded', (event) => console.log(`party:disbanded   ${event.partyId}`));
  bot.on('friend:message', (message) => console.log(`dm                ${message.accountId}: ${message.body}`));
  bot.on('party:message', (message) => console.log(`party-msg         ${message.accountId}: ${message.body}`));
  bot.on('presence', (presence) => console.log(`presence          ${presence.accountId} ${preview(presence.payload, 60)}`));

  await new Promise((resolve) => setTimeout(resolve, 60_000));
  bot.removeAllListeners();
  console.log('\ndone watching (live client stays connected — use disconnect to end)');
}

async function liveRequests(): Promise<void> {
  const active = await getSession();
  const bot = await active.live();
  const requests = [...bot.incomingRequests.values()];
  if (requests.length === 0) {
    console.log('no pending incoming friend requests captured yet — run "watch" to collect them');
    return;
  }
  console.log(`${requests.length} pending request(s):`);
  requests.forEach((request, index) => console.log(`  ${index + 1}) ${request.accountId} (${request.direction})`));
  const pick = await ask('accept which? (number, "all", blank = cancel): ');
  if (!pick) return;
  const single = requests[Number(pick) - 1];
  const targets = pick.toLowerCase() === 'all' ? requests : single ? [single] : [];
  for (const request of targets) {
    await request.accept();
    console.log(`accepted ${request.accountId}`);
  }
}

async function liveInvites(): Promise<void> {
  const active = await getSession();
  const bot = await active.live();
  const invites = [...bot.pendingInvites.values()];
  if (invites.length === 0) {
    console.log('no pending party invites captured yet — run "watch" to collect them');
    return;
  }
  console.log(`${invites.length} pending invite(s):`);
  invites.forEach((invite, index) => console.log(`  ${index + 1}) from ${invite.fromId}`));
  const pick = await ask('invite number (blank = cancel): ');
  if (!pick) return;
  const invite = invites[Number(pick) - 1];
  if (!invite) {
    console.log('unknown invite');
    return;
  }
  const action = await ask('1) accept  2) decline  > ');
  if (action === '1') {
    const party = await invite.accept();
    console.log(`joined party ${party?.id ?? '?'}`);
  } else if (action === '2') {
    await invite.decline();
    console.log(`declined invite from ${invite.fromId}`);
  }
}

async function liveCreateParty(): Promise<void> {
  const active = await getSession();
  const bot = await active.live();
  const party = await bot.createParty();
  console.log(`created party ${party.id} — ${party.members.length} member(s)`);
}

async function liveJoin(): Promise<void> {
  const active = await getSession();
  const bot = await active.live();
  console.log('1) join a friend (by account id, via their presence)');
  console.log('2) join a party by id');
  const mode = await ask('> ');
  if (mode === '1') {
    const accountId = await ask('friend account id: ');
    if (!accountId) return;
    const party = await bot.joinFriend(accountId);
    console.log(`joined party ${party?.id ?? '?'}`);
  } else if (mode === '2') {
    const partyId = await ask('party id: ');
    if (!partyId) return;
    const party = await bot.joinParty(partyId);
    console.log(`joined party ${party?.id ?? '?'}`);
  }
}

async function liveLeave(): Promise<void> {
  const active = await getSession();
  const bot = await active.live();
  await bot.leaveParty();
  console.log('left party');
}

async function liveSetPrivacy(): Promise<void> {
  const active = await getSession();
  const bot = await active.live();
  const party = bot.party;
  if (!party) {
    console.log('not in a party — create or join one first');
    return;
  }
  console.log(`privacy presets: ${PARTY_PRIVACY_LIST.join(', ')}`);
  const value = await ask('privacy: ');
  if (!isPartyPrivacy(value)) {
    console.log(`unknown privacy "${value}"`);
    return;
  }
  await party.setPrivacy(value);
  console.log(`party privacy set to ${value}`);
}

async function liveDisconnect(): Promise<void> {
  const active = await getSession();
  await active.disconnectLive();
  console.log('live client disconnected');
}

async function eosTokenView(): Promise<void> {
  const active = await getSession();
  const token = await active.eosToken();
  console.log(preview(token, 300));
}

async function eosAccountsView(): Promise<void> {
  const active = await getSession();
  const ids = (await ask('account ids (comma separated, blank = you): ')).trim();
  const list = (ids ? ids.split(',').map((s) => s.trim()) : [active.accountId ?? '']).filter(Boolean);
  const accounts = await active.eosAccounts(list);
  console.log(`${accounts.length} account(s):`);
  for (const account of accounts) console.log(`  ${preview(account)}`);
}

async function lockerItemsView(): Promise<void> {
  const active = await getSession();
  const items = await active.lockerItems();
  console.log(preview(items, 400));
}

async function deviceAuthList(): Promise<void> {
  const active = await getSession();
  const list = await active.listDeviceAuths();
  console.log(`${list.length} device auth(s):`);
  for (const entry of list) console.log(`  ${entry.deviceId}`);
}

async function deviceAuthCreate(): Promise<void> {
  const active = await getSession();
  const created = await active.createDeviceAuth();
  console.log(`created device auth ${created.deviceId} for ${created.accountId}`);
}

async function deviceAuthDelete(): Promise<void> {
  const active = await getSession();
  const deviceId = await ask('device id to delete: ');
  if (!deviceId) return;
  await active.deleteDeviceAuth(deviceId);
  console.log(`deleted ${deviceId}`);
}

async function statusSummaryView(): Promise<void> {
  const active = await getSession();
  const [summary, incidents] = await Promise.all([active.statusSummary(), active.statusIncidents()]);
  console.log(preview(summary, 300));
  console.log(`${incidents.length} incident(s)`);
}

async function cloudStorageUserList(): Promise<void> {
  const active = await getSession();
  const files = await active.cloudStorageFiles();
  console.log(`${files.length} user file(s):`);
  for (const file of files) console.log(`  ${file.filename}  (${file.length} bytes)  ${file.uniqueFilename}`);
}

async function cloudStorageUserRead(): Promise<void> {
  const active = await getSession();
  const filename = await ask('user filename (uniqueFilename): ');
  if (!filename) return;
  const text = await active.readCloudStorageText(filename);
  console.log(`--- ${filename} (${text.length} chars) ---`);
  console.log(text.slice(0, 1000));
}

async function cloudStorageUserWrite(): Promise<void> {
  const active = await getSession();
  const filename = await ask('user filename to write (e.g. ClientSettings.Sav): ');
  if (!filename) return;
  const localPath = await ask('local file to upload its contents from: ');
  if (!localPath) return;
  const data = readFileSync(localPath);
  if (!/^y/i.test(await ask(`write ${data.length} bytes to ${filename} on your REAL account? [y/N]: `))) {
    console.log('cancelled');
    return;
  }
  await active.writeCloudStorage(filename, new Uint8Array(data));
  console.log(`wrote ${data.length} bytes to ${filename}`);
}

async function cloudStorageUserDelete(): Promise<void> {
  const active = await getSession();
  const filename = await ask('user filename to delete: ');
  if (!filename) return;
  if (!/^y/i.test(await ask(`delete ${filename} from your REAL account? [y/N]: `))) {
    console.log('cancelled');
    return;
  }
  await active.deleteCloudStorage(filename);
  console.log(`deleted ${filename}`);
}

async function cloudStorageSystemList(): Promise<void> {
  const active = await getSession();
  const files = await active.systemCloudStorageFiles();
  console.log(`${files.length} system file(s):`);
  for (const file of files) console.log(`  ${file.uniqueFilename}  (${file.length} bytes)`);
}

async function cloudStorageSystemRead(): Promise<void> {
  const active = await getSession();
  const filename = await ask('system filename (uniqueFilename, e.g. DefaultGame.ini): ');
  if (!filename) return;
  const text = await active.readSystemCloudStorageText(filename);
  console.log(`--- ${filename} (${text.length} chars) ---`);
  console.log(text.slice(0, 1000));
}

async function dillyVersions(): Promise<void> {
  const versions = await dilly.common.versions();
  console.log(`${versions.length} tracked versions:`);
  for (const v of versions.slice(0, 15)) {
    console.log(`  ${v.version.build}  [${v.meta.tag}/${v.meta.state}]  (${v.version.platform})`);
  }
}

async function dillyAes(): Promise<void> {
  const aes = await dilly.aes.keys();
  console.log(`version ${aes.version}`);
  console.log(`main key ${aes.mainKey}`);
  console.log(`${aes.dynamicKeys.length} dynamic keys, ${aes.unloaded.length} unloaded paks`);
}

async function dillyCosmetics(): Promise<void> {
  const type = await ask('cosmetic Type filter (blank = all): ');
  const result = await dilly.cosmetics.list(type ? { type } : undefined);
  console.log(`${result.entries} cosmetics:`);
  for (const item of result.data.slice(0, 15)) {
    console.log(`  ${item.id}  ${item.name}  (${item.type.name})`);
  }
}

async function dillyExportSearch(): Promise<void> {
  const query = await ask('search query: ');
  if (!query) return;
  const result = await dilly.exports.search({ query });
  console.log(`${result.jsonOutput.length} matching asset paths:`);
  for (const path of result.jsonOutput.slice(0, 15)) console.log(`  ${path}`);
}

async function dillyManifests(): Promise<void> {
  const manifests = await dilly.manifests.list();
  console.log(`${manifests.length} manifests:`);
  for (const m of manifests.slice(0, 10)) {
    console.log(`  ${m.buildVersion}  ${m.labelName}  (${m.totalFiles} files)`);
  }
}

async function dillyMappings(): Promise<void> {
  const mappings = await dilly.mappings.list();
  console.log(`${mappings.length} usmap mappings:`);
  for (const m of mappings.slice(0, 10)) {
    console.log(`  ${m.meta.version}  ${m.fileName}  (${m.meta.platform})`);
  }
}

async function dillyBackups(): Promise<void> {
  const backups = await dilly.backups.list();
  console.log(`${backups.length} backups:`);
  for (const b of backups.slice(0, 15)) console.log(`  ${JSON.stringify(b)}`);
}

async function dillyHotfixes(): Promise<void> {
  const hotfixes = await dilly.cloudStorage.hotfixes();
  const files = Object.keys(hotfixes);
  console.log(`${files.length} hotfix file(s):`);
  for (const file of files.slice(0, 15)) {
    const sections = Object.keys(hotfixes[file] ?? {}).length;
    console.log(`  ${file}  (${sections} section(s))`);
  }
}

async function dillyBundles(): Promise<void> {
  const result = await dilly.cosmetics.bundles();
  console.log(`${result.entries} bundles:`);
  for (const item of result.data.slice(0, 15)) {
    console.log(`  ${JSON.stringify(item).slice(0, 120)}`);
  }
}

async function dillySeasons(): Promise<void> {
  const result = await dilly.exports.seasons();
  console.log(`${result.entries} season export entries (hash ${result.hash}):`);
  for (const season of result.jsonOutput.slice(0, 10)) {
    console.log(`  ${JSON.stringify(season).slice(0, 120)}`);
  }
}

async function fnccStatus(): Promise<void> {
  const status = await fncc.status.overview();
  console.log(`ready:           ${status.ready}`);
  console.log(`dataset:         ${status.dataset.version} (build ${status.dataset.buildId})`);
  console.log(`game:            ${status.game.status} — installed ${status.game.installedVersion}`);
  console.log(`parser:          ${status.parser.state} (${status.parser.fileCount} files)`);
  console.log(`maintenance:     ${status.maintenance.status}`);
}

async function fnccVersion(): Promise<void> {
  const version = await fncc.game.version();
  console.log(`game version:   ${version.gameVersion}`);
  console.log(`clean build:    ${version.cleanBuild} (CL ${version.changelist}, ${version.branch})`);
  console.log(`dataset build:  ${version.datasetBuild}`);
  console.log(`published:      ${version.publishedAt}`);
  console.log(`complete:       ${version.complete}`);
  const categories = Object.entries(version.categories);
  console.log(`${categories.length} categories, ${categories.reduce((sum, [, n]) => sum + n, 0)} items total`);
}

async function fnccAes(): Promise<void> {
  const aes = await fncc.game.aes();
  console.log(`version ${aes.version} (fetched ${aes.fetchedAt})`);
  console.log(`main key ${aes.mainKey}`);
  console.log(`${aes.dynamicKeys.length} dynamic keys`);
}

async function fnccMappings(): Promise<void> {
  const mappings = await fncc.game.mappings();
  console.log(`version:   ${mappings.version}`);
  console.log(`file:      ${mappings.fileName}`);
  console.log(`fetched:   ${mappings.fetchedAt}`);
}

async function fnccCosmeticCategories(): Promise<void> {
  const categories = await fncc.cosmetics.categories();
  const entries = Object.entries(categories);
  console.log(`${entries.length} categories:`);
  for (const [name, count] of entries) console.log(`  ${name.padEnd(16)} ${count}`);
}

async function fnccCosmeticSearch(): Promise<void> {
  const category = (await ask('category (e.g. br, cars, instruments): ')) || 'br';
  const name = await ask('name to search (blank = all): ');
  const result = await fncc.cosmetics.search(category, {
    ...(name ? { name, matchMethod: 'contains' } : {}),
    limit: 15,
  });
  console.log(`${result.total} matches in ${category}:`);
  for (const item of result.data.slice(0, 15)) {
    console.log(`  ${item.id}  ${item.name}  [${item.rarity?.displayValue ?? '?'} ${item.type?.displayValue ?? item.category}]`);
  }
}

async function fnccBanners(): Promise<void> {
  const banners = await fncc.banners.list();
  console.log(`${banners.length} banners:`);
  for (const banner of banners.slice(0, 15)) {
    console.log(`  ${banner.id}  ${banner.name}  (${banner.categoryName})`);
  }
}

async function fnccBannerColors(): Promise<void> {
  const colors = await fncc.banners.colors();
  console.log(`${colors.length} banner colors:`);
  for (const color of colors.slice(0, 20)) {
    console.log(`  ${color.id.padEnd(18)} ${color.primaryColor.hex} / ${color.secondaryColor.hex}`);
  }
}

async function fnccSprites(): Promise<void> {
  const result = await fncc.sprites.list({ enabled: true });
  console.log(`${result.count} sprites:`);
  for (const sprite of result.data.slice(0, 15)) {
    console.log(`  #${sprite.dexNumber}  ${sprite.name}  (${sprite.species}, ${sprite.library})`);
  }
}

async function fnccSearchPaths(): Promise<void> {
  const query = await ask('asset path search: ');
  if (!query) return;
  const page = await fncc.search.paths(query, { limit: 15 });
  console.log(`${page.total} matching paths (showing ${page.items.length}):`);
  for (const hit of page.items) console.log(`  ${hit.path}`);
}

async function fnccAssets(): Promise<void> {
  const prefix = await ask('path prefix (blank = all): ');
  const page = await fncc.assets.list({ ...(prefix ? { prefix } : {}), limit: 15 });
  console.log(`${page.total} assets (showing ${page.items.length}):`);
  for (const entry of page.items) {
    const size = entry.size !== undefined ? `  ${entry.size}b` : '';
    console.log(`  ${entry.path}${size}`);
  }
}

async function fnccImageUrl(): Promise<void> {
  const path = await ask('asset path: ');
  if (!path) return;
  const picked = await ask('format (png/webp/jpeg/tga, blank = default): ');
  const format = (['png', 'webp', 'jpeg', 'tga'] as const).find((value) => value === picked);
  const url = fncc.images.url({ path, ...(format ? { format } : {}) });
  console.log(url);
}

async function fnccWeapons(): Promise<void> {
  const search = await ask('weapon search (blank = all): ');
  const result = await fncc.weapons.list({ ...(search ? { search } : {}), limit: 15 });
  console.log(`${result.total} weapons (showing ${result.data.length}):`);
  for (const weapon of result.data.slice(0, 15)) {
    const dps = weapon.stats?.damagePerSecond;
    console.log(`  ${weapon.id}  ${weapon.name}  [${weapon.rarity ?? '?'} ${weapon.category}${dps ? `, ${dps.toFixed(1)} dps` : ''}]`);
  }
}

async function fnccNews(): Promise<void> {
  const news = await fncc.news.all();
  console.log(`${news.feedCount} news feeds, ${news.messageCount} messages:`);
  for (const feed of news.data.slice(0, 15)) {
    console.log(`  ${feed.id.padEnd(20)} ${feed.messageCount} messages  (${feed.style})`);
  }
}

async function fnccPlaylists(): Promise<void> {
  const playlists = await fncc.playlists.list();
  console.log(`${playlists.length} playlists:`);
  for (const playlist of playlists.slice(0, 15)) {
    console.log(`  ${playlist.id}  ${playlist.name}  [${playlist.gameType ?? '?'}]`);
  }
}

async function fnccFish(): Promise<void> {
  const fish = await fncc.fish.list();
  console.log(`${fish.length} fish:`);
  for (const entry of fish.slice(0, 15)) {
    console.log(`  ${entry.id}  ${entry.name}  [${entry.rarity ?? '?'}]${entry.enabled ? '' : '  (vaulted)'}`);
  }
}

async function fnccItemShop(): Promise<void> {
  const shop = await fncc.itemshop.current();
  console.log(`item shop (${shop.offerCount} offers, resets ${shop.resetsAt}):`);
  for (const offer of shop.data.slice(0, 15)) {
    console.log(`  ${offer.offerId.padEnd(40)} ${offer.devName}${offer.giftable ? '  (giftable)' : ''}`);
  }
}

async function fnccLightswitch(): Promise<void> {
  const status = await fncc.lightswitch.all();
  console.log(`all up: ${status.allUp}  (${status.serviceCount} services)`);
  for (const service of status.data.slice(0, 15)) {
    console.log(`  ${service.serviceId.padEnd(20)} ${service.status}`);
  }
}

async function fnccLookup(): Promise<void> {
  const name = await ask('display name to look up: ');
  if (!name) return;
  const result = await fncc.lookup.byName(name);
  console.log(`${result.exactCount} exact, ${result.moreCount} more:`);
  for (const match of [...result.exact, ...result.more].slice(0, 10)) {
    console.log(`  ${match.accountId ?? '?'}  ${match.displayName ?? '?'}`);
  }
}

async function fnccMnemonic(): Promise<void> {
  const key = await ask('mnemonic (e.g. island code, blank = list): ');
  if (key) {
    const entry = await fncc.mnemonic.get(key);
    console.log(`  ${entry.mnemonic}  ${entry.title}  (${entry.linkType}, by ${entry.creator})`);
    return;
  }
  const list = await fncc.mnemonic.list();
  console.log(`${list.length} mnemonics:`);
  for (const entry of list.slice(0, 15)) console.log(`  ${entry.mnemonic}  ${entry.title}`);
}

async function fnccDiscovery(): Promise<void> {
  const discovery = await fncc.discovery.all();
  console.log(`${discovery.surfaceCount} discovery surfaces (${discovery.panelCount} panels):`);
  for (const surface of discovery.data.slice(0, 15)) {
    console.log(`  ${surface.name.padEnd(28)} ${surface.panelCount} panels`);
  }
}

async function fnccCloudStorage(): Promise<void> {
  const files = await fncc.cloudstorage.list();
  console.log(`${files.length} cloud storage files:`);
  for (const file of files.slice(0, 15)) {
    console.log(`  ${file.filename.padEnd(28)} ${file.size}b  (${file.contentType})`);
  }
}

async function fnccAntiCheat(): Promise<void> {
  const info = await fncc.anticheat.info();
  console.log(`EAC ${info.productVersion} (${info.version}), runtime ${info.runtimeVersion}`);
  console.log(`game ${info.gameVersion}, checked ${info.checkedAt}`);
  for (const file of [...info.files, ...info.certificates]) {
    console.log(`  ${file.name.padEnd(48)} ${file.size}b${file.url ? `  ${file.url}` : ''}`);
  }
}

async function fnccCosmeticsSearchAll(): Promise<void> {
  const search = await ask('search every category for: ');
  if (!search) return;
  const result = await fncc.cosmetics.searchAll({ search, limit: 15 });
  console.log(`${result.total} matches (showing ${result.data.length}):`);
  for (const item of result.data) {
    const name = 'name' in item ? item.name : item.title;
    console.log(`  [${item.category}] ${item.id}  ${name}`);
  }
}

async function fnccCosmeticTypes(): Promise<void> {
  const types = await fncc.cosmetics.types();
  console.log(`${types.length} cosmetic types:`);
  for (const type of types) {
    console.log(`  ${type.value.padEnd(22)} ${type.displayValue.padEnd(24)} ${String(type.count).padStart(6)}  [${type.category}]`);
  }
}

async function fnccRarities(): Promise<void> {
  const rarities = await fncc.rarities.list();
  for (const rarity of rarities) {
    console.log(`  ${rarity.displayValue.padEnd(26)} ${rarity.hexColors[0] ?? ''}  ${rarity.cosmetics} cosmetics, ${rarity.weapons} weapons`);
  }
}

async function fnccLootSearch(): Promise<void> {
  const q = await ask('item to find in loot pools (e.g. shotgun): ');
  if (!q) return;
  const result = await fncc.lootpool.search({ q, limit: 15 });
  console.log(`${result.total} drops (showing ${result.data.length}):`);
  for (const hit of result.data) {
    console.log(`  ${(hit.chance * 100).toFixed(2).padStart(6)}%  ${hit.name} [${hit.rarity ?? '?'}]  ${hit.poolName} / ${hit.containerName}`);
  }
}

async function fnccSeasons(): Promise<void> {
  const seasons = await fncc.seasons.list();
  const current = seasons.find((season) => season.current);
  console.log(`${seasons.length} seasons, current: ${current?.displayName ?? '?'} (${current?.storefront ?? '?'})`);
  for (const season of seasons.slice(-10)) {
    console.log(`  ${String(season.season).padStart(3)}  ${season.displayName}${season.current ? '  <- current' : ''}`);
  }
}

async function fnccBattlePasses(): Promise<void> {
  const passes = await fncc.battlepasses.list();
  for (const pass of passes) {
    console.log(`  ${pass.displayName.padEnd(16)} ${pass.name}  (${pass.rewardCount} rewards, ${pass.categories.length} tracks)`);
  }
}

async function fnccBundles(): Promise<void> {
  const q = await ask('bundle search (blank = currently in shop): ');
  const result = await fncc.bundles.list(q ? { q, limit: 15 } : { inShop: true, limit: 15 });
  console.log(`${result.total} bundles (showing ${result.data.length}):`);
  for (const bundle of result.data) {
    console.log(`  ${bundle.id}  ${bundle.name ?? '?'}  ${bundle.price.finalPrice} vbucks, ${bundle.items.length} items, seen ${bundle.occurrences}x`);
  }
}

async function fnccModes(): Promise<void> {
  const modes = await fncc.modes.list();
  console.log(`season ${modes.season.number}, ends ${modes.season.end}`);
  for (const mode of modes.modes) {
    const rotating = mode.maps.filter((map) => map.inRotation).map((map) => map.name ?? map.code);
    console.log(`  ${mode.name.padEnd(16)} ${mode.enabled ? 'on ' : 'off'}  maps in rotation: ${rotating.join(', ') || 'none'}`);
  }
}

async function fnccFixPath(): Promise<void> {
  const path = await ask('asset path to resolve: ');
  if (!path) return;
  const fixed = await fncc.assets.fixPath(path);
  if (!fixed.found) {
    console.log(`not found: ${fixed.error ?? 'no match'}`);
    return;
  }
  console.log(`object path: ${fixed.objectPath}`);
  console.log(`class:       ${fixed.class}  (${fixed.archive})`);
  for (const entry of fixed.exports) console.log(`  export ${entry.name} (${entry.class})`);
}

async function fnccShorten(): Promise<void> {
  const url = await ask('url to shorten (http/https): ');
  if (!url) return;
  const link = await fncc.shorten.create(url);
  console.log(`${link.url} -> ${link.target} (expires ${link.expiresAt})`);
}

interface MenuItem {
  key: string;
  label: string;
  action: () => Promise<void>;
  submenu?: boolean;
}

interface Menu {
  title: string;
  note?: string;
  items: MenuItem[];
}

function clearConsole(): void {
  console.clear();
}

function logError(error: unknown): void {
  const e = error as { name?: string; status?: number; message?: string; description?: string };
  const status = e.status ? ` ${e.status}` : '';
  console.error(`error: ${e.name ?? 'Error'}${status} — ${e.description ?? e.message ?? String(error)}`);
}

async function runMenu(menu: Menu, root = false): Promise<void> {
  for (;;) {
    clearConsole();
    console.log(menu.title);
    if (menu.note) console.log(`  ${menu.note}`);
    for (const item of menu.items) console.log(`  ${item.key}  ${item.label}`);
    console.log(root ? '  0  exit' : '  b  back');

    const choice = await ask('> ');
    if (choice === '') continue;
    if (root ? choice === '0' || choice === 'q' : choice === 'b' || choice === '0') return;

    const item = menu.items.find((entry) => entry.key === choice);
    if (!item) {
      console.log('unknown option');
      await ask('press enter to continue... ');
      continue;
    }

    if (item.submenu) {
      await item.action();
      continue;
    }

    clearConsole();
    try {
      await item.action();
    } catch (error) {
      logError(error);
    }
    await ask('\npress enter to continue... ');
  }
}

const fortniteApiMenu: Menu = {
  title: 'fortnite-api',
  items: [
    { key: '1', label: 'cosmetics search', action: searchCosmetics },
    { key: '2', label: 'item shop', action: itemShop },
    { key: '3', label: 'player stats (needs apiKey)', action: playerStats },
    { key: '4', label: 'aes keys', action: aesKeys },
    { key: '5', label: 'creator code', action: creatorCode },
  ],
};

const ecosystemMenu: Menu = {
  title: 'ecosystem (no auth required)',
  items: [
    { key: '1', label: 'list islands', action: ecosystemIslands },
    { key: '2', label: 'island detail (by code)', action: ecosystemIsland },
    { key: '3', label: 'island metrics (by code)', action: ecosystemIslandMetrics },
    { key: '4', label: 'list genres', action: ecosystemGenres },
    { key: '5', label: 'genre rankings (by slug)', action: ecosystemGenreRankings },
    { key: '6', label: 'global concurrency', action: ecosystemGlobalMetrics },
  ],
};

const dillyMenu: Menu = {
  title: 'dilly (fortniteapi.com — no auth required)',
  items: [
    { key: '1', label: 'versions', action: dillyVersions },
    { key: '2', label: 'aes keys', action: dillyAes },
    { key: '3', label: 'cosmetics (by Type)', action: dillyCosmetics },
    { key: '4', label: 'cosmetic bundles', action: dillyBundles },
    { key: '5', label: 'export search (by query)', action: dillyExportSearch },
    { key: '6', label: 'export seasons', action: dillySeasons },
    { key: '7', label: 'manifests', action: dillyManifests },
    { key: '8', label: 'mappings', action: dillyMappings },
    { key: '9', label: 'cloud storage hotfixes', action: dillyHotfixes },
    { key: 'b', label: 'backups', action: dillyBackups },
  ],
};

const fnccMenu: Menu = {
  title: 'fncc (fn-api.cc — no auth required)',
  items: [
    { key: '1', label: 'backend status', action: fnccStatus },
    { key: '2', label: 'game version', action: fnccVersion },
    { key: '3', label: 'aes keys', action: fnccAes },
    { key: '4', label: 'mappings', action: fnccMappings },
    { key: '5', label: 'cosmetic categories', action: fnccCosmeticCategories },
    { key: '6', label: 'cosmetic search (by category)', action: fnccCosmeticSearch },
    { key: '7', label: 'banners', action: fnccBanners },
    { key: '8', label: 'banner colors', action: fnccBannerColors },
    { key: '9', label: 'sprites (og)', action: fnccSprites },
    { key: 's', label: 'asset path search', action: fnccSearchPaths },
    { key: 'a', label: 'asset listing (by prefix)', action: fnccAssets },
    { key: 'i', label: 'build image url', action: fnccImageUrl },
    { key: 'w', label: 'weapons (search)', action: fnccWeapons },
    { key: 'n', label: 'news feeds', action: fnccNews },
    { key: 'p', label: 'playlists', action: fnccPlaylists },
    { key: 'f', label: 'fish', action: fnccFish },
    { key: 'o', label: 'item shop (current)', action: fnccItemShop },
    { key: 'l', label: 'lightswitch (service status)', action: fnccLightswitch },
    { key: 'k', label: 'account lookup (by name)', action: fnccLookup },
    { key: 'm', label: 'mnemonic (island/link lookup)', action: fnccMnemonic },
    { key: 'd', label: 'discovery surfaces', action: fnccDiscovery },
    { key: 'c', label: 'cloud storage files', action: fnccCloudStorage },
    { key: 'h', label: 'anticheat info', action: fnccAntiCheat },
    { key: 'v', label: 'cosmetic search (every category)', action: fnccCosmeticsSearchAll },
    { key: 'y', label: 'cosmetic types', action: fnccCosmeticTypes },
    { key: 'r', label: 'rarities', action: fnccRarities },
    { key: 't', label: 'loot pool search (drop chances)', action: fnccLootSearch },
    { key: 'e', label: 'seasons', action: fnccSeasons },
    { key: 'x', label: 'battle passes', action: fnccBattlePasses },
    { key: 'u', label: 'bundles', action: fnccBundles },
    { key: 'g', label: 'game modes & map rotation', action: fnccModes },
    { key: 'z', label: 'fix asset path', action: fnccFixPath },
    { key: 'j', label: 'shorten a url', action: fnccShorten },
  ],
};

const friendsMenu: Menu = {
  title: 'friends',
  items: [
    { key: '1', label: 'summary', action: friendsSummary },
    { key: '2', label: 'list friends', action: friendsList },
    { key: '3', label: 'incoming / outgoing requests', action: friendsRequests },
    { key: '4', label: 'add / accept (by account id)', action: friendsAdd },
    { key: '5', label: 'remove (by account id)', action: friendsRemove },
    { key: '6', label: 'set / clear nickname', action: friendsNickname },
    { key: '7', label: 'set / clear note', action: friendNote },
    { key: '8', label: 'friend detail + mutuals', action: friendDetail },
    { key: '9', label: 'suggested friends', action: friendsSuggested },
    { key: 'k', label: 'blocklist', action: friendsBlocklist },
    { key: 'l', label: 'block (by account id)', action: friendsBlock },
    { key: 'u', label: 'unblock (by account id)', action: friendsUnblock },
  ],
};

const rankedMenu: Menu = {
  title: 'ranked (habanero)',
  items: [
    { key: '1', label: 'my ranks (current season)', action: rankedMyStandings },
    { key: '2', label: 'player ranks (by display name)', action: rankedPlayerStandings },
    { key: '3', label: 'my ranked history (every season)', action: rankedHistory },
    { key: '4', label: 'list tracks (raw)', action: rankedTracks },
    { key: '5', label: 'track detail (by guid)', action: rankedTrackDetail },
    { key: '6', label: 'my progress (by track guid)', action: rankedMyProgress },
    { key: '7', label: 'all my progress (raw)', action: rankedAllProgress },
  ],
};

const tournamentsMenu: Menu = {
  title: 'tournaments',
  items: [
    { key: '1', label: 'list tournaments (by region)', action: listTournaments },
    { key: '2', label: 'tournament detail (windows, prizes, eligibility)', action: tournamentDetail },
    { key: '3', label: 'window leaderboard', action: tournamentLeaderboard },
    { key: '4', label: 'my history in a tournament', action: myTournamentHistory },
    { key: '5', label: 'my tournament tokens', action: myTournamentTokens },
  ],
};

const questsMenu: Menu = {
  title: 'quests',
  note: 'names, categories and order come from fn-api.cc /v1/quests',
  items: [
    { key: '1', label: 'quest log (br + every mode, game order)', action: questLogView },
    { key: '2', label: 'save the world quests', action: stwQuestLogView },
    { key: '3', label: 'reroll an stw daily (REAL write)', action: rerollStwDaily },
    { key: '4', label: 'save quest catalog to a file', action: saveQuestCatalog },
    { key: '5', label: 'look up a quest by template id', action: questLookup },
  ],
};

const identityMenu: Menu = {
  title: 'identity & connections',
  items: [
    { key: '1', label: 'search users', action: searchUsers },
    { key: '2', label: 'account by display name', action: accountByName },
    { key: '3', label: 'account by id', action: accountById },
    { key: '4', label: 'avatar (by id / you)', action: avatarView },
    { key: '5', label: 'external connections', action: externalConnections },
    { key: '6', label: 'lookup by external display name', action: lookupExternalDisplayName },
    { key: '7', label: 'account metadata', action: accountMetadata },
  ],
};

const statusMenu: Menu = {
  title: 'status & presence',
  items: [
    { key: '1', label: 'last online', action: presenceLastOnline },
    { key: '2', label: 'service status (lightswitch)', action: serviceStatus },
    { key: '3', label: 'status page summary + incidents', action: statusSummaryView },
  ],
};

const xmppMenu: Menu = {
  title: 'xmpp / presence (realtime)',
  note: 'live WebSocket — watch friends come online, send chat over XMPP',
  items: [
    { key: '1', label: 'connect & watch presence (20s)', action: xmppConnectWatch },
    { key: '2', label: 'list cached friend presences', action: xmppListPresences },
    { key: '3', label: 'send chat message', action: xmppSendMessage },
    { key: '4', label: 'disconnect', action: xmppDisconnect },
  ],
};

const chatMenu: Menu = {
  title: 'chat, presence & live events',
  note: 'set in-game custom status (EOS) + send DMs / party messages + stream live events',
  items: [
    { key: '1', label: 'set custom status (renders in-game)', action: presenceSetCustomStatus },
    { key: '2', label: 'clear custom status', action: presenceClearCustomStatus },
    { key: '3', label: 'send direct message', action: chatSendDM },
    { key: '4', label: 'send party message', action: chatSendParty },
    { key: '5', label: 'view dm history (by account id)', action: chatViewHistory },
    { key: '6', label: 'connect & watch live events (30s)', action: chatConnectEvents },
    { key: '7', label: 'disconnect live events', action: chatDisconnectEvents },
  ],
};

const shopMenu: Menu = {
  title: 'shop & gifting (real catalog)',
  note: 'session storefront catalog + gift entries to friends (REAL writes)',
  items: [
    { key: '1', label: 'list catalog entries', action: shopList },
    { key: '2', label: 'list giftable entries', action: shopGiftable },
    { key: '3', label: 'gift an item (by name / offer)', action: shopGift },
    { key: '4', label: 'toggle receiving gifts', action: shopSetReceiveGifts },
  ],
};

const liveMenu: Menu = {
  title: 'live bot (event-driven)',
  note: 'decoded party / friend notifications + accept/decline + party lifecycle',
  items: [
    { key: '1', label: 'connect & watch decoded events (60s)', action: liveWatch },
    { key: '2', label: 'pending friend requests (accept)', action: liveRequests },
    { key: '3', label: 'pending party invites (accept / decline)', action: liveInvites },
    { key: '4', label: 'create party', action: liveCreateParty },
    { key: '5', label: 'join party (friend / by id)', action: liveJoin },
    { key: '6', label: 'leave party', action: liveLeave },
    { key: '7', label: 'set party privacy', action: liveSetPrivacy },
    { key: '8', label: 'disconnect live client', action: liveDisconnect },
  ],
};

const economyMenu: Menu = {
  title: 'economy & progress',
  items: [
    { key: '1', label: 'v-bucks balance', action: accountVbucks },
    { key: '2', label: 'v-bucks total (quick)', action: quickVbucks },
    { key: '3', label: 'set v-bucks platform', action: accountSetPlatform },
    { key: '4', label: 'purchase receipts', action: accountReceipts },
    { key: '5', label: 'user stats (statsv2)', action: accountUserStats },
    { key: '6', label: 'leaderboard (by name)', action: leaderboardView },
    { key: '7', label: 'br inventory', action: brInventoryView },
    { key: '8', label: 'common core profile', action: commonCoreView },
    { key: '9', label: 'playtime (all artifacts)', action: playtimeView },
    { key: 't', label: 'calendar timeline', action: accountTimeline },
  ],
};

const contentMenu: Menu = {
  title: 'news, content & islands',
  note: 'content pages need no login; motds, build and islands use the saved account',
  items: [
    { key: '1', label: 'emergency notices + login message', action: contentNotices },
    { key: '2', label: 'motds (personalised)', action: contentMotds },
    { key: '3', label: 'tournaments', action: contentTournaments },
    { key: '4', label: 'lobby backgrounds', action: contentBackgrounds },
    { key: '5', label: 'fortnite version (server + client build)', action: contentBuild },
    { key: '6', label: 'launcher installer download', action: contentInstaller },
    { key: '7', label: 'island package (by code)', action: islandPackageView },
    { key: '8', label: 'island aes key (by code)', action: islandKeysView },
    { key: '9', label: 'launch island (REAL, queues on account)', action: islandLaunch },
    { key: 'a', label: 'island / link lookup (by code)', action: islandLookup },
    { key: 'b', label: 'related links (by code)', action: islandRelatedView },
    { key: 'c', label: 'creator islands (by display name)', action: creatorIslandsView },
    { key: 'd', label: 'my links', action: myIslandsView },
  ],
};

const libraryMenu: Menu = {
  title: 'library (owned games)',
  note: 'reads the epic games library via a launcherApp token (minted automatically)',
  items: [
    { key: '1', label: 'list library (all owned items)', action: libraryView },
    { key: '2', label: 'view item info (by id / appName)', action: libraryItemView },
    { key: '3', label: 'list collections', action: libraryCollectionsView },
    { key: '4', label: 'list collection items (by id)', action: libraryCollectionItemsView },
  ],
};

const cloudStorageMenu: Menu = {
  title: 'cloud storage',
  items: [
    { key: '1', label: 'list user files (.sav)', action: cloudStorageUserList },
    { key: '2', label: 'read user file (text)', action: cloudStorageUserRead },
    { key: '3', label: 'write user file (REAL write)', action: cloudStorageUserWrite },
    { key: '4', label: 'delete user file (REAL write)', action: cloudStorageUserDelete },
    { key: '5', label: 'list system files (.ini)', action: cloudStorageSystemList },
    { key: '6', label: 'read system file (text)', action: cloudStorageSystemRead },
  ],
};

const eosMenu: Menu = {
  title: 'eos / eas',
  items: [
    { key: '1', label: 'eos token', action: eosTokenView },
    { key: '2', label: 'eos accounts (by ids)', action: eosAccountsView },
    { key: '3', label: 'locker items (eos)', action: lockerItemsView },
  ],
};

const matchmakingMenu: Menu = {
  title: 'matchmaking',
  items: [
    { key: '1', label: 'session info (you)', action: matchmakingSessions },
    { key: '2', label: 'check matchmaking ban', action: matchmakingBanCheck },
    { key: '3', label: 'check social ban', action: socialBanCheck },
    { key: '4', label: 'current netCL (buildUniqueId)', action: matchmakingNetCl },
  ],
};

const deviceAuthMenu: Menu = {
  title: 'device auths',
  items: [
    { key: '1', label: 'list device auths', action: deviceAuthList },
    { key: '2', label: 'create device auth', action: deviceAuthCreate },
    { key: '3', label: 'delete device auth (by id)', action: deviceAuthDelete },
  ],
};

const sessionMenu: Menu = {
  title: 'session & tokens',
  items: [
    { key: '1', label: 'session info', action: sessionInfoSummary },
    { key: '2', label: 'refresh token', action: sessionRefresh },
    { key: '3', label: 'verify token', action: sessionVerify },
    { key: '4', label: 'kill other sessions', action: sessionKillOthers },
  ],
};

const epicMenu: Menu = {
  title: 'epic',
  items: [
    { key: '1', label: 'epic login (device code) + save', action: () => loginDeviceCode().then(() => undefined) },
    { key: '2', label: 'account info (me)', action: accountInfo },
    { key: '3', label: 'mcp query athena', action: queryAthena },
    { key: '4', label: 'session & tokens', action: () => runMenu(sessionMenu), submenu: true },
    { key: '5', label: 'friends', action: () => runMenu(friendsMenu), submenu: true },
    { key: '6', label: 'ranked (habanero)', action: () => runMenu(rankedMenu), submenu: true },
    { key: 't', label: 'tournaments', action: () => runMenu(tournamentsMenu), submenu: true },
    { key: 'q', label: 'quests', action: () => runMenu(questsMenu), submenu: true },
    { key: '7', label: 'identity & connections', action: () => runMenu(identityMenu), submenu: true },
    { key: '8', label: 'status & presence', action: () => runMenu(statusMenu), submenu: true },
    { key: 'x', label: 'xmpp / presence (realtime)', action: () => runMenu(xmppMenu), submenu: true },
    { key: 'h', label: 'chat & live events', action: () => runMenu(chatMenu), submenu: true },
    { key: 'l', label: 'live bot (event-driven)', action: () => runMenu(liveMenu), submenu: true },
    { key: 'g', label: 'shop & gifting', action: () => runMenu(shopMenu), submenu: true },
    { key: '9', label: 'economy & progress', action: () => runMenu(economyMenu), submenu: true },
    { key: 'y', label: 'library (owned games)', action: () => runMenu(libraryMenu), submenu: true },
    { key: 'c', label: 'cloud storage', action: () => runMenu(cloudStorageMenu), submenu: true },
    { key: 'e', label: 'eos / eas', action: () => runMenu(eosMenu), submenu: true },
    { key: 'm', label: 'matchmaking', action: () => runMenu(matchmakingMenu), submenu: true },
    { key: 'd', label: 'device auths', action: () => runMenu(deviceAuthMenu), submenu: true },
    { key: 'o', label: 'ecosystem (no auth required)', action: () => runMenu(ecosystemMenu), submenu: true },
    { key: 'n', label: 'news, content & islands', action: () => runMenu(contentMenu), submenu: true },
  ],
};

const lockerMenu: Menu = {
  title: 'locker',
  items: [
    { key: '1', label: 'view locker (enriched)', action: showLocker },
    { key: '2', label: 'equip cosmetic by name (REAL write)', action: editLocker },
    { key: '3', label: 'save current fit as preset (REAL write)', action: saveLockerPreset },
    { key: '4', label: 'equip a saved preset (REAL write)', action: applyLockerPreset },
    { key: '5', label: 'delete a saved preset (REAL write)', action: deleteLockerPreset },
    { key: '6', label: 'recolour an item (REAL write)', action: colorLockerItem },
  ],
};

const partyMenu: Menu = {
  title: 'party',
  note: 'must be in a party in-game',
  items: [
    { key: '1', label: 'party info', action: partyInfo },
    { key: '2', label: 'fake apply skin (search by name)', action: fakeSkin },
    { key: '3', label: 'fake emote (by name/path)', action: fakeEmote },
    { key: '4', label: 'fake jam track (by key/name/path)', action: fakeJamTrackByKey },
    { key: '5', label: 'fake sidekick (companion)', action: fakeSidekick },
    { key: '6', label: 'fake crown (victory wins)', action: fakeCrown },
    { key: '7', label: 'fake banner', action: fakeBanner },
    { key: '8', label: 'fake battle pass level', action: fakeLevel },
    { key: '9', label: 'fake platform', action: fakePlatform },
    { key: 'g', label: 'fake playing toggle', action: fakePlayingToggle },
    { key: 'r', label: 'fake ready toggle', action: fakeReadyToggle },
  ],
};

const mainMenu: Menu = {
  title: 'fnapi-js test cli',
  items: [
    { key: '1', label: 'fortnite-api (fortnite-api.com)', action: () => runMenu(fortniteApiMenu), submenu: true },
    { key: '2', label: 'dilly (fortniteapi.com)', action: () => runMenu(dillyMenu), submenu: true },
    { key: '3', label: 'fncc (fn-api.cc)', action: () => runMenu(fnccMenu), submenu: true },
    { key: '4', label: 'epic', action: () => runMenu(epicMenu), submenu: true },
    { key: '5', label: 'locker', action: () => runMenu(lockerMenu), submenu: true },
    { key: '6', label: 'party', action: () => runMenu(partyMenu), submenu: true },
  ],
};

async function main(): Promise<void> {
  await runMenu(mainMenu, true);

  if (session) {
    try {
      await session.logout();
    } catch {
      session = null;
    }
  }
  rl.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
