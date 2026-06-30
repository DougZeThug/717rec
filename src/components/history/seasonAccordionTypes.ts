import { SeasonData } from './useSeasonAccordionViewModel';

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

export interface Highlights {
  mostWins: SeasonData;
  highestPS: SeasonData;
  mostGameWins: SeasonData;
}
