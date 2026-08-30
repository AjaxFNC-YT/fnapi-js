export const DillyVersionState = {
  Ready: 'READY',
  Pending: 'PENDING',
  Failed: 'FAILED',
} as const;

export type DillyVersionState = (typeof DillyVersionState)[keyof typeof DillyVersionState];

export const DILLY_VERSION_STATES = Object.values(DillyVersionState) as DillyVersionState[];

export function isDillyVersionState(value: unknown): value is DillyVersionState {
  return typeof value === 'string' && (DILLY_VERSION_STATES as string[]).includes(value);
}

export const DillyVersionTag = {
  Latest: 'latest',
  Stable: 'stable',
} as const;

export type DillyVersionTag = (typeof DillyVersionTag)[keyof typeof DillyVersionTag];

export const DILLY_VERSION_TAGS = Object.values(DillyVersionTag) as DillyVersionTag[];

export function isDillyVersionTag(value: unknown): value is DillyVersionTag {
  return typeof value === 'string' && (DILLY_VERSION_TAGS as string[]).includes(value);
}
