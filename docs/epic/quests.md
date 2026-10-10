# Quests

The `QuestBook` reads a player's quests and lays them out the way the game's quest page does. It covers two sources:

- **Battle Royale and every mode**: Reload, LEGO, Festival, Rocket Racing, OG, Fall Guys, Ballistic, Arenas, ranked and events. These come from Epic's EOS quest service (`quest/v3`).
- **Save the World**: these come from the `campaign` profile.

Progress comes from Epic. Quest names, objective text, targets, categories, headers and sort orders come from the game files, through a `QuestCatalog` backed by fn-api.cc's [`/v1/quests`](/fncc/fncc#quests) endpoint.

```ts
import { EpicGamesClient, FnccAPI, QuestBook, QuestCatalog } from 'fnapi-js';

const catalog = new QuestCatalog(new FnccAPI().quests);
const session = await new EpicGamesClient().loginWithDeviceAuth(creds);

const log = await new QuestBook(session, catalog).log({ mode: 'battle-royale' });
for (const category of log.categories) {
  console.log(category.name);
  for (const quest of category.quests) {
    console.log(' ', quest.name, quest.objectives.map((o) => `${o.progress}/${o.target}`).join(' '));
  }
}
```

::: tip One catalog for every account
Quest names and categories are the same for every player, so create **one** `QuestCatalog` and share it between `QuestBook`s.

The catalog loads the whole quest dataset in a single `/v1/quests` request, about half a second, and then answers from memory. When Fortnite updates, call `catalog.refresh()` to load the new build's data; `catalog.build` tells you which build is loaded.
:::

## QuestBook
<Badge type="tip" text="class" />

```ts
new QuestBook(session: EpicAuthSession, catalog?: QuestCatalog)
```

Without a catalog you still get every quest's progress, but `name`, objective text, targets and categories are empty. Passing `enrich: true` without a catalog throws a `ValidationError`.

### log
<Badge type="info" text="method" />

```ts
log(options?: { mode?: QuestMode | QuestMode[]; includeClaimed?: boolean; includeHidden?: boolean; enrich?: boolean; signal?: AbortSignal }): Promise<QuestLog>
```

Returns `{ categories, uncategorized, quests, bundles, schedules, tracked, xp, enriched }`, laid out like the game:

- `categories` are the game's quest categories (`QuestCategoryData`), ordered by their `SortOrder`.
- Each category splits its quests into `headers`, such as "Week 1" or "Daily Challenge Quests", ordered by header sort order.
- Quests inside a header are ordered with unfinished ones first, then by the game's `SortPriority`, then by name.

A quest can sit in more than one category; dailies, for example, also appear under universal dailies. Quests whose tags match no category are listed in `uncategorized`.

`mode` keeps only categories for those modes. Use `QuestMode` for the values: `battle-royale`, `reload`, `lego`, `festival`, `rocket-racing`, `og`, `fall-guys`, `ballistic`, `arenas`, `save-the-world`. Claimed quests and quests the game hides are left out unless you pass `includeClaimed` or `includeHidden`. Hidden quests are:

- granter quests
- tracker quests kept out of the quest page (`includedInCategories: false`)
- old quests still on the account that the current game no longer has any data for

`xp` holds the season number, level, season XP and rested XP from the quest service.

### stw
<Badge type="info" text="method" />

```ts
stw(options?: { includeClaimed?: boolean; enrich?: boolean; signal?: AbortSignal }): Promise<StwQuestLog>
```

Returns the Save the World quest log, grouped by the game's `QuestCategoryTable` (Main Quests, Daily Quests, Side Quests, events and so on) and ordered by category priority. Objective progress comes from the campaign profile's `completion_*` counters.

It returns `{ categories, uncategorized, quests, dailies, dailyRerolls, enriched }`:

- `dailies` are the active STW daily quests, the only ones `reroll` works on. Wargames and Dungeon "dailies" are event quests and can't be rerolled.
- `dailyRerolls` is how many rerolls are left today.

### claim / reroll / track
<Badge type="info" text="method" />

```ts
claim(quest: Quest | string, options?: { selectedRewardIndex?: number }): Promise<MCPResponse>
reroll(quest: Quest | string): Promise<MCPResponse>
track(quests: Array<Quest | string>): Promise<MCPResponse>
```

These use the quest's own profile, `athena` or `campaign`. `reroll` is for STW daily quests (check `stw().dailyRerolls` first; Epic rejects the call when none are left), `track` sets the tracked BR quests, and `claim` claims a finished quest's reward.

## Quest

| Field | Description |
| --- | --- |
| `id`, `templateId`, `profile` | Item guid, template id, and `'athena'` or `'campaign'`. |
| `name`, `description` | Display text from the game files. Story quests often have no name, so `name` falls back to the description (as the game does), then to the first objective's text. |
| `state`, `completed`, `claimed` | `state` is lower-cased (`active`, `claimed`). `completed` is also set when every objective has reached its target. |
| `progress` | 0–1 across all objectives, or `null` when targets are unknown. |
| `objectives` | `{ id, description, progress, target, completed, stage, stageCount }`. `stage`/`stageCount` is the game's "step 1 of 4" display for quest chains. |
| `completionText` | The line the game shows when the quest is done, e.g. "Agreed to help Bastian!". |
| `bundleTemplateId`, `scheduleTemplateId` | The challenge bundle and schedule the quest came from. |
| `expiresAt`, `tracked`, `visible` | Expiry, whether it is tracked, and whether the game shows it. |
| `sortPriority`, `type`, `subtype`, `tags` | Game ordering, quest type and subtype (e.g. `WeeklyChallenge`), and category tags. |

## QuestCatalog
<Badge type="tip" text="class" />

```ts
new QuestCatalog(source?: QuestDataSource | QuestAssetSource, options?: { lang?: string; concurrency?: number; maxRateLimitWaits?: number })
QuestCatalog.from(snapshot: QuestCatalogSnapshot, source?: QuestDataSource | QuestAssetSource): QuestCatalog
export(): Promise<QuestCatalogSnapshot>
refresh(): void
build: string | null
```

There are two kinds of source:

- **`new FnccAPI().quests`** (recommended): loads everything in one request. `lang` picks the text language.
- **`new FnccAPI().assets`**, or anything with `search` and `json`: reads each game file on its own. This needs about a thousand requests on a cold start and waits out rate limits as it goes. Use it only with a mirror that has no `/v1/quests`.

`export()` saves the catalog and `QuestCatalog.from(snapshot)` restores it. A snapshot taken from the quests endpoint is complete and needs no source at all, which is handy for running offline.

```ts
writeFileSync('quest-catalog.json', JSON.stringify(await catalog.export()));
const restored = QuestCatalog.from(JSON.parse(readFileSync('quest-catalog.json', 'utf8')));
```

## Raw session calls

These `EpicAuthSession` methods are available directly:

| Method | Description |
| --- | --- |
| `questProgress()` | The raw `quest/v3` progress. |
| `questLogin(profile?)` | Generates quests (`ClientQuestLogin`). |
| `claimQuestReward(questId, { profile, selectedRewardIndex })` | Claims a quest reward. |
| `rerollDailyQuest(questId, { profile })` | Rerolls a daily quest. The profile defaults to `campaign`. |
| `trackQuests(templateIds)` | Sets the tracked BR quests (`AthenaTrackQuests`). |
| `pinStwQuests(questIds)` | Pins STW quests (`SetPinnedQuests`). |

`epic.quests` (`QuestService`) exposes `progress(eosToken, accountId)`.
