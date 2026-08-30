# NewsEndpoint

In-game news feeds. Reached via `client.news`. `all()` returns both game modes; `br()` and `stw()` return a single mode's `GameModeNews`. All accept optional `LanguageOptions`.

## NewsEndpoint
<Badge type="tip" text="class" />

```ts
class NewsEndpoint extends BaseEndpoint
```

Endpoint wrapper for the `/v2/news` routes covering Battle Royale and Save the World news feeds.

```ts
import { FortniteAPI } from 'fnapi-js';

const client = new FortniteAPI();
const news = await client.news.all();
console.log(news.br?.motds?.length);
```

## all
<Badge type="info" text="method" />

```ts
all(options?: LanguageOptions): Promise<News>
```

Fetches the combined news payload containing the optional `br` and `stw` feeds.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<News> — combined news with br and stw sub-feeds`

```ts
const news = await client.news.all({ language: 'de' });
console.log(news.stw?.messages);
```

## br
<Badge type="info" text="method" />

```ts
br(options?: LanguageOptions): Promise<GameModeNews>
```

Fetches only the Battle Royale news feed.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<GameModeNews> — the BR news feed (motds, messages)`

```ts
const br = await client.news.br();
for (const motd of br.motds ?? []) console.log(motd.title);
```

## stw
<Badge type="info" text="method" />

```ts
stw(options?: LanguageOptions): Promise<GameModeNews>
```

Fetches only the Save the World news feed.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `LanguageOptions` | Optional language and transport controls. |

**Returns:** `Promise<GameModeNews> — the STW news feed`

```ts
const stw = await client.news.stw();
console.log(stw.messages);
```
