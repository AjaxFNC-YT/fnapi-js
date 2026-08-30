import { describe, expect, it } from 'vitest';
import { EpicGamesClient } from '../../src/epic/client.js';
import { Party, PartyMember, PARTY_BASE_URL, PARTY_BUILD_ID, ReadyState } from '../../src/epic/party.js';
import { ValidationError } from '../../src/core/errors.js';
import type { OAuthToken } from '../../src/epic/types.js';
import { createMockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

const token: OAuthToken = {
  access_token: 'AT',
  expires_in: 7200,
  expires_at: new Date(Date.now() + 7_200_000).toISOString(),
  token_type: 'bearer',
  account_id: 'ACC',
  displayName: 'Me',
  client_id: 'x',
  internal_client: true,
  client_service: 'prod-fn',
};

function partyBody() {
  return {
    current: [
      {
        id: 'party-1',
        revision: 3,
        config: { type: 'DEFAULT' },
        meta: { 'Default:PartyState_s': 'BattleRoyaleView' },
        members: [
          {
            account_id: 'ACC',
            revision: 5,
            role: 'CAPTAIN',
            meta: {
              'Default:MpLoadout1_j': JSON.stringify({
                MpLoadout1: {
                  s: {
                    ac: { i: 'CID_Old', v: [] },
                    ap: { i: 'DefaultPickaxe', v: [] },
                    ag: { i: 'DefaultGlider', v: [] },
                  },
                },
              }),
              'Default:MatchmakingInfo_j': JSON.stringify({ MatchmakingInfo: { readyStatus: 'NotReady' } }),
            },
          },
          { account_id: 'OTHER', revision: 2, role: 'MEMBER', meta: {} },
        ],
      },
    ],
  };
}

function clientWith(...responses: MockResponseInit[]): {
  epic: EpicGamesClient;
  mock: ReturnType<typeof createMockFetch>;
} {
  const mock = createMockFetch(...responses);
  const epic = new EpicGamesClient({ fetch: mock.fetch, retry: 1 });
  return { epic, mock };
}

describe('session.getParty', () => {
  it('fetches the current party from the party service', async () => {
    const { epic, mock } = clientWith({ body: partyBody() });
    const party = await epic.session(token).getParty();

    expect(party).toBeInstanceOf(Party);
    expect(party.id).toBe('party-1');
    expect(party.revision).toBe(3);
    expect(party.members).toHaveLength(2);
    expect(party.me?.accountId).toBe('ACC');
    expect(party.me?.isLeader).toBe(true);
    expect(party.leader?.accountId).toBe('ACC');

    const req = mock.lastRequest();
    expect(req.url.startsWith(PARTY_BASE_URL)).toBe(true);
    expect(req.path).toBe('/party/api/v1/Fortnite/user/ACC');
    expect(req.headers.authorization).toBe('Bearer AT');
  });

  it('throws when not in a party', async () => {
    const { epic } = clientWith({ body: { current: [] } });
    await expect(epic.session(token).getParty()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('fake cosmetics', () => {
  it('fakeReady patches MatchmakingInfo readyStatus on your own member', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeReady(true);

    const req = mock.lastRequest();
    expect(req.method).toBe('PATCH');
    expect(req.path).toBe('/party/api/v1/Fortnite/parties/party-1/members/ACC/meta');
    const body = JSON.parse(req.body!);
    expect(body.revision).toBe(5);
    const info = JSON.parse(body.update['Default:MatchmakingInfo_j']);
    expect(info.MatchmakingInfo.readyStatus).toBe(ReadyState.Ready);
  });

  it('fakeApplyCosmetics merges the MpLoadout1 slots and keeps existing ones', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeApplyCosmetics({
      outfit: 'AthenaCharacter:CID_028_Athena_Commando_F',
      backpack: 'BID_001_Test',
      pickaxe: '/BRCosmetics/custom/Pickaxe_X.Pickaxe_X',
      glider: 'Glider_ID_001',
    });

    const body = JSON.parse(mock.lastRequest().body!);
    const slots = JSON.parse(body.update['Default:MpLoadout1_j']).MpLoadout1.s;
    expect(slots.ac).toEqual({ i: 'CID_028_Athena_Commando_F', v: [] });
    expect(slots.ab).toEqual({ i: 'BID_001_Test', v: [] });
    expect(slots.ap).toEqual({ i: 'Pickaxe_X', v: [] });
    expect(slots.ag).toEqual({ i: 'Glider_ID_001', v: [] });
  });

  it('fakeInstruments sets the instrument slots', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeInstruments({ guitar: 'Sparks_Guitar_Cool', drums: 'Sparks_Drum_Cool' });

    const slots = JSON.parse(JSON.parse(mock.lastRequest().body!).update['Default:MpLoadout1_j']).MpLoadout1.s;
    expect(slots.sg).toEqual({ i: 'Sparks_Guitar_Cool', v: ['0'] });
    expect(slots.sd).toEqual({ i: 'Sparks_Drum_Cool', v: ['0'] });
  });

  it('fakeEmote patches FrontendEmote with a pickable path', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeEmote('EID_Floss');

    const emote = JSON.parse(JSON.parse(mock.lastRequest().body!).update['Default:FrontendEmote_j']).FrontendEmote;
    expect(emote.pickable).toBe('/BRCosmetics/Athena/Items/Cosmetics/Dances/EID_Floss.EID_Floss');
    expect(emote.emoteSection).toBe(-1);
  });

  it('fakeEmoji uses the emoji dances subfolder', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeEmoji('Emoji_Wow');

    const emote = JSON.parse(JSON.parse(mock.lastRequest().body!).update['Default:FrontendEmote_j']).FrontendEmote;
    expect(emote.pickable).toBe('/BRCosmetics/Athena/Items/Cosmetics/Dances/Emoji/Emoji_Wow.Emoji_Wow');
  });

  it('fakeJam sets both the FrontendEmote and FrontendSparksSongPart keys', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeJam('/Game/Festival/JamTracks/Track.Track');

    const update = JSON.parse(mock.lastRequest().body!).update;
    expect(JSON.parse(update['Default:FrontendEmote_j']).FrontendEmote.pickable).toBe(
      '/Game/Festival/JamTracks/Track.Track',
    );
    expect(JSON.parse(update['Default:FrontendSparksSongPart_j']).FrontendSparksSongPart.pickable).toBe(
      '/Game/Festival/JamTracks/Track.Track',
    );
  });

  it('fakeJamTrack writes the SparksSongPart placeholder asset to both keys', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeJamTrack('sid_placeholder_430', 'Bass');

    const update = JSON.parse(mock.lastRequest().body!).update;
    const expected =
      '/SparksSongTemplates/Items/SongParts/SparksSongPart_Placeholder_430_Bass.SparksSongPart_Placeholder_430_Bass';
    expect(JSON.parse(update['Default:FrontendEmote_j']).FrontendEmote.pickable).toBe(expected);
    expect(JSON.parse(update['Default:FrontendSparksSongPart_j']).FrontendSparksSongPart.pickable).toBe(expected);
  });

  it('fakeCrown writes the three crown stats into LoadoutMeta', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeCrown(7);

    const stats = JSON.parse(JSON.parse(mock.lastRequest().body!).update['Default:LoadoutMeta_j']).LoadoutMeta.stats;
    expect(stats).toContain('TotalVictoryCrowns:7');
    expect(stats).toContain('TotalRoyalRoyales:7');
    expect(stats).toContain('HasCrown:1');
  });

  it('fakeCrown with playEmote follows up with the Crowning Achievement emote', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeCrown(3, true);

    const patches = mock.requests.filter((r) => r.method === 'PATCH');
    expect(patches).toHaveLength(2);

    const crown = JSON.parse(patches[0]!.body!).update['Default:LoadoutMeta_j'];
    expect(JSON.parse(crown).LoadoutMeta.stats).toContain('TotalVictoryCrowns:3');

    const emote = JSON.parse(patches[1]!.body!).update['Default:FrontendEmote_j'];
    expect(JSON.parse(emote).FrontendEmote.pickable).toContain('EID_Coronet');
  });

  it('fakeCrown without playEmote sends only the crown patch', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeCrown(3);

    expect(mock.requests.filter((r) => r.method === 'PATCH')).toHaveLength(1);
  });

  it('fakeSidekick sets the mm slot and the AthenaCosmeticLoadout mimosaDef', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeSidekick('PetCarrier_Fabio');

    const update = JSON.parse(mock.lastRequest().body!).update;
    const slots = JSON.parse(update['Default:MpLoadout1_j']).MpLoadout1.s;
    expect(slots.mm).toEqual({ i: 'PetCarrier_Fabio', v: [] });
    const loadout = JSON.parse(update['Default:AthenaCosmeticLoadout_j']).AthenaCosmeticLoadout;
    expect(loadout.mimosaDef).toBe('CosmeticCompanion:PetCarrier_Fabio');
  });

  it('fakeSidekickAnim writes FrontendMimosa', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeSidekickAnim('Interact');

    const mimosa = JSON.parse(JSON.parse(mock.lastRequest().body!).update['Default:FrontendMimosa_j']).FrontendMimosa;
    expect(mimosa.frontendMimosaAnimType).toBe('Interact');
  });

  it('fakeBanner writes AthenaBannerInfo and both loadout slots', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeBanner('otherbanner', 'defaultcolor18');

    const update = JSON.parse(mock.lastRequest().body!).update;
    const info = JSON.parse(update['Default:AthenaBannerInfo_j']).AthenaBannerInfo;
    expect(info.bannerIconId).toBe('otherbanner');
    expect(info.bannerColorId).toBe('DefaultColor18');
    expect(JSON.parse(update['Default:MpLoadout1_j']).MpLoadout1.s.li).toEqual({ i: 'otherbanner', v: [] });
    expect(JSON.parse(update['Default:MpLoadout2_j']).MpLoadout2.s.lc).toEqual({ i: 'DefaultColor18', v: [] });
  });

  it('fakeLevel keeps the purchased flag and sets the pass level', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeLevel(215);

    const info = JSON.parse(JSON.parse(mock.lastRequest().body!).update['Default:BattlePassInfo_j']).BattlePassInfo;
    expect(info.passLevel).toBe(215);
    expect(info.bHasPurchasedPass).toBe(false);
  });

  it('fakeOutfit packs colors and sticker into the outfit variant array', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.fakeOutfit('CID_028_Athena_Commando_F', {
      colors: { primary: 5, secondary: 12 },
      sticker: 'Emoji_Wow',
    });

    const slots = JSON.parse(JSON.parse(mock.lastRequest().body!).update['Default:MpLoadout1_j']).MpLoadout1.s;
    expect(slots.ac.i).toBe('CID_028_Athena_Commando_F');
    expect(slots.ac.v[3]).toBe('5');
    expect(slots.ac.v[4]).toBe('12');
    expect(slots.ac.v[13]).toBe('AthenaEmoji:Emoji_Wow');
  });

  it('only lets you edit your own member', async () => {
    const { epic } = clientWith({ body: partyBody() });
    const party = await epic.session(token).getParty();
    const other = party.member('OTHER')!;

    await expect(other.fakeReady()).rejects.toBeInstanceOf(ValidationError);
    await expect(other.fakeApplyCosmetics({ outfit: 'CID_X' })).rejects.toBeInstanceOf(ValidationError);
    await expect(other.fakeCrown(1)).rejects.toBeInstanceOf(ValidationError);
    await expect(other.fakeSidekick('X')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('meta helpers', () => {
  it('updateMetaKey patches a single member meta key', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.me!.updateMetaKey('Default:Custom_s', 'value');

    const body = JSON.parse(mock.lastRequest().body!);
    expect(body.update['Default:Custom_s']).toBe('value');
  });

  it('getProp parses a stringified meta key', async () => {
    const { epic } = clientWith({ body: partyBody() });
    const party = await epic.session(token).getParty();
    const loadout = party.me!.getProp<{ MpLoadout1: { s: { ac: { i: string } } } }>('Default:MpLoadout1_j');
    expect(loadout?.MpLoadout1.s.ac.i).toBe('CID_Old');
  });

  it('party.patchMeta updates the party meta with the party revision', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.patchMeta({ 'Default:CustomMatchKey_s': 'abc' });

    const req = mock.lastRequest();
    expect(req.path).toBe('/party/api/v1/Fortnite/parties/party-1');
    const body = JSON.parse(req.body!);
    expect(body.revision).toBe(3);
    expect(body.meta.update['Default:CustomMatchKey_s']).toBe('abc');
  });

  it('retries once on a stale revision error using the server revision', async () => {
    const { epic, mock } = clientWith(
      { body: partyBody() },
      {
        status: 409,
        body: {
          errorCode: 'errors.com.epicgames.social.party.stale_revision',
          errorMessage: 'Provided revision [5] does not match the current one [7].',
          numericErrorCode: 51018,
        },
      },
      { status: 204 },
    );
    const party = await epic.session(token).getParty();

    await party.me!.fakeReady(false);

    expect(mock.calls).toBe(3);
    const retry = JSON.parse(mock.lastRequest().body!);
    expect(retry.revision).toBe(7);
    expect(party.me!.revision).toBe(8);
  });
});

describe('PartyClient endpoints', () => {
  it('promote / kick / invite hit the right paths', async () => {
    const { epic, mock } = clientWith({ status: 204 });

    await epic.party.promote('AT', 'party-1', 'MEMBER');
    expect(mock.lastRequest().path).toBe('/party/api/v1/Fortnite/parties/party-1/members/MEMBER/promote');

    await epic.party.kick('AT', 'party-1', 'MEMBER');
    expect(mock.lastRequest().method).toBe('DELETE');
    expect(mock.lastRequest().path).toBe('/party/api/v1/Fortnite/parties/party-1/members/MEMBER');

    await epic.party.invite('AT', 'party-1', 'FRIEND');
    expect(mock.lastRequest().path).toBe('/party/api/v1/Fortnite/parties/party-1/invites/FRIEND');
    expect(mock.lastRequest().query.get('sendPing')).toBe('true');
  });

  it('members resolve their self flag against the client account', async () => {
    const { epic } = clientWith({ body: partyBody() });
    const party = await epic.session(token).getParty();
    expect(party.me).toBeInstanceOf(PartyMember);
    expect(party.me!.isSelf).toBe(true);
    expect(party.member('OTHER')!.isSelf).toBe(false);
  });
});

function richMemberBody() {
  return {
    current: [
      {
        id: 'party-1',
        revision: 1,
        config: { type: 'DEFAULT' },
        meta: {},
        members: [
          {
            account_id: 'ACC',
            revision: 1,
            role: 'CAPTAIN',
            meta: {
              'Default:MpLoadout1_j': JSON.stringify({
                MpLoadout1: {
                  s: {
                    ac: { i: 'CID_Hero', v: [] },
                    ab: { i: 'BID_Pack', v: [] },
                    ap: { i: 'Pickaxe_ID_1', v: [] },
                    at: { i: 'Trails_ID_1', v: [] },
                    as: { i: 'Shoes_ID_1', v: [] },
                    ag: { i: 'Glider_ID_1', v: [] },
                    mm: { i: 'PetCarrier_Doggo', v: [] },
                    li: { i: 'BannerIcon', v: [] },
                    lc: { i: 'DefaultColor1', v: [] },
                    sg: { i: 'Guitar_ID_1', v: [] },
                  },
                },
              }),
              'Default:MatchmakingInfo_j': JSON.stringify({ MatchmakingInfo: { readyStatus: 'Ready' } }),
              'Default:FrontendEmote_j': JSON.stringify({
                FrontendEmote: { pickable: '/Game/Athena/Items/Cosmetics/Dances/EID_Coronet.EID_Coronet' },
              }),
              'Default:FrontendSparksSongPart_j': JSON.stringify({
                FrontendSparksSongPart: { pickable: '/Game/Sparks/Songs/SID_Placeholder_430.SID_Placeholder_430' },
              }),
              'Default:PackedState_j': JSON.stringify({ PackedState: { location: 'InGame' } }),
              'Default:LobbyState_j': JSON.stringify({ LobbyState: { currentInputType: 'MouseAndKeyboard' } }),
              'Default:NumAthenaPlayersLeft_U': '42',
              'Default:UtcTimeStartedMatchAthena_s': '2026-08-20T12:00:00.000Z',
              'Default:BattlePassInfo_j': JSON.stringify({
                BattlePassInfo: { bHasPurchasedPass: true, passLevel: 87 },
              }),
              'Default:PlatformData_j': JSON.stringify({
                PlatformData: { platform: { platformDescription: { name: 'WIN' } } },
              }),
              'Default:LoadoutMeta_j': JSON.stringify({
                LoadoutMeta: { stats: ['TotalVictoryCrowns:5', 'HasCrown:1'] },
              }),
            },
          },
        ],
      },
    ],
  };
}

describe('party lifecycle transport', () => {
  const identity = { accountId: 'ACC', connectionId: 'jid-1', displayName: 'Me' };

  it('create posts the default config, join_info and meta', async () => {
    const { epic, mock } = clientWith({ body: { id: 'party-new', revision: 0, config: {}, meta: {}, members: [] } });

    const raw = await epic.party.create('AT', identity);

    expect(raw.id).toBe('party-new');
    const req = mock.lastRequest();
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/party/api/v1/Fortnite/parties');
    const body = JSON.parse(req.body!);
    expect(body.config).toMatchObject({ discoverability: 'ALL', joinability: 'OPEN', max_size: 16 });
    expect(body.join_info.connection.id).toBe('jid-1');
    expect(body.join_info.meta['urn:epic:member:dn_s']).toBe('Me');
    expect(body.meta['urn:epic:cfg:build-id_s']).toBe(PARTY_BUILD_ID);
  });

  it('joinById posts the join payload to the member join endpoint', async () => {
    const { epic, mock } = clientWith({ status: 204 });

    await epic.party.joinById('AT', 'party-1', identity);

    const req = mock.lastRequest();
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/party/api/v1/Fortnite/parties/party-1/members/ACC/join');
    const body = JSON.parse(req.body!);
    expect(body.connection.id).toBe('jid-1');
    const requestUsers = JSON.parse(body.meta['urn:epic:member:joinrequestusers_j']);
    expect(requestUsers.users[0].id).toBe('ACC');
  });

  it('confirmMember / rejectMember / declineInvite hit their endpoints', async () => {
    const { epic, mock } = clientWith({ status: 204 }, { status: 204 }, { status: 204 });

    await epic.party.confirmMember('AT', 'party-1', 'R');
    expect(mock.lastRequest().path).toBe('/party/api/v1/Fortnite/parties/party-1/members/R/confirm');

    await epic.party.rejectMember('AT', 'party-1', 'R');
    expect(mock.lastRequest().path).toBe('/party/api/v1/Fortnite/parties/party-1/members/R/reject');

    await epic.party.declineInvite('AT', 'party-1', 'ACC');
    expect(mock.lastRequest().path).toBe('/party/api/v1/Fortnite/parties/party-1/invites/ACC/decline');
  });

  it('leave deletes the member and sendIntention posts a request-to-join', async () => {
    const { epic, mock } = clientWith({ status: 204 }, { status: 204 });

    await epic.party.leave('AT', 'party-1', 'ACC');
    expect(mock.lastRequest().method).toBe('DELETE');
    expect(mock.lastRequest().path).toBe('/party/api/v1/Fortnite/parties/party-1/members/ACC');

    await epic.party.sendIntention('AT', 'FRIEND', 'ACC', 'GUID');
    const req = mock.lastRequest();
    expect(req.path).toBe('/party/api/v1/Fortnite/members/FRIEND/intentions/ACC');
    expect(JSON.parse(req.body!)['urn:epic:invite:platformdata_s']).toBe('RequestToJoin,guid=GUID');
  });
});

describe('party privacy', () => {
  it('setPrivacy patches the privacy meta and config as leader', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.setPrivacy('private');

    const req = mock.lastRequest();
    expect(req.method).toBe('PATCH');
    expect(req.path).toBe('/party/api/v1/Fortnite/parties/party-1');
    const body = JSON.parse(req.body!);
    expect(body.config.discoverability).toBe('INVITED_ONLY');
    expect(body.config.joinability).toBe('INVITE_AND_FORMER');
    const privacy = JSON.parse(body.meta.update['Default:PrivacySettings_j']).PrivacySettings;
    expect(privacy.partyType).toBe('Private');
    expect(privacy.partyInviteRestriction).toBe('LeaderOnly');
    expect(body.meta.update['urn:epic:cfg:presence-perm_s']).toBe('Noone');
    expect(body.meta.delete).toContain('urn:epic:cfg:not-accepting-members');
    expect(party.config.discoverability).toBe('INVITED_ONLY');
  });

  it('setPrivacy to public restores open discoverability', async () => {
    const { epic, mock } = clientWith({ body: partyBody() }, { status: 204 });
    const party = await epic.session(token).getParty();

    await party.setPrivacy('public');

    const body = JSON.parse(mock.lastRequest().body!);
    expect(body.config.discoverability).toBe('ALL');
    expect(body.config.joinability).toBe('OPEN');
    const privacy = JSON.parse(body.meta.update['Default:PrivacySettings_j']).PrivacySettings;
    expect(privacy.partyType).toBe('Public');
    expect(body.meta.delete).toContain('urn:epic:cfg:not-accepting-members-reason_i');
  });

  it('non-leaders cannot change privacy', async () => {
    const solo = {
      current: [
        {
          id: 'party-1',
          revision: 1,
          config: {},
          meta: {},
          members: [{ account_id: 'ACC', revision: 1, role: 'MEMBER', meta: {} }],
        },
      ],
    };
    const { epic } = clientWith({ body: solo });
    const party = await epic.session(token).getParty();

    await expect(party.setPrivacy('private')).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('PartyMember getters', () => {
  it('reads cosmetics, emote, jam track and state from meta', async () => {
    const { epic } = clientWith({ body: richMemberBody() });
    const me = (await epic.session(token).getParty()).me!;

    expect(me.outfit).toBe('CID_Hero');
    expect(me.backpack).toBe('BID_Pack');
    expect(me.pickaxe).toBe('Pickaxe_ID_1');
    expect(me.contrail).toBe('Trails_ID_1');
    expect(me.shoes).toBe('Shoes_ID_1');
    expect(me.glider).toBe('Glider_ID_1');
    expect(me.sidekick).toBe('PetCarrier_Doggo');
    expect(me.instruments.guitar).toBe('Guitar_ID_1');
    expect(me.banner).toEqual({ bannerIconId: 'BannerIcon', bannerColorId: 'DefaultColor1' });

    expect(me.emote).toBe('EID_Coronet');
    expect(me.isEmoting).toBe(true);
    expect(me.jamTrack).toBe('SID_Placeholder_430');
    expect(me.isJamming).toBe(true);

    expect(me.readyState).toBe('Ready');
    expect(me.isReady).toBe(true);
    expect(me.isSittingOut).toBe(false);
    expect(me.inMatch).toBe(true);
    expect(me.matchInfo.playerCount).toBe(42);
    expect(me.matchInfo.startedAt).toEqual(new Date('2026-08-20T12:00:00.000Z'));

    expect(me.battlePass).toEqual({ purchased: true, level: 87 });
    expect(me.level).toBe(87);
    expect(me.platform).toBe('WIN');
    expect(me.inputMethod).toBe('MouseAndKeyboard');
    expect(me.crowns).toBe(5);
    expect(me.hasCrown).toBe(true);
  });

  it('returns sensible defaults when meta is empty', async () => {
    const { epic } = clientWith({ body: partyBody() });
    const other = (await epic.session(token).getParty()).member('OTHER')!;

    expect(other.outfit).toBeUndefined();
    expect(other.emote).toBeUndefined();
    expect(other.isEmoting).toBe(false);
    expect(other.jamTrack).toBeUndefined();
    expect(other.isJamming).toBe(false);
    expect(other.banner).toBeUndefined();
    expect(other.readyState).toBe('NotReady');
    expect(other.isReady).toBe(false);
    expect(other.inMatch).toBe(false);
    expect(other.matchInfo.playerCount).toBe(0);
    expect(other.matchInfo.startedAt).toBeNull();
    expect(other.battlePass).toBeUndefined();
    expect(other.level).toBe(0);
    expect(other.crowns).toBe(0);
    expect(other.hasCrown).toBe(false);
  });
});
