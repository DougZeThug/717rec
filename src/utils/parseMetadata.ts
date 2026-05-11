import { errorLog } from '@/utils/logger';
import { ValidationError } from '@/types/errors';
import {
  EventWeekWinners,
  HeroCardMetadata,
  HeroCardMetadataByType,
  HeroCardType,
  ChampionsHeroCardMetadata,
  EventHeroCardMetadata,
} from '@/types/heroCard';

/**
 * Safely parse a JSON metadata string, returning an empty object on failure.
 */
export const parseMetadata = (metadataStr: string): Record<string, unknown> => {
  try {
    return JSON.parse(metadataStr);
  } catch (e) {
    errorLog('Failed to parse metadata JSON:', e);
    return {};
  }
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEventWeekWinners = (value: unknown): value is EventWeekWinners =>
  isObject(value) &&
  typeof value.week === 'number' &&
  Array.isArray(value.winners) &&
  value.winners.every(
    (winner) =>
      isObject(winner) && typeof winner.place === 'number' && typeof winner.names === 'string'
  );

const parseChampionsMetadata = (input: Record<string, unknown>): ChampionsHeroCardMetadata => {
  if (
    input.champions !== undefined &&
    (!isObject(input.champions) ||
      Object.values(input.champions).some((value) => typeof value !== 'string'))
  ) {
    throw new ValidationError('Invalid hero card metadata: champions must be a map of strings');
  }

  return input as ChampionsHeroCardMetadata;
};

const parseEventMetadata = (input: Record<string, unknown>): EventHeroCardMetadata => {
  if (input.is_active_event !== undefined && typeof input.is_active_event !== 'boolean') {
    throw new ValidationError('Invalid hero card metadata: is_active_event must be a boolean');
  }
  if (input.check_in_time !== undefined && typeof input.check_in_time !== 'string') {
    throw new ValidationError('Invalid hero card metadata: check_in_time must be a string');
  }
  if (input.start_time !== undefined && typeof input.start_time !== 'string') {
    throw new ValidationError('Invalid hero card metadata: start_time must be a string');
  }
  if (input.buy_in !== undefined && typeof input.buy_in !== 'string') {
    throw new ValidationError('Invalid hero card metadata: buy_in must be a string');
  }
  if (input.payouts !== undefined && typeof input.payouts !== 'string') {
    throw new ValidationError('Invalid hero card metadata: payouts must be a string');
  }
  if (
    input.past_winners !== undefined &&
    (!Array.isArray(input.past_winners) || input.past_winners.some((week) => !isEventWeekWinners(week)))
  ) {
    throw new ValidationError(
      'Invalid hero card metadata: past_winners must be a list of week winner entries'
    );
  }

  return input as EventHeroCardMetadata;
};

export function parseHeroCardMetadata<T extends HeroCardType>(
  input: unknown,
  cardType: T,
): HeroCardMetadataByType[T];
export function parseHeroCardMetadata(input: unknown, cardType: HeroCardType): HeroCardMetadata;
export function parseHeroCardMetadata(input: unknown, cardType: HeroCardType): HeroCardMetadata {
  if (!isObject(input)) {
    throw new ValidationError('Invalid hero card metadata: expected an object');
  }

  switch (cardType) {
    case 'champions':
      return parseChampionsMetadata(input);
    case 'event':
      return parseEventMetadata(input);
    default:
      return input;
  }
}
