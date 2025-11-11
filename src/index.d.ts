declare module 'fnapi-js' {
    export interface ApiClientOptions {
        apiKey?: string;
        language?: string;
        headers?: Record<string, string>;
        query?: Record<string, string>;
    }

    export interface StatsResponse {
        account: {
            id: string;
            name: string;
        };
        battlePass: {
            level: number;
            progress: number;
        };
        image: string;
        stats: {
            all: StatsData;
            keyboardMouse: StatsData;
            gamepad: StatsData;
            touch: StatsData;
        };
    }

    interface StatsData {
        overall: GameModeStats;
        solo: GameModeStats;
        duo: GameModeStats;
        squad: GameModeStats;
        ltm: GameModeStats;
    }

    interface GameModeStats {
        score: number;
        scorePerMin: number;
        scorePerMatch: number;
        wins: number;
        top3?: number;
        top5?: number;
        top6?: number;
        top10?: number;
        top12?: number;
        top25?: number;
        kills: number;
        killsPerMin: number;
        killsPerMatch: number;
        deaths: number;
        kd: number;
        matches: number;
        winRate: number;
        minutesPlayed: number;
        playersOutlived: number;
        lastModified: string;
    }

    export class Stats {
        constructor(client: ApiClient);
        get(name: string, accountType: string, timeWindow: string, image?: string): Promise<StatsResponse>;
        byId(id: string, timeWindow: string, image?: string): Promise<StatsResponse>;
    }

    export interface CreatorCodeResponse {
        code: string;
        account: {
            id: string;
            name: string;
        };
        status: string;
        verified: boolean;
    }

    export class CreatorCode {
        constructor(client: ApiClient);
        get(code: string): Promise<CreatorCodeResponse>;
    }

    export interface CosmeticResponse {
        id: string;
        name: string;
        description: string;
        type: {
            value: string;
            displayValue: string;
            backendValue: string;
        };
        rarity: {
            value: string;
            displayValue: string;
            backendValue: string;
        };
        series: {
            value: string;
            image: string;
            backendValue: string;
        } | null;
        set: {
            value: string;
            text: string;
            backendValue: string;
        } | null;
        introduction: {
            chapter: string;
            season: string;
            text: string;
            backendValue: number;
        };
        images: {
            smallIcon: string;
            icon: string;
            featured: string | null;
            other: Record<string, string>;
        };
        variants: Array<{
            channel: string;
            type: string;
            options: Array<{
                tag: string;
                name: string;
                image: string;
            }>;
        }> | null;
        gameplayTags: string[];
        showcaseVideo: string | null;
        displayAssetPath: string | null;
        definitionPath: string | null;
        path: string;
        added: string;
        shopHistory: string[] | null;
    }

    export class Cosmetics {
        constructor(client: ApiClient);
        searchCosmetics(options: SearchOptions): Promise<CosmeticResponse[]>;
        getNewCosmetics(): Promise<CosmeticResponse[]>;
        getById(id: string): Promise<CosmeticResponse>;
        getTracks(): Promise<CosmeticResponse[]>;
        getInstruments(): Promise<CosmeticResponse[]>;
        getCars(): Promise<CosmeticResponse[]>;
        getLego(): Promise<CosmeticResponse[]>;
        getLegoKits(): Promise<CosmeticResponse[]>;
        getBeans(): Promise<CosmeticResponse[]>;
    }

    export class SearchOptions {
        constructor();
        setMatchMethod(method: string): this;
        setSearchLanguage(language: string): this;
        setType(type: string): this;
        setRarity(rarity: string): this;
        build(): Record<string, any>;
    }

    export interface AesResponse {
        build: string;
        mainKey: string;
        dynamicKeys: Array<{
            pakFilename: string;
            pakGuid: string;
            key: string;
        }>;
    }

    export interface BannerResponse {
        id: string;
        devName: string;
        name: string;
        description: string;
        category: string;
        fullUsageRights: boolean;
        images: {
            smallIcon: string;
            icon: string;
        };
    }

    export interface BannerColorResponse {
        id: string;
        color: string;
        category: string;
        subCategory: string | null;
    }

    export interface MapResponse {
        images: {
            blank: string;
            pois: string;
        };
        pois: Array<{
            id: string;
            name: string;
            location: {
                x: number;
                y: number;
                z: number;
            };
        }>;
    }

    export interface NewsResponse {
        br: {
            hash: string;
            date: string;
            image: string | null;
            messages: Array<{
                title: string;
                body: string;
                image: string;
                adspace: string | null;
            }>;
        };
        stw: {
            hash: string;
            date: string;
            messages: Array<{
                title: string;
                body: string;
                image: string;
                adspace: string | null;
            }>;
        };
        creative: {
            hash: string;
            date: string;
            messages: Array<{
                title: string;
                body: string;
                image: string;
                adspace: string | null;
            }>;
        };
    }

    export interface PlaylistResponse {
        id: string;
        name: string;
        description: string;
        gameType: string;
        ratingType: string;
        minPlayers: number;
        maxPlayers: number;
        maxTeams: number;
        maxTeamSize: number;
        maxSquads: number;
        maxSquadSize: number;
        images: {
            showcase: string | null;
            missionIcon: string | null;
        };
    }

    export interface ShopResponse {
        hash: string;
        date: string;
        vbuckIcon: string;
        featured: ShopSection;
        daily: ShopSection;
        specialFeatured: ShopSection;
        specialDaily: ShopSection;
        votes: ShopSection;
        voteWinners: ShopSection;
    }

    interface ShopSection {
        name: string;
        entries: Array<{
            regularPrice: number;
            finalPrice: number;
            bundle: {
                name: string;
                info: string;
                image: string;
            } | null;
            banner: {
                value: string;
                intensity: string;
                backendValue: string;
            } | null;
            giftable: boolean;
            refundable: boolean;
            sortPriority: number;
            categories: string[];
            sectionId: string;
            section: {
                id: string;
                name: string;
                index: number;
            };
            devName: string;
            offerId: string;
            displayAssetPath: string;
            tileSize: string;
            newDisplayAssetPath: string;
        }>;
    }

    export class Aes {
        constructor(client: ApiClient);
        getKeys(): Promise<AesResponse>;
    }

    export class Banners {
        constructor(client: ApiClient);
        getBanners(): Promise<BannerResponse[]>;
        getColors(): Promise<BannerColorResponse[]>;
    }

    export class Map {
        constructor(client: ApiClient);
        get(): Promise<MapResponse>;
    }

    export class News {
        constructor(client: ApiClient);
        get(): Promise<NewsResponse>;
    }

    export class Playlists {
        constructor(client: ApiClient);
        getPlaylists(): Promise<PlaylistResponse[]>;
        getPlaylist(id: string): Promise<PlaylistResponse>;
    }

    export class Shop {
        constructor(client: ApiClient);
        get(): Promise<ShopResponse>;
    }

    export class ApiClient {
        constructor(options?: ApiClientOptions);
        stats: Stats;
        sac: CreatorCode;
        cosmetics: Cosmetics;
        aes: Aes;
        map: Map;
        news: News;
        playlists: Playlists;
        shop: Shop;
        banners: Banners;

        request(method: string, path: string, data?: any, options?: {
            headers?: Record<string, string>;
            params?: Record<string, any>;
        }): Promise<any>;
    }

    export class Response {
        constructor(status: number, headers: Record<string, string>, data: any);
        status(): number;
        headers(): Record<string, string>;
        body(): any;
        isSuccess(): boolean;
    }

    export class AccountType {
        static EPIC: string;
        static PSN: string;
        static XBL: string;
        static epic(): string;
        static psn(): string;
        static xbl(): string;
    }

    export class CosmeticType {
        static OUTFIT: string;
        static BACKPACK: string;
        static PICKAXE: string;
        static GLIDER: string;
        static EMOTE: string;
        static EMOJI: string;
        static LOADING: string;
        static WRAP: string;
        static BANNER: string;
        static CONTRAIL: string;
        static SPRAY: string;
        static TOY: string;
        static MUSIC: string;
        static PET: string;
        static BUNDLE: string;
        static TRACK: string;
        static INSTRUMENT: string;
        static CAR: string;
        static LEGO: string;
        static LEGOKIT: string;
        static BEAN: string;
        static SIDEKICK: string;

        static outfit(): string;
        static backpack(): string;
        static pickaxe(): string;
        static glider(): string;
        static emote(): string;
        static emoji(): string;
        static loading(): string;
        static wrap(): string;
        static banner(): string;
        static contrail(): string;
        static spray(): string;
        static toy(): string;
        static music(): string;
        static pet(): string;
        static bundle(): string;
        static track(): string;
        static instrument(): string;
        static car(): string;
        static lego(): string;
        static legokit(): string;
        static bean(): string;
        static sidekick(): string;
    }

    export class Language {
        static AR: string;
        static DE: string;
        static EN: string;
        static ES: string;
        static ES_419: string;
        static FR: string;
        static IT: string;
        static JA: string;
        static KO: string;
        static PL: string;
        static PT_BR: string;
        static RU: string;
        static TR: string;
        static ZH_CN: string;
        static ZH_HANT: string;

        static ar(): string;
        static de(): string;
        static en(): string;
        static es(): string;
        static es419(): string;
        static fr(): string;
        static it(): string;
        static ja(): string;
        static ko(): string;
        static pl(): string;
        static ptBr(): string;
        static ru(): string;
        static tr(): string;
        static zhCn(): string;
        static zhHant(): string;
    }

    export class MatchMethod {
        static FULL: string;
        static CONTAINS: string;
        static STARTS: string;
        static ENDS: string;

        static full(): string;
        static exact(): string;
        static contains(): string;
        static starts(): string;
        static ends(): string;
    }

    export class RequestFlags {
        static FLAGS: {
            NONE: number;
            INCLUDE_PATHS: number;
            INCLUDE_STATS: number;
            INCLUDE_SHOP_HISTORY: number;
        };

        static multiple(...flags: number[]): string;
        static hasFlag(value: number | string, flag: number): boolean;
        static getSetFlags(value: number | string): string[];
        static all(): string;
        static none(): number;
        static safeGet(obj: any, path: string, defaultValue?: any): any;
    }

    export class StatsImage {
        static ALL: string;
        static KEYBOARD_MOUSE: string;
        static GAMEPAD: string;
        static TOUCH: string;

        static all(): string;
        static keyboardMouse(): string;
        static gamepad(): string;
        static touch(): string;
    }

    export class TimeWindow {
        static LIFETIME: string;
        static SEASON: string;

        static lifetime(): string;
        static season(): string;
    }

    export class Enums {
        static accountType: typeof AccountType;
        static cosmeticType: typeof CosmeticType;
        static language: typeof Language;
        static matchMethod: typeof MatchMethod;
        static requestFlags: typeof RequestFlags;
        static statsImage: typeof StatsImage;
        static timeWindow: typeof TimeWindow;
    }
}
