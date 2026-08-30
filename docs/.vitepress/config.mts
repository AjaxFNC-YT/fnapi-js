import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'fnapi-js',
  description: 'Typed wrapper for fortnite-api.com with a built-in Epic Games auth layer.',
  lang: 'en-US',
  cleanUrls: true,
  ignoreDeadLinks: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#7c6cff' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Examples', link: '/guide/examples' },
      { text: 'Reference', link: '/fortnite/fortnite-api' },
      {
        text: 'v2.0.0-beta.0',
        items: [
          { text: 'npm', link: 'https://www.npmjs.com/package/fnapi-js' },
          { text: 'Releases', link: 'https://github.com/AjaxFNC-YT/fnapi-js/releases' },
        ],
      },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
        { text: "Introduction", link: '/guide/introduction' },
        { text: "Installation", link: '/guide/installation' },
        { text: "Quick Start", link: '/guide/quick-start' },
        { text: "Examples", link: '/guide/examples' },
        { text: "Client & Options", link: '/guide/client-options' },
        { text: "Error Handling", link: '/guide/error-handling' },
        { text: "Epic Authentication", link: '/guide/epic-authentication' }
        ],
      },
      {
        text: 'Fortnite API',
        items: [
        { text: "FortniteAPI", link: '/fortnite/fortnite-api' },
        { text: "AesEndpoint", link: '/fortnite/aes' },
        { text: "BannersEndpoint", link: '/fortnite/banners' },
        { text: "CosmeticsEndpoint", link: '/fortnite/cosmetics' },
        { text: "CreatorCodeEndpoint", link: '/fortnite/creator-code' },
        { text: "MapEndpoint", link: '/fortnite/map' },
        { text: "NewsEndpoint", link: '/fortnite/news' },
        { text: "PlaylistsEndpoint", link: '/fortnite/playlists' },
        { text: "ShopEndpoint", link: '/fortnite/shop' },
        { text: "StatsEndpoint", link: '/fortnite/stats' },
        { text: "CosmeticSearchBuilder", link: '/fortnite/cosmetic-search-builder' }
        ],
      },
      {
        text: 'Epic Auth',
        items: [
        { text: "EpicGamesClient", link: '/epic/client' },
        { text: "AuthManager", link: '/epic/auth-manager' },
        { text: "EpicAuthSession", link: '/epic/session' },
        { text: "DeviceCodeFlow", link: '/epic/device-code-flow' },
        { text: "Auth Clients", link: '/epic/auth-clients' },
        { text: "DeviceAuthManager", link: '/epic/device-auth-manager' },
        { text: "AccountManager", link: '/epic/account-manager' },
        { text: "UserSearchManager", link: '/epic/user-search' },
        { text: "MCP Client", link: '/epic/mcp' },
        { text: "Locker", link: '/epic/locker' },
        { text: "Party", link: '/epic/party' },
        { text: "FriendsManager", link: '/epic/friends' },
        { text: "Habanero (Ranked)", link: '/epic/habanero' },
        { text: "PresenceManager", link: '/epic/presence' },
        { text: "XMPP / Presence (realtime)", link: '/epic/xmpp' },
        { text: "Chat & Live Events", link: '/epic/chat' },
        { text: "Live Bot (events)", link: '/epic/live' },
        { text: "Shop & Gifting", link: '/epic/shop' },
        { text: "LightswitchManager", link: '/epic/lightswitch' },
        { text: "SocialBanManager", link: '/epic/social-ban' },
        { text: "StatsProxyManager", link: '/epic/stats' },
        { text: "FortniteGameManager", link: '/epic/game' },
        { text: "EcosystemEndpoint", link: '/epic/ecosystem' },
        { text: "Epic Errors", link: '/epic/errors' }
        ],
      },
      {
        text: 'Dilly (fortniteapi.com)',
        items: [
        { text: "DillyAPI", link: '/dilly/dilly' }
        ],
      },
      {
        text: 'Fncc (fn-api.cc)',
        items: [
        { text: "FnccAPI", link: '/fncc/fncc' }
        ],
      },
      {
        text: 'Reference',
        items: [
        { text: "Enums", link: '/reference/enums' },
        { text: "Response Flags", link: '/reference/response-flags' },
        { text: "MCP Operations", link: '/reference/mcp-operations' },
        { text: "Error Classes", link: '/reference/error-classes' },
        { text: "Utilities", link: '/reference/utilities' }
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/AjaxFNC-YT/fnapi-js' }],
    search: { provider: 'local' },
    outline: { level: [2, 3] },
    editLink: undefined,
  },
});
