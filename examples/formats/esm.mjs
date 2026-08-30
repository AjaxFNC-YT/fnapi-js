import { FortniteAPI, Language } from '../../dist/index.js';

const client = new FortniteAPI({ language: Language.English });

const shop = await client.shop.get();
console.log(`${shop.entries.length} shop entries on ${shop.date}`);

const map = await client.map.get();
console.log(`${map.pois.length} named locations`);
