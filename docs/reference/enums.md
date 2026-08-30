# Enums

Enums are `as const` string-value objects (plus one numeric bitfield for rarity backend). Each ships a matching value type, an all-caps `*_S` values array, and an `is*` type guard for runtime validation. Import any of them from the package root.

## Language
<Badge type="warning" text="enum" />

```ts
const Language: { Arabic:'ar'; German:'de'; English:'en'; Spanish:'es'; SpanishLatinAmerica:'es-419'; French:'fr'; Indonesian:'id'; Italian:'it'; Japanese:'ja'; Korean:'ko'; Polish:'pl'; PortugueseBrazil:'pt-BR'; Russian:'ru'; Thai:'th'; Turkish:'tr'; Vietnamese:'vi'; ChineseSimplified:'zh-Hans'; ChineseTraditional:'zh-Hant' }
```

Wire language codes accepted by the `language` option on most Fortnite endpoints. Includes the compound codes `es-419`, `pt-BR`, `zh-Hans`, and `zh-Hant`.

```ts
import { FortniteAPI, Language } from 'fnapi-js';

const api = new FortniteAPI();
const { data } = await api.cosmetics.all({ language: Language.PortugueseBrazil });
```

::: tip Note
Values array: `LANGUAGES`. Guard: `isLanguage(value)`.
:::

## Rarity
<Badge type="warning" text="enum" />

```ts
const Rarity: { Common:'common'; Uncommon:'uncommon'; Rare:'rare'; Epic:'epic'; Legendary:'legendary'; Mythic:'mythic'; Dark:'dark'; Dc:'dc'; Frozen:'frozen'; GamingLegends:'gaminglegends'; Icon:'icon'; Lamborghini:'lamborghini'; Lava:'lava'; Marvel:'marvel'; Shadow:'shadow'; Slurp:'slurp'; StarWars:'starwars' }
```

<div><span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#9aa0ab"></span>common</span> <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#4ade80"></span>uncommon</span> <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#43a6ff"></span>rare</span> <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#b98bff"></span>epic</span> <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#f6a13c"></span>legendary</span> <span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--vp-font-family-mono);font-size:12px;padding:2px 9px;margin:2px;border:1px solid var(--vp-c-divider);border-radius:999px"><span style="width:9px;height:9px;border-radius:50%;background:#f5d13b"></span>mythic</span></div>

Display rarity values as returned by fortnite-api.com. Full set: common, uncommon, rare, epic, legendary, mythic, dark, dc, frozen, gaminglegends, icon, lamborghini, lava, marvel, shadow, slurp, starwars.

```ts
import { Rarity, isRarity } from 'fnapi-js';

const value: string = 'legendary';
if (isRarity(value)) {
  const rarity: Rarity = value;
}
```

::: tip Note
Values array: `RARITIES`. Guard: `isRarity(value)`.
:::

## BackendRarity
<Badge type="warning" text="enum" />

```ts
const BackendRarity: { Common:'EFortRarity::Common'; Uncommon:'EFortRarity::Uncommon'; Rare:'EFortRarity::Rare'; Epic:'EFortRarity::Epic'; Legendary:'EFortRarity::Legendary'; Mythic:'EFortRarity::Mythic'; Unattainable:'EFortRarity::Unattainable' }
```

Raw `EFortRarity::*` values as they appear in the game backend, distinct from the display `Rarity` values.

```ts
import { BackendRarity } from 'fnapi-js';

const raw = BackendRarity.Legendary;
```

::: tip Note
Values array: `BACKEND_RARITIES`. Guard: `isBackendRarity(value)`.
:::

## CosmeticType
<Badge type="warning" text="enum" />

```ts
type CosmeticType = 'outfit'|'backpack'|'pickaxe'|'glider'|'contrail'|'emote'|'emoji'|'spray'|'toy'|'wrap'|'loadingscreen'|'music'|'banner'|'pet'|'petcarrier'|'shoe'|'sidekick'|'skin'|'body'|'wheel'|'booster'|'drifttrail'|'guitar'|'bass'|'drum'|'keyboard'|'mic'|'aura'|'legoprop'|'legoset'
```

Friendly cosmetic type keys. Each maps to a backend `Athena*`/`Vehicle*`/`Sparks*`/`Juno*` type via the `COSMETIC_TYPE_BACKEND` table.

