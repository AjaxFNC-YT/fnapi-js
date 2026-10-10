import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/core/errors.js';
import { ContentPagesManager } from '../../src/epic/content.js';
import {
  ContentServiceManager,
  contentKeyToHex,
  parseFortniteBuild,
  toIslandKey,
} from '../../src/epic/contentService.js';
import { EpicGamesClient } from '../../src/epic/client.js';
import { FortniteGameManager } from '../../src/epic/game.js';
import {
  ANDROID_DEVICE_PROFILE,
  LAUNCHER_BASE_URL,
  LauncherInstaller,
  LauncherManager,
  apkFromBuild,
} from '../../src/epic/launcher.js';
import { MCPClient } from '../../src/epic/mcp.js';
import { MotdManager } from '../../src/epic/motd.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import type { OAuthToken } from '../../src/epic/types.js';
import { createMockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function rest(...responses: MockResponseInit[]) {
  const mock = createMockFetch(...responses);
  return { mock, rest: new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: LAUNCHER_BASE_URL }) };
}

const page = {
  _title: 'Fortnite Game',
  emergencynoticev2: {
    emergencynotices: {
      emergencynotices: [{ title: 'Down', body: 'Servers are down', hidden: false, platforms: ['windows'] }],
    },
  },
  battleroyalenewsv2: { news: { motds: [{ id: 'm1', title: 'Hello', body: 'World', hidden: false }] } },
  tournamentinformation: {
    tournament_info: { tournaments: [{ tournament_display_id: 's42_shadow', long_format_title: 'Shadow Cup' }] },
  },
  dynamicbackgrounds: { backgrounds: { backgrounds: [{ key: 'lobby', stage: 'season4230', backgroundimage: 'bg.jpg' }] } },
  shopSections: { sectionList: { sections: [{ sectionId: 'HeroGear', landingPriority: 1, bHidden: false }] } },
  loginmessage: { loginmessage: { message: { title: '', body: '' } } },
};

describe('ContentPagesManager', () => {
  it('reads the page with a language and exposes typed sections', async () => {
    const { mock, rest: client } = rest({ status: 200, body: page });
    const content = new ContentPagesManager(client);

    expect(await content.emergencyNotices()).toEqual([
      { title: 'Down', body: 'Servers are down', hidden: false, platforms: ['windows'] },
    ]);
    expect(mock.lastRequest().path).toBe('/content/api/pages/fortnite-game');
    expect(mock.lastRequest().query.get('lang')).toBe('en');
    expect((await content.motds())[0]?.id).toBe('m1');
    expect((await content.tournament('s42_shadow'))?.long_format_title).toBe('Shadow Cup');
    expect(await content.tournament('missing')).toBeNull();
    expect((await content.backgrounds())[0]?.key).toBe('lobby');
    expect((await content.shopSections())[0]?.sectionId).toBe('HeroGear');
    expect(await content.loginMessage()).toBeNull();
    expect(mock.calls).toBe(1);
  });

  it('returns empty lists for missing sections and fetches a sub page', async () => {
    const { mock, rest: client } = rest({ status: 200, body: { _title: 'x' } });
    const content = new ContentPagesManager(client);
    expect(await content.emergencyNotices({ cache: false })).toEqual([]);
    expect(await content.tournaments({ cache: false })).toEqual([]);
    await content.page('fortnite-game', 'shop-sections', { lang: 'de', cache: false });
    expect(mock.lastRequest().path).toBe('/content/api/pages/fortnite-game/shop-sections');
    expect(mock.lastRequest().query.get('lang')).toBe('de');
  });
});

describe('MotdManager', () => {
  it('posts the channel target with merged parameters and tags', async () => {
    const { mock, rest: client } = rest({ status: 200, body: { tcId: 't', contentItems: [{ contentHash: 'h' }] } });
    const response = await new MotdManager(client).target('AT', { parameters: { country: 'DE' }, tags: ['Product.Juno'] });
    expect(response).toEqual({ tcId: 't', contentItems: [{ contentHash: 'h' }] });
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/api/v1/fortnite-br/channel/motd/target');
    expect(JSON.parse(request.body ?? '{}')).toEqual({
      parameters: { platform: 'Windows', language: 'en', serverRegion: 'NAE', country: 'DE' },
      tags: ['Product.Juno'],
    });
  });

  it('treats a 204 as no motds', async () => {
    const { rest: client } = rest({ status: 204 });
    expect(await new MotdManager(client).target('AT')).toEqual({ tcId: null, contentItems: [] });
  });
});

