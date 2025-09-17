# fnapi-js

An unofficial JavaScript/Typescript wrapper for the [Fortnite-API](https://fortnite-api.com/) REST API.

## Installation

```bash
npm install fnapi-js
```

## Usage

```javascript
// ESM
import { ApiClient, Enums } from 'fnapi-js';

// CommonJS
const { ApiClient, Enums } = require('fnapi-js');

// Initialize the client
const fnApi = new ApiClient({ apiKey: 'your-api-key' });

// Get player stats
const stats = await fnApi.stats.get(
    'username',
    Enums.accountType.epic(),
    Enums.timeWindow.lifetime(),
    Enums.statsImage.all()
);

// Search cosmetics
const searchOptions = new SearchOptions()
    .setType('outfit')
    .setRarity('epic')
    .setMatchMethod(Enums.matchMethod.contains());

const cosmetics = await fnApi.cosmetics.search(searchOptions);

// Get creator code
const creatorCode = await fnApi.sac.get('code');

// Get AES keys
const aesKeys = await fnApi.aes.get();
```

## Check out the docs
- [Documentation](https://github.com/AjaxFNC-YT/fnapi-js/blob/main/src/docs/DOCUMENTATION.md)

## Available Endpoints

- Stats
  - Get player stats
  - Get stats by account ID
- Cosmetics
  - Search cosmetics
  - Get new cosmetics
  - Get by ID
  - Get tracks, instruments, cars, LEGO items, etc.
- Creator Codes
  - Get creator code info
- AES
  - Get encryption keys
- Map
  - Get current map info
- News
  - Get game news
- Playlists
  - Get available playlists
  - Get playlist by ID
- Shop
  - Get current shop items
- Banners
  - Get all available banners
  - Get all avaible banner colors

## License

MIT (Meow!)