```ts
import { CosmeticType, toBackendType, fromBackendType } from 'fnapi-js';

const backend = toBackendType(CosmeticType.outfit); // 'AthenaCharacter'
const key = fromBackendType('AthenaDance'); // 'emote'
```

::: tip Note
Values array: `COSMETIC_TYPES`. Guard: `isCosmeticType(value)`. Convert with `toBackendType(type)` (returns e.g. `AthenaCharacter`) and `fromBackendType(backendType)` (returns the key or `null`).
:::

## CosmeticSeries
<Badge type="warning" text="enum" />

```ts
const CosmeticSeries: { Crew:'CrewSeries'; Dark:'CUBESeries'; Dc:'DCUSeries'; Icon:'CreatorCollabSeries'; Marvel:'MarvelSeries'; StarWars:'ColumbusSeries'; Lamborghini:'Series_Lamborghini'; Ferrari:'Series_Ferrari'; /* ...plus vehicle/brand series */ }
```

Backend series identifiers for cosmetics, covering themed series (Crew, DC, Marvel, Star Wars, Slurp, etc.) and car-brand series (`Series_Ferrari`, `Series_Lamborghini`, `Series_Tesla`, and more).

```ts
import { CosmeticSeries, VEHICLE_SERIES } from 'fnapi-js';

const isCar = VEHICLE_SERIES.includes(CosmeticSeries.Ferrari); // true
```

::: tip Note
Values array: `COSMETIC_SERIES`. Guard: `isCosmeticSeries(value)`. `VEHICLE_SERIES` is a curated subset of the car-brand series (Aston Martin, BMW, Bugatti, Chevrolet, Ferrari, Lamborghini, Porsche, Tesla, etc.).
:::

## AccountType
<Badge type="warning" text="enum" />

```ts
const AccountType: { Epic:'epic'; Psn:'psn'; Xbl:'xbl' }
```

Platform account namespaces for stats lookups: Epic, PlayStation Network, and Xbox Live.

```ts
import { AccountType } from 'fnapi-js';

const platform = AccountType.Psn; // 'psn'
```

::: tip Note
Values array: `ACCOUNT_TYPES`. Guard: `isAccountType(value)`.
:::

## TimeWindow
<Badge type="warning" text="enum" />

```ts
const TimeWindow: { Lifetime:'lifetime'; Season:'season' }
```

Stats aggregation window: `lifetime` totals or current-`season` only.

```ts
import { TimeWindow } from 'fnapi-js';

const window = TimeWindow.Season; // 'season'
```

::: tip Note
Values array: `TIME_WINDOWS`. Guard: `isTimeWindow(value)`.
:::

## StatsImage
<Badge type="warning" text="enum" />

```ts
const StatsImage: { All:'all'; KeyboardMouse:'keyboardMouse'; Gamepad:'gamepad'; Touch:'touch'; None:'none' }
```

Which input-type stats image the stats endpoint should render: all inputs combined, keyboard/mouse, gamepad, touch, or none.

```ts
import { StatsImage } from 'fnapi-js';

const image = StatsImage.KeyboardMouse; // 'keyboardMouse'
```

::: tip Note
Values array: `STATS_IMAGES`. Guard: `isStatsImage(value)`.
:::

## MatchMethod
<Badge type="warning" text="enum" />

```ts
const MatchMethod: { Full:'full'; Contains:'contains'; Starts:'starts'; Ends:'ends' }
```

String match strategy for cosmetic search filters: exact (`full`), substring (`contains`), prefix (`starts`), or suffix (`ends`).

```ts
import { MatchMethod } from 'fnapi-js';

const method = MatchMethod.Contains; // 'contains'
```

::: tip Note
Values array: `MATCH_METHODS`. Guard: `isMatchMethod(value)`.
:::

## KeyFormat
<Badge type="warning" text="enum" />

```ts
const KeyFormat: { Hex:'hex'; Base64:'base64' }
```

Encoding format for AES keys returned by the AES endpoint: hexadecimal or base64.

```ts
import { FortniteAPI, KeyFormat } from 'fnapi-js';

const api = new FortniteAPI();
const { data } = await api.aes.get({ keyFormat: KeyFormat.Base64 });
```

::: tip Note
Values array: `KEY_FORMATS`. Guard: `isKeyFormat(value)`.
:::
