import { describe, expect, it } from 'vitest';
import { ValidationError } from '../../src/core/errors.js';
import { EpicApiError } from '../../src/epic/errors.js';
import {
  EVENTS_BASE_URL,
  EventsManager,
  toTournaments,
  windowEligible,
  windowStatus,
  type EventWindow,
  type EventsData,
} from '../../src/epic/events.js';
import { EpicRestClient } from '../../src/epic/rest.js';
import { createMockFetch, type MockResponseInit } from '../helpers/mockFetch.js';

function manager(...responses: MockResponseInit[]) {
  const mock = createMockFetch(...responses);
  return { mock, events: new EventsManager(new EpicRestClient({ fetch: mock.fetch, retry: 1, baseUrl: EVENTS_BASE_URL })) };
}

function window(id: string, begin: string, end: string, extra: Partial<EventWindow> = {}): EventWindow {
  return {
    eventWindowId: id,
    eventTemplateId: 'T1',
    countdownBeginTime: begin,
    beginTime: begin,
    endTime: end,
    round: 1,
    payoutDelay: 30,
    isTBD: false,
    visibility: 'public',
    additionalRequirements: ['mfa'],
    teammateEligibility: 'all',
    blackoutPeriods: [],
    scoreLocations: [{ leaderboardDefId: 'LB', isMainWindowLeaderboard: true }],
    canLiveSpectate: false,
    requireAllTokens: [],
    requireAnyTokens: [],
    requireNoneTokensCaller: [],
    requireAllTokensCaller: [],
    requireAnyTokensCaller: [],
    regionMappings: {},
    metadata: {},
    ...extra,
  };
}

function event(eventId: string, displayDataId: string, windows: EventWindow[]) {
  return {
    gameId: 'Fortnite',
    eventId,
    beginTime: windows[0]!.beginTime,
    endTime: windows.at(-1)!.endTime,
    displayDataId,
    eventGroup: 'Group',
    announcementTime: '2026-01-01T00:00:00Z',
    regions: ['EU'],
    regionMappings: {},
    platforms: ['Windows'],
    platformMappings: {},
    metadata: { tournamentType: 'CashCup', minimumAccountLevel: 50 },
    eventWindows: windows,
    link: { type: 'br:tournament', code: `tournament_${eventId}` },
  };
}

const NOW = Date.parse('2026-10-10T12:00:00Z');

const data: EventsData = {
  player: null,
  events: [
    event('ended_cup', 'old_cup', [window('Old_W1', '2026-10-01T10:00:00Z', '2026-10-01T13:00:00Z')]),
    event('later_cup', 'later', [window('Later_W1', '2026-10-12T10:00:00Z', '2026-10-12T13:00:00Z')]),
    event('ranked_cup', 'ranked', [
      window('Ranked_W2', '2026-10-11T10:00:00Z', '2026-10-11T13:00:00Z', { round: 2 }),
      window('Ranked_W1', '2026-10-10T11:00:00Z', '2026-10-10T14:00:00Z', {
        requireNoneTokensCaller: ['Banned'],
        requireAnyTokens: ['Division1', 'Division2'],
      }),
    ]),
  ],
  templates: [
    {
      gameId: 'Fortnite',
      eventTemplateId: 'T1',
      playlistId: 'Playlist_Showdown',
      matchCap: 10,
      tiebreakerFormula: { basePointsBits: 11, components: [] },
      scoringRules: [{ trackedStat: 'TEMPLATE', matchRule: 'gte', rewardTiers: [] }],
      payoutTable: [],
      liveSessionAttributes: [],
      clampsToZero: false,
    },
  ],
  leaderboardDefs: [],
  scoringRuleSets: {
    Rules_Main: [{ trackedStat: 'PLACEMENT_STAT_INDEX', matchRule: 'lte', rewardTiers: [{ keyValue: 1, pointsEarned: 25, multiplicative: false }] }],
    Rules_Elite: [{ trackedStat: 'ELITE', matchRule: 'gte', rewardTiers: [] }],
  },
  payoutTables: {
    Pay_Main: [{ scoringType: 'rank', ranks: [{ threshold: 100, payouts: [{ rewardType: 'ecomm', rewardMode: 'standard', value: 'USD', quantity: 50 }] }] }],
  },
  scoreLocationScoringRuleSets: {
    'Fortnite:ranked_cup:Ranked_W1': 'Rules_Main',
    'Fortnite:ranked_cup:Ranked_W1_1_Elite': 'Rules_Elite',
  },
  scoreLocationPayoutTables: { 'Fortnite:ranked_cup:Ranked_W1': 'Pay_Main' },
  resolvedWindowLocations: {
    'Fortnite:ranked_cup:Ranked_W1': ['Fortnite:ranked_cup:Ranked_W1', 'Fortnite:ranked_cup:Ranked_W1_1_Elite'],
  },
  eventSeries: [],
};

