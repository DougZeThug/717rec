import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/hooks/useToast';
import { DivisionInput, DivisionService } from '@/services/DivisionService';
import { clearDivisionWeightsCache } from '@/utils/rankingUtils/divisionWeightsCache';
import { getUIErrorMessage } from '@/utils/errorHandler';

const invalidate = (qc: ReturnType<typeof useQueryClient>) => {
  clearDivisionWeightsCache();
  qc.invalidateQueries({ queryKey: ['divisions'] });
};

export function useDivisionMutations() {
  const qc = useQueryClient();

  const createDivision = useMutation({
    mutationFn: (input: DivisionInput) => DivisionService.createDivision(input),
    onSuccess: () => {
      invalidate(qc);
      toast({ title: 'Division created' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create division',
        description: getUIErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const updateDivision = useMutation({
    mutationFn: (args: { id: string; patch: Partial<DivisionInput> }) =>
      DivisionService.updateDivision(args.id, args.patch),
    onSuccess: () => {
      invalidate(qc);
      toast({ title: 'Division updated' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update division',
        description: getUIErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  const deleteDivision = useMutation({
    mutationFn: (id: string) => DivisionService.deleteDivision(id),
    onSuccess: () => {
      invalidate(qc);
      toast({ title: 'Division deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete division',
        description: getUIErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  return { createDivision, updateDivision, deleteDivision };
}