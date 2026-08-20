import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePowerWeightPreview } from '@/hooks/admin/usePowerWeightSandbox';
import { isValidWeights, PowerScoreWeights, weightsEqual } from '@/utils/powerScore/weights';

import CareerPreviewTable from './CareerPreviewTable';
import { formatTriple } from './previewFormat';
import SeasonPreviewTable from './SeasonPreviewTable';

interface SandboxPreviewTabsProps {
  baseline: PowerScoreWeights;
  candidate: PowerScoreWeights;
  previewQuery: ReturnType<typeof usePowerWeightPreview>;
}

/**
 * The two live previews: current-season standings by division, and the full
 * career standings. Both compare today's weights ("now") against the
 * candidate triple ("preview") without writing anything.
 */
const SandboxPreviewTabs: React.FC<SandboxPreviewTabsProps> = ({
  baseline,
  candidate,
  previewQuery,
}) => {
  const unchanged = weightsEqual(baseline, candidate);

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-base font-semibold">Preview</h3>
        <p className="text-sm text-muted-foreground">
          &quot;Score now&quot; uses the live weights ({formatTriple(baseline)}); &quot;Score
          preview&quot; uses yours ({formatTriple(candidate)}).
          {unchanged && ' They match right now — change a weight above to see movement.'}
          {previewQuery.isFetching && !previewQuery.isLoading && ' Recalculating…'}
        </p>
      </div>

      {!isValidWeights(candidate) && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          The preview keeps showing the last valid weights until the three numbers add up to 100
          again.
        </p>
      )}

      {previewQuery.isLoading && <LoadingState variant="section" message="Building preview..." />}
      {previewQuery.isError && !previewQuery.isLoading && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-sm text-red-500">Couldn&apos;t build the preview.</p>
            <Button size="sm" variant="outline" onClick={() => previewQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {previewQuery.data && (
        <Tabs defaultValue="season">
          <TabsList>
            <TabsTrigger value="season">Current season</TabsTrigger>
            <TabsTrigger value="career">Career</TabsTrigger>
          </TabsList>
          <TabsContent value="season">
            <SeasonPreviewTable divisions={previewQuery.data.season} />
          </TabsContent>
          <TabsContent value="career">
            <CareerPreviewTable rows={previewQuery.data.career} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SandboxPreviewTabs;
