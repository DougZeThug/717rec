
import { BracketFormat, BracketState, BRACKET_FORMATS } from '@/constants/brackets';
import { PlayoffBracket } from '@/types/playoffs';
import { BracketDto } from '@/types/supabase.generated';
import { MatchMapper } from './MatchMapper';

/**
 * Maps a database bracket DTO to a domain bracket model
 */
export const bracketDtoToDomain = (bracketDto: BracketDto, matchesDto: any[] = []): PlayoffBracket => {
  // Determine bracket format, defaulting to double elimination
  const format = (Object.values(BRACKET_FORMATS).includes(bracketDto.format as any)
    ? bracketDto.format
    : BRACKET_FORMATS.DOUBLE) as BracketFormat;

  // Map state, defaulting to pending
  const state = bracketDto.state as BracketState || 'pending';

  return {
    id: bracketDto.id,
    name: bracketDto.title,
    format,
    state,
    division: bracketDto.division_id,
    matches: matchesDto.map(MatchMapper.matchDtoToDomain),
    created_at: bracketDto.created_at
  };
};

export const BracketMapper = {
  bracketDtoToDomain,
};
