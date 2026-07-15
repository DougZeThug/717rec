export type { ParticipationStatus } from './seasons/SeasonParticipationService';

import { SeasonLifecycleService } from './seasons/SeasonLifecycleService';
import { SeasonParticipationService } from './seasons/SeasonParticipationService';
import { SeasonQueryService } from './seasons/SeasonQueryService';
import { SeasonStatsService } from './seasons/SeasonStatsService';

export const SeasonService = {
  ...SeasonQueryService,
  ...SeasonParticipationService,
  ...SeasonStatsService,
  ...SeasonLifecycleService,
};