const display = [
  {
    tournament_display_id: 'RANKED',
    long_format_title: 'Ranked Cup',
    title_line_2: 'Solo',
    details_description: 'Climb.',
    poster_front_image: 'https://img/front.png',
    primary_color: 'FF0000',
  },
];

describe('EventsManager', () => {
  it('reads event data with region and past-event flags', async () => {
    const { mock, events } = manager({ body: data });
    await events.data('T', 'ACC', { region: 'EU', showPastEvents: true });
    const request = mock.lastRequest();
    expect(request.path).toBe('/api/v1/events/Fortnite/data/ACC');
    expect(request.headers['authorization']).toBe('Bearer T');
    expect(request.query.get('region')).toBe('EU');
    expect(request.query.get('showPastEvents')).toBe('true');
  });

  it('downloads with the team defaulting to the caller', async () => {
    const { mock, events } = manager({ body: data });
    await events.download('T', 'ACC', { region: 'EU', platform: 'Windows' });
    expect(mock.lastRequest().query.get('teamAccountIds')).toBe('ACC');
    expect(() => events.download('T', 'ACC', { region: '', platform: 'Windows' })).toThrow(ValidationError);
  });

  it('reads player info, tokens and history paths', async () => {
    const { mock, events } = manager({ body: {} }, { body: { accounts: [] } }, { body: [] }, { body: [] });
    await events.player('T', 'ACC');
    expect(mock.requests[0]?.path).toBe('/api/v1/players/Fortnite/ACC');
    await events.tokens('T', ['A', 'B']);
    expect(mock.requests[1]?.query.get('teamAccountIds')).toBe('A,B');
    await events.history('T', 'cup', 'ACC');
    expect(mock.requests[2]?.path).toBe('/api/v1/events/Fortnite/cup/history/ACC');
    await events.history('T', 'cup', 'ACC', { eventWindowId: 'W1', teamAccountIds: ['ACC', 'B'] });
    expect(mock.requests[3]?.path).toBe('/api/v1/events/Fortnite/cup/W1/history/ACC');
    expect(mock.requests[3]?.query.get('teamAccountIds')).toBe('ACC,B');
    expect(() => events.tokens('T', [])).toThrow(ValidationError);
  });

  it('pages the window leaderboard and bounds the page', async () => {
    const { mock, events } = manager({ body: { entries: [], page: 4, totalPages: 100 } });
    await events.leaderboard('T', 'cup', 'W1', 'ACC', { page: 4 });
    const request = mock.lastRequest();
    expect(request.path).toBe('/api/v1/leaderboards/Fortnite/cup/W1/ACC');
    expect(request.query.get('page')).toBe('4');
    expect(request.query.get('appId')).toBe('Fortnite');
    expect(() => events.leaderboard('T', 'cup', 'W1', 'ACC', { page: 100 })).toThrow(ValidationError);
  });

  it('posts score lookups and treats no_score_found as empty', async () => {
    const { mock, events } = manager(
      { body: [{ rank: 3, teamAccountIds: ['A'] }] },
      { status: 404, body: { errorCode: 'com.epicgames.events.no_score_found', errorMessage: 'none' } },
      { status: 403, body: { errorCode: 'errors.com.epicgames.common.missing_permission', errorMessage: 'no' } },
    );
    const rows = await events.scores('T', 'cup', 'W1', 'ACC', { teams: [['A', 'B']], aroundTeamIds: [['A', 'B']] });
    expect(rows[0]?.rank).toBe(3);
    const request = mock.requests[0]!;
    expect(request.method).toBe('POST');
    expect(request.path).toBe('/api/v2/games/Fortnite/leaderboards/cup/W1/scores');
    expect(request.query.get('aroundTeamId')).toBe('A:B');
    expect(JSON.parse(request.body!)).toEqual({ teams: [['A', 'B']] });

    expect(await events.scores('T', 'cup', 'W1', 'ACC', { teams: [['A']], fromIndex: 0 })).toEqual([]);
    await expect(events.scores('T', 'cup', 'W1', 'ACC', { teams: [['A']], fromIndex: 0 })).rejects.toBeInstanceOf(EpicApiError);
    await expect(events.scores('T', 'cup', 'W1', 'ACC', { teams: [['A']] })).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('tournament shaping', () => {
  it('works out window status and token eligibility', () => {
    const w = window('W', '2026-10-10T11:00:00Z', '2026-10-10T14:00:00Z', {
      requireAllTokens: ['Region_EU'],
      requireAnyTokens: ['Div1', 'Div2'],
      requireNoneTokensCaller: ['Banned'],
    });
    expect(windowStatus(w, NOW)).toBe('live');
    expect(windowStatus(w, Date.parse('2026-10-10T10:00:00Z'))).toBe('upcoming');
    expect(windowStatus(w, Date.parse('2026-10-10T14:00:00Z'))).toBe('ended');
    expect(windowEligible(w, ['region_eu', 'Div2'])).toBe(true);
    expect(windowEligible(w, ['Region_EU'])).toBe(false);
    expect(windowEligible(w, ['Region_EU', 'Div1', 'Banned'])).toBe(false);
  });

  it('joins display data and sorts live, then upcoming, then ended', () => {
    const tournaments = toTournaments(data, display, { now: NOW, tokens: ['Division2'] });
    expect(tournaments.map((entry) => entry.eventId)).toEqual(['ranked_cup', 'later_cup', 'ended_cup']);

    const ranked = tournaments[0]!;
    expect(ranked).toMatchObject({
      name: 'Ranked Cup',
      subtitle: 'Solo',
      description: 'Climb.',
      type: 'CashCup',
      status: 'live',
      minimumAccountLevel: 50,
      linkCode: 'tournament_ranked_cup',
      images: { poster: 'https://img/front.png' },
      colors: { primary: '#FF0000' },
    });
    expect(ranked.windows.map((entry) => entry.id)).toEqual(['Ranked_W1', 'Ranked_W2']);
    expect(ranked.nextWindow?.id).toBe('Ranked_W1');
    expect(tournaments[1]?.name).toBe('later_cup');
    expect(tournaments[2]?.status).toBe('ended');
    expect(tournaments[2]?.nextWindow).toBeNull();
  });

  it('resolves playlist, scoring, payouts, brackets and eligibility per window', () => {
    const [ranked] = toTournaments(data, display, { now: NOW, tokens: ['Division2'] });
    const first = ranked!.windows[0]!;
    expect(first.playlistId).toBe('Playlist_Showdown');
    expect(first.matchCap).toBe(10);
    expect(first.requirements).toEqual(['mfa']);
    expect(first.eligible).toBe(true);
    expect(first.scoring[0]?.trackedStat).toBe('PLACEMENT_STAT_INDEX');
    expect(first.payouts[0]?.ranks[0]?.payouts[0]?.quantity).toBe(50);
    expect(first.brackets).toEqual([{ id: 'Ranked_W1_1_Elite', scoring: [{ trackedStat: 'ELITE', matchRule: 'gte', rewardTiers: [] }], payouts: [] }]);

    const second = ranked!.windows[1]!;
    expect(second.scoring[0]?.trackedStat).toBe('TEMPLATE');
    expect(second.payouts).toEqual([]);
    expect(second.eligible).toBe(true);

    const noTokens = toTournaments(data, [], { now: NOW });
    expect(noTokens[0]?.windows[0]?.eligible).toBeNull();
    expect(noTokens.find((entry) => entry.eventId === 'ranked_cup')?.name).toBe('ranked_cup');
  });
});