describe('content service helpers', () => {
  it('parses a build string and converts a base64 key to hex', () => {
    expect(parseFortniteBuild('++Fortnite+Release-42.30-CL-58813929-Windows')).toEqual({
      buildVersion: '++Fortnite+Release-42.30-CL-58813929-Windows',
      version: '42.30',
      major: 42,
      minor: 30,
      changelist: 58813929,
      branch: 'Release-42.30',
    });
    expect(() => parseFortniteBuild('nope')).toThrow(ValidationError);
    expect(contentKeyToHex('L3qVW696MQgRuupIRCC7EpApB8f5mQQraovXGmCcoHI=')).toBe(
      '0x2F7A955BAF7A310811BAEA484420BB12902907C7F999042B6A8BD71A609CA072',
    );
    expect(
      toIslandKey({ moduleId: 'm', version: 1, type: 'module', key: { Guid: 'g', Key: 'AAE=' } }),
    ).toEqual({ moduleId: 'm', version: 1, guid: 'g', keyBase64: 'AAE=', key: '0x0001' });
  });

  it('requests the v4 cooked package with the build and posts a key batch', async () => {
    const { mock, rest: client } = rest(
      { status: 200, body: { isEncrypted: true, resolved: { root: { moduleId: 'm', version: 3 } } } },
      { status: 200, body: [{ moduleId: 'm', version: 3, type: 'module', key: { Guid: 'g', Key: 'AAE=' } }] },
    );
    const service = new ContentServiceManager(client);
    await service.cookedPackage('VT', '7865-8305-9184', { major: 42, minor: 30, changelist: 58813929 });
    const packageRequest = mock.lastRequest();
    expect(packageRequest.path).toBe('/api/content/v4/cooked-content-package/link/7865-8305-9184');
    expect(Object.fromEntries(packageRequest.query)).toEqual({
      role: 'client',
      platform: 'windows',
      major: '42',
      minor: '30',
      patch: '58813929',
    });
    await service.moduleKeys('VT', [{ moduleId: 'm', version: 3 }]);
    expect(mock.lastRequest().path).toBe('/api/content/v4/module/key/batch');
    expect(JSON.parse(mock.lastRequest().body ?? '[]')).toEqual([{ moduleId: 'm', version: 3 }]);
    await expect(service.moduleKeys('VT', [])).rejects.toBeInstanceOf(ValidationError);
  });

  it('launches an island with a POST', async () => {
    const { mock, rest: client } = rest({ status: 200, body: { status: 'queued' } });
    expect(await new ContentServiceManager(client).launch('VT', '1865-4829-7018')).toEqual({ status: 'queued' });
    expect(mock.lastRequest().method).toBe('POST');
    expect(mock.lastRequest().path).toBe('/api/content/v2/launch/link/1865-4829-7018');
  });
});

describe('LauncherManager', () => {
  it('reads the Fortnite build and parses it', async () => {
    const { mock, rest: client } = rest({
      status: 200,
      body: { elements: [{ buildVersion: '++Fortnite+Release-42.30-CL-58813929-Windows' }] },
    });
    const launcher = new LauncherManager(client);
    const build = await launcher.fortniteBuild('LT');
    expect(build.changelist).toBe(58813929);
    expect(mock.lastRequest().path).toBe(
      '/launcher/api/public/assets/v2/platform/Windows/namespace/fn/catalogItem/4fe75bbc5a674f4f9b356b5c90567da5/app/Fortnite/label/Live',
    );
    await launcher.fortniteBuild('LT');
    expect(mock.calls).toBe(1);
  });

  it('lists platform assets and resolves an installer redirect', async () => {
    const { mock, rest: client } = rest(
      { status: 200, body: [{ appName: 'Fortnite' }] },
      {
        status: 303,
        body: '',
        headers: {
          location:
            'https://epicgames-download1.akamaized.net/Builds/UnrealEngineLauncher/Installers/Windows/EpicInstaller-20.3.3.msi?launcherfilename=EpicInstaller-20.3.3.msi',
        },
      },
    );
    const launcher = new LauncherManager(client);
    await launcher.assets('LT', { namespace: 'fn' });
    expect(mock.lastRequest().path).toBe('/launcher/api/public/assets/Windows');
    expect(mock.lastRequest().query.get('namespace')).toBe('fn');

    const installer = await launcher.installer(LauncherInstaller.LauncherWindows);
    expect(installer.fileName).toBe('EpicInstaller-20.3.3.msi');
    expect(installer.url).toContain('EpicInstaller-20.3.3.msi');
    expect(launcher.installerUrl('BuildPatchTool.zip')).toBe(
      'https://launcher-public-service-prod06.ol.epicgames.com/launcher/api/installer/download/BuildPatchTool.zip',
    );
  });
});

