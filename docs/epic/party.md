# Party

Read and drive a signed-in account's **current Fortnite party** over the party service — no XMPP connection required. The library finds the party you're already in, exposes its members and meta, and lets you patch your own member meta: fake cosmetics, a fake emote, and your ready state.

You must be **in a party in-game** (even a party of one). `session.getParty()` throws a `ValidationError` if you aren't.

```ts
import { EpicGamesClient } from 'fnapi-js';

const epic = new EpicGamesClient();
const session = await epic.loginWithDeviceAuth(creds);

const party = await session.getParty();
console.log(`${party.members.length} members, leader ${party.leader?.accountId}`);

await party.me?.fakeApplyCosmetics({
  outfit: 'CID_028_Athena_Commando_F',
  backpack: 'BID_004_BlackKnight',
});
await party.me?.fakeEmote('EID_Floss');
await party.me?.fakeReady(true);
```

::: tip Modern loadout format
Cosmetics are written to the current party-meta loadout key `Default:MpLoadout1_j` (the compact `{ ac, ab, ap, at, as, ag, … }` slot format the game uses today), plus the separate `Default:FrontendEmote_j` and `Default:FrontendSparksSongPart_j` (jam) keys. You must already be in a party so the game has populated a real loadout to merge over.
:::

::: warning Fake cosmetics are visual-only, for others
`fakeApplyCosmetics` / `fakeEmote` change your **party-meta representation** — the outfit/emote *other members of your party* see in the lobby. They do **not** change your real account, your locker, or what you wear in a match, and only people in your party see them. That's why every method is prefixed `fake`.
:::

## session.getParty
<Badge type="info" text="method" />

```ts
getParty(): Promise<Party>
```

Fetches your current party and returns a `Party`. Throws `ValidationError` if you are not in a party or the session has no account.

## Party
<Badge type="tip" text="class" />

A snapshot of the party with helpers to read members and patch party-level meta.

| Member | Type | Description |
| --- | --- | --- |
| `id` | `string` | Party id. |
| `revision` | `number` | Party meta revision (auto-managed on patch). |
| `members` | `PartyMember[]` | All members. |
| `me` | `PartyMember \| null` | Your own member. |
| `leader` | `PartyMember \| null` | The party captain. |
| `member(accountId)` | `PartyMember \| null` | Look up a member. |
| `refresh()` | `Promise<this>` | Re-fetch the party. |
| `patchMeta(update, delete?)` | `Promise<void>` | Patch **party** meta, handling the revision (and one retry on a stale revision). |

## PartyMember
<Badge type="tip" text="class" />

One member. The `fake*` and meta-write methods only work on **your own** member (`party.me`) — editing another member throws `ValidationError`.

### Reading meta

```ts
member.getMeta();                                  // Record<string, string>
member.getMetaKey('Default:AthenaCosmeticLoadout_j');
member.getProp('Default:AthenaCosmeticLoadout_j'); // JSON-parsed
```

### Read-only getters

Typed accessors that parse the raw meta for you. They work on **any** member, not just `party.me`, and never throw — missing keys resolve to `undefined`, `false`, `0`, or `null` as appropriate.

```ts
member.outfit;      // string | undefined  — bare id from the ac slot
member.backpack;    // ab slot
member.pickaxe;     // ap slot
member.contrail;    // at slot
member.shoes;       // as slot
member.glider;      // ag slot
member.sidekick;    // mm slot
member.instruments; // FakeInstruments — { bass, guitar, drums, keytar, microphone }
member.banner;      // PartyMemberBanner | undefined — { bannerIconId?, bannerColorId? }

member.emote;       // string | undefined — current emote id (undefined when not emoting)
member.isEmoting;   // boolean
member.jamTrack;    // string | undefined — current jam-track id (SparksSongPart)
member.isJamming;   // boolean

member.readyState;  // 'Ready' | 'NotReady' | 'SittingOut'
member.isReady;     // boolean
member.isSittingOut;// boolean
member.inMatch;     // boolean — PackedState location === 'InGame'
member.matchInfo;   // PartyMemberMatchInfo — { inMatch, playerCount, startedAt: Date | null }

member.battlePass;  // PartyMemberBattlePass | undefined — { purchased, level }
member.level;       // number — battle-pass level (0 when unknown)
member.platform;    // string | undefined — e.g. 'WIN', 'PSN'
member.inputMethod; // string | undefined — e.g. 'MouseAndKeyboard'
member.crowns;      // number — TotalVictoryCrowns loadout stat
member.hasCrown;    // boolean
```

