import { useMutation } from '@tanstack/react-query';

import { bracketManagerService, type UpdateSeedingOptions } from '@/services/brackets/manager';

/**
 * Save a new seeding for a bracket that has not started.
 *
 * The hook owns no toast and no refresh: the dialog shows the toast and then
 * refreshes the bracket lists, in that order. The arrow wrapper is needed.
 * `updateSeeding` is a class method that reads `this`, so a bare reference
 * would lose `this` and fail.
 */
export const useUpdateSeeding = () =>
  useMutation({
    mutationFn: (options: UpdateSeedingOptions) => bracketManagerService.updateSeeding(options),
  });
