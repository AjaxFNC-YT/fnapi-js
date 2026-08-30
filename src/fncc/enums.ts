export const FnccParserState = {
  Loading: 'loading',
  Ready: 'ready',
  Error: 'error',
} as const;

export type FnccParserState = (typeof FnccParserState)[keyof typeof FnccParserState];

export const FNCC_PARSER_STATES = Object.values(FnccParserState) as FnccParserState[];

export function isFnccParserState(value: unknown): value is FnccParserState {
  return typeof value === 'string' && (FNCC_PARSER_STATES as string[]).includes(value);
}

export const FnccUpdateStatus = {
  UpToDate: 'up-to-date',
  Updating: 'updating',
  Behind: 'behind',
} as const;

export type FnccUpdateStatus = (typeof FnccUpdateStatus)[keyof typeof FnccUpdateStatus];

export const FNCC_UPDATE_STATUSES = Object.values(FnccUpdateStatus) as FnccUpdateStatus[];

export function isFnccUpdateStatus(value: unknown): value is FnccUpdateStatus {
  return typeof value === 'string' && (FNCC_UPDATE_STATUSES as string[]).includes(value);
}