### Writing meta

```ts
member.patchMeta({ 'Default:Key_s': 'value' }, ['Default:Remove_s']);
member.updateMetaKey('Default:Key_s', 'value');    // one key
member.setProp('Default:Key_j', { any: 'object' }); // stringifies + patches
```

### fakeApplyCosmetics
<Badge type="info" text="method" />

```ts
fakeApplyCosmetics(loadout: FakeCosmeticLoadout): Promise<void>
```

Merges the given cosmetics into your `MpLoadout1` party meta. Every field is optional and merged over your current loadout — untouched slots are left as-is. Ids are stored bare (a `Prefix:`, `/path/` or `.suffix` is stripped down to the id), so `CID_028_Athena_Commando_F`, `AthenaCharacter:CID_028_Athena_Commando_F` and a full def path all resolve to the same slot value.

| Field | Slot | Description |
| --- | --- | --- |
| `outfit` | `ac` | Outfit id. |
| `backpack` | `ab` | Back bling id. Pass `'None'`/`''` to clear. |
| `pickaxe` | `ap` | Pickaxe id. |
| `contrail` | `at` | Contrail id. Pass `'None'`/`''` to clear. |
| `shoes` | `as` | Kicks id. Pass `'None'`/`''` to clear. |
| `glider` | `ag` | Glider id. |
| `sidekick` | `mm` | Companion (sidekick) id. Also writes the `CosmeticCompanion:` def into `AthenaCosmeticLoadout`. Pass `'None'`/`''` to clear. |
| `bannerIcon` / `bannerColor` | `li` / `lc` | Banner icon + colour ids. |
| `instruments` | `sb` `sg` `sd` `sk` `sm` | `{ bass, guitar, drums, keytar, microphone }` festival instrument ids. |
| `crowns` | — | Victory-crown count. Writes `TotalVictoryCrowns` / `TotalRoyalRoyales` / `HasCrown` into `LoadoutMeta`. |
| `variants` | — | Per-slot variants, keyed by slot code, e.g. `{ ac: [{ c: 'Material', v: 'Mat2' }] }`. |
| `emote` / `emoji` / `jam` | — | Plays a fake emote / emoji / jam track (see below). Only one is applied per call. |

```ts
await party.me.fakeApplyCosmetics({
  outfit: 'CID_028_Athena_Commando_F',
  backpack: 'BID_004_BlackKnight',
  pickaxe: 'Pickaxe_Lockjaw',
  sidekick: 'PetCarrier_Doggo',
  instruments: { guitar: 'Sparks_Guitar_Cool' },
});
```

### fakeEquip* helpers
<Badge type="info" text="method" />

```ts
fakeEquipOutfit(id) · fakeEquipBackpack(id) · fakeEquipPickaxe(id)
fakeEquipContrail(id) · fakeEquipShoes(id) · fakeEquipGlider(id)
fakeEquipSidekick(id)
fakeInstruments({ bass?, guitar?, drums?, keytar?, microphone? })
```

Single-slot shortcuts for `fakeApplyCosmetics`.

### fakeOutfit
<Badge type="info" text="method" />

```ts
fakeOutfit(id: string, style?: FakeOutfitStyle): Promise<void>
```

Equips an outfit with a full style — corruption/colour variants, a primary/secondary colour swatch, a sticker, and enlightenment (kill-count-driven styles). The colours and sticker are packed into the variant array at the game's fixed indices (`primary` → 3, `secondary` → 4, `sticker` → 13); an `Emoji_*` sticker is auto-prefixed with `AthenaEmoji:`. `enlightenment: [tier, value]` is written to `LoadoutMeta.scratch`, and each call rerolls the loadout salt so the game re-reads the style.

```ts
await party.me.fakeOutfit('CID_028_Athena_Commando_F', {
  colors: { primary: 5, secondary: 12 },
  sticker: 'Emoji_Wow',
  enlightenment: [2, 30],
});
```

### fakeSidekick / fakeSidekickAnim / fakeStopSidekickAnim
<Badge type="info" text="method" />