describe('LauncherManager platforms', () => {
  const androidBuild = {
    elements: [
      {
        appName: 'Fortnite',
        labelName: 'Live-Android',
        buildVersion: '++Fortnite+Release-42.30-CL-58813929-Shipping-Android',
        hash: 'h',
        useSignedUrl: false,
        metadata: { downloadSizeBytes: 261371211 },
        manifests: [
          {
            uri: 'https://egs-cloudfront-chunks.epicgamescdn.com/Builds/Fortnite/CloudDir/94CzVZrTufH_WCax-EWEKw07hvOV0Q.manifest',
            queryParams: [],
          },
        ],
      },
    ],
  };

  it('GETs a build without a device and POSTs one with it', async () => {
    const { mock, rest: client } = rest({ status: 200, body: { elements: [] } });
    const launcher = new LauncherManager(client);
    await launcher.build('LT');
    expect(mock.lastRequest().method).toBe('GET');
    await launcher.build('LT', { platform: 'Windows', device: { platform: 'Windows' } });
    expect(mock.lastRequest().method).toBe('POST');
    expect(JSON.parse(mock.lastRequest().body ?? '{}')).toEqual({ platform: 'Windows' });
  });

  it('POSTs the built-in Android profile for the Android platform', async () => {
    const { mock, rest: client } = rest({ status: 200, body: androidBuild });
    await new LauncherManager(client).build('LT', { platform: 'Android' });
    const request = mock.lastRequest();
    expect(request.method).toBe('POST');
    expect(request.path).toContain('/v2/platform/Android/');
    expect(JSON.parse(request.body ?? '{}')).toEqual(ANDROID_DEVICE_PROFILE);
  });

  it('derives the Fortnite APK from the Android manifest', async () => {
    const { rest: client } = rest({ status: 200, body: androidBuild });
    expect(await new LauncherManager(client).fortniteApk('LT')).toEqual({
      buildVersion: '++Fortnite+Release-42.30-CL-58813929-Shipping-Android',
      manifestId: '94CzVZrTufH_WCax-EWEKw07hvOV0Q',
      url: 'https://epicgames-download1.akamaized.net/Builds/Fortnite/Apk/94CzVZrTufH_WCax-EWEKw07hvOV0Q.apk',
      sizeBytes: 261371211,
    });
    expect(() => apkFromBuild({ ...androidBuild.elements[0]!, manifests: [] })).toThrow(ValidationError);
  });

  it('reads the v1 single-app asset with its label', async () => {
    const { mock, rest: client } = rest({
      status: 200,
      body: { appName: 'Fortnite', items: { MANIFEST: { path: 'Builds/Fortnite/CloudDir/x.manifest', hash: 'h' } } },
    });
    const asset = await new LauncherManager(client).asset('LT', { platform: 'Switch' });
    expect(asset.items['MANIFEST']?.hash).toBe('h');
    expect(mock.lastRequest().path).toBe('/launcher/api/public/assets/Switch/4fe75bbc5a674f4f9b356b5c90567da5/Fortnite');
    expect(mock.lastRequest().query.get('label')).toBe('Live');
  });

  it('names the store apk for what it is', () => {
    expect(LauncherInstaller.EpicGamesStoreAndroid).toBe('F924A9B4AE2D430992775190A895B65A.apk');
  });
});

describe('FortniteGameManager.version', () => {
  it('reads the unauthenticated version endpoint', async () => {
    const { mock, rest: client } = rest({ status: 200, body: { version: '42.30', cln: '58913721' } });
    const game = new FortniteGameManager(client, new MCPClient(client));
    expect((await game.version()).version).toBe('42.30');
    expect(mock.lastRequest().path).toBe('/fortnite/api/version');
    expect(mock.lastRequest().headers['authorization']).toBeUndefined();
  });
});

describe('EpicAuthSession island keys', () => {
  function makeToken(): OAuthToken {
    return {
      access_token: 'AT',
      refresh_token: 'RT',
      expires_in: 7200,
      expires_at: new Date(Date.now() + 7_200_000).toISOString(),
      account_id: 'ACC',
      displayName: 'Me',
      client_id: 'c',
      token_type: 'bearer',
      internal_client: true,
      client_service: 'fortnite',
    };
  }

  it('resolves the build, fetches the package with the valkyrie token and returns hex keys', async () => {
    const mock = createMockFetch(
      { status: 200, body: { isEncrypted: true, resolved: { root: { moduleId: 'm', version: 3 } } } },
      { status: 200, body: [{ moduleId: 'm', version: 3, type: 'module', key: { Guid: 'g', Key: 'AAE=' } }] },
    );
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });
    const session = epic.session(makeToken());
    Object.assign(session as object, {
      valkyrieToken: async () => 'VT',
      fortniteBuild: async () => parseFortniteBuild('++Fortnite+Release-42.30-CL-58813929-Windows'),
    });
    const keys = await session.islandKeys('7865-8305-9184');
    expect(keys).toEqual([{ moduleId: 'm', version: 3, guid: 'g', keyBase64: 'AAE=', key: '0x0001' }]);
    expect(mock.requests[0]?.headers['authorization']).toBe('Bearer VT');
    expect(mock.requests[0]?.query.get('patch')).toBe('58813929');
  });

  it('returns no keys for an unencrypted island', async () => {
    const mock = createMockFetch({ status: 200, body: { isEncrypted: false, resolved: { root: { moduleId: 'm', version: 1 } } } });
    const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });
    const session = epic.session(makeToken());
    Object.assign(session as object, { valkyrieToken: async () => 'VT' });
    expect(await session.islandKeys('1234-5678-9012', { build: { major: 42, minor: 30, changelist: 1 } })).toEqual([]);
    expect(mock.calls).toBe(1);
  });
});