```ts
fakeSidekick(id: string | null): Promise<void>
fakeSidekickAnim(anim?: SidekickAnimValue | 'None'): Promise<void>
fakeStopSidekickAnim(): Promise<void>
```

Equips a Companion (sidekick) in the `mm` slot and writes the matching `CosmeticCompanion:` def into `AthenaCosmeticLoadout`; pass `null`/`'None'`/`''` to remove it. `fakeSidekickAnim` drives the sidekick's `FrontendMimosa` animation — `SidekickAnim.emote` (`'Emote'`, the default) or `SidekickAnim.interact` (`'Interact'`); `fakeStopSidekickAnim` clears it.

### fakeBanner
<Badge type="info" text="method" />

```ts
fakeBanner(icon: string, color?: string): Promise<void>
```

Sets your banner in all three places the game reads it: `AthenaBannerInfo`, `MpLoadout1` (`li`/`lc`) and `MpLoadout2` (`li`/`lc`). The colour id is normalised to PascalCase (`defaultcolor18` → `DefaultColor18`).

### fakeCrown / fakeLoadoutStats
<Badge type="info" text="method" />

```ts
fakeCrown(wins: number, playEmote?: boolean): Promise<void>
fakeLoadoutStats(values: Record<string, number>): Promise<void>
```

`fakeCrown` shows a crowned-victor crown over your lobby character by writing `TotalVictoryCrowns`, `TotalRoyalRoyales` and `HasCrown` into `LoadoutMeta.stats`. Pass `playEmote: true` to follow the crown patch — after a ~500 ms delay so the crown count applies first — with the **Crowning Achievement** emote (`EID_Coronet`), whose crown scales to the win count you just set. `fakeLoadoutStats` is the general form — merge any `"Key:Value"` stats into `LoadoutMeta` (existing keys are replaced, others left alone).

### fakeJamTrack
<Badge type="info" text="method" />

```ts
fakeJamTrack(trackKey: string, part?: JamPartValue): Promise<void>
```

Plays a Festival **jam track** by its placeholder key. Builds the `SparksSongPart_Placeholder_{key}_{part}` asset and writes it to both `Default:FrontendEmote_j` and `Default:FrontendSparksSongPart_j`. `trackKey` accepts the raw digits or the full `sid_placeholder_430` form (the prefix is stripped). `part` selects the stem — `JamPart.vocals` (`'Vox'`, default), `JamPart.lead`, `JamPart.bass` or `JamPart.drums`. Use `fakeJam` instead when you already have a full jam def path.

### fakeBattlePass / fakeLevel
<Badge type="info" text="method" />

```ts
fakeBattlePass(purchased: boolean, level: number): Promise<void>
fakeLevel(level: number): Promise<void>
```

Sets your `BattlePassInfo`. `fakeLevel` changes only the level, keeping your current purchased flag.

### fakePlatform
<Badge type="info" text="method" />

```ts
fakePlatform(platform: string): Promise<void>
```

Sets the platform icon shown next to you (`WIN`, `PSN`, `XBL`, `SWT`, `AND`, `IOS`, …). The platform type and crossplay pool are derived from the name.

### fakePlaying / fakeSittingOut
<Badge type="info" text="method" />

```ts
fakePlaying(playing?: boolean, playerCount?: number, startedAt?: Date): Promise<void>
fakeSittingOut(sittingOut?: boolean): Promise<void>
```

`fakePlaying` fakes being in a live match — flips `PackedState` to `InGame`/`InBattleRoyale`, sets the remaining-players count and match-start time. `fakeSittingOut` toggles the `SittingOut` matchmaking status.

### fakeEmote / fakeEmoji / fakeStopEmote
<Badge type="info" text="method" />

```ts
fakeEmote(id: string): Promise<void>
fakeEmoji(id: string): Promise<void>
fakeStopEmote(): Promise<void>
```

Play a fake emote or emoji by id (`EID_…` / `Emoji_…`) or a full def path, or clear it. Both write `Default:FrontendEmote_j`; `fakeEmoji` builds the `Dances/Emoji/…` path.

### fakeJam
<Badge type="info" text="method" />

```ts
fakeJam(id: string): Promise<void>
```

Plays a fake Festival jam track. Writes **both** `Default:FrontendEmote_j` and `Default:FrontendSparksSongPart_j`. Jam tracks don't map to a simple id, so pass the full def path (anything containing `/`); a bare id is treated as an emote path.

### fakeReady
<Badge type="info" text="method" />

```ts
fakeReady(ready?: boolean | ReadyStateValue): Promise<void>
```

Sets your `MatchmakingInfo.readyStatus`. Pass `true`/`false`, or a `ReadyState` value (`ReadyState.Ready` / `NotReady` / `SittingOut`).

## Lifecycle & privacy

Beyond reading and patching meta, a `Party` can be created, joined, left and re-configured. The stateful helpers on `Party` (below) handle the revision for you; creating and joining need a live XMPP connection, so those live on the [`LiveClient`](/epic/live#methods) (`bot.createParty()`, `bot.joinParty(id)`, `bot.joinFriend(id)`), which fills the connection id from your XMPP JID.

### leave / invite

```ts
leave(): Promise<void>
invite(accountId: string, sendPing?: boolean): Promise<void>
```

`leave` removes you from the party (leaving = kicking yourself). `invite` invites a friend by account id; `sendPing` (default `true`) also sends them a ping so the invite surfaces in-game.

### setPrivacy
<Badge type="info" text="method" />

```ts
setPrivacy(privacy: PartyPrivacyValue | PartyPrivacyPreset): Promise<void>
```

Sets who can see and join the party (leader only). Pass a preset **name** or a full `PartyPrivacyPreset` object. Under the hood it patches both the party config (`urn:epic:cfg:*-perm_s`) and the `Default:PrivacySettings_j` meta key, handling the revision and one stale-revision retry.

```ts
import { PartyPrivacy, PARTY_PRIVACY_LIST, isPartyPrivacy } from 'fnapi-js';

await party.setPrivacy('private');

const choice = 'friends';
if (isPartyPrivacy(choice)) await party.setPrivacy(choice);
```

`PartyPrivacy` presets (also listed in `PARTY_PRIVACY_LIST`):

| Preset | Party type | Who can join |
| --- | --- | --- |
| `public` | `Public` | Anyone, any member can invite. |
| `friendsOfFriends` | `FriendsOnly` | Friends of any member. |
| `friends` | `FriendsOnly` | The leader's friends only. |
| `privateOfFriends` | `Private` | Invite-only, any member can invite. |
| `private` | `Private` | Invite-only, leader invites only. |

### setConfig
<Badge type="info" text="method" />

```ts
setConfig(patch: Record<string, unknown>): Promise<void>
```

Patches raw party config keys (leader only) — the general form behind `setPrivacy`.

### Creating & joining (LiveClient)

```ts
const bot = await session.live();

const party = await bot.createParty({ maxSize: 16, joinConfirmation: true });
await party.setPrivacy('friends');

await bot.joinFriend('a1b2c3…');   // reads the friend's presence join_info
await bot.joinParty('party-id');   // join by id directly
await bot.leaveParty();
```

`PartyConfig` accepts `{ discoverability?, joinability?, joinConfirmation?, maxSize?, chatEnabled? }`. See [Live Bot](/epic/live) for the full join/accept surface and the party notification events.

## PartyClient
<Badge type="tip" text="class" />

The low-level endpoint client on `client.party` — for when you want the raw calls with explicit tokens/ids.

```ts
client.party.userParties(accessToken, accountId)
client.party.updateParty(accessToken, partyId, { revision, meta })
client.party.updateMemberMeta(accessToken, partyId, accountId, { revision, update, delete })
client.party.promote(accessToken, partyId, memberId)
client.party.kick(accessToken, partyId, accountId)     // leave = kick yourself
client.party.invite(accessToken, partyId, friendId, sendPing?)
client.party.requestToJoin(accessToken, friendId, accountId)
client.party.pings(accessToken, accountId, pingerId)

client.party.create(accessToken, identity, config?)          // identity: { accountId, connectionId, displayName, platform?, buildId? }
client.party.joinById(accessToken, partyId, identity)
client.party.confirmMember(accessToken, partyId, accountId)   // approve a join request
client.party.rejectMember(accessToken, partyId, accountId)    // reject a join request
client.party.declineInvite(accessToken, partyId, accountId)
client.party.sendIntention(accessToken, targetId, accountId)  // ask to join
client.party.leave(accessToken, partyId, accountId)
```

`PARTY_BUILD_ID` and `PARTY_DEFAULT_PLATFORM` are exported for the `identity` payload.
