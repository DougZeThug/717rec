import { Newspaper } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import AdminSectionWrapper from '@/components/admin/AdminSectionWrapper';
import { Card, CardContent } from '@/components/ui/card';
import { useSeasons } from '@/hooks/useSeasons';
import { useToast } from '@/hooks/useToast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

import type { LogoResolver } from './export/inlineImages';
import { buildLogoResolver } from './export/inlineImages';
import { useGraphicExport } from './export/useGraphicExport';
import PackEditorCard from './PackEditorCard';
import PackExportSurface from './PackExportSurface';
import PackPreview from './PackPreview';
import PackWarnings from './PackWarnings';
import PublishCard from './PublishCard';
import { useGraphicNodes } from './useGraphicNodes';
import { useWeeklyContentPack } from './useWeeklyContentPack';
import WeekPickerCard from './WeekPickerCard';

const identityResolver: LogoResolver = (url) => url;

/**
 * The mutations behind these actions report their own failures with a toast, so
 * a rejection here has already been surfaced to the admin.
 */
const fireAndForget = (promise: Promise<unknown>): void => {
  promise.catch(() => undefined);
};

const WeeklyContentPackTab: React.FC = () => {
  const { data: seasons } = useSeasons();
  const { toast } = useToast();

  const activeSeasonId = useMemo(
    () => seasons?.find((season) => season.is_active)?.id ?? seasons?.[0]?.id ?? '',
    [seasons]
  );

  const [seasonId, setSeasonId] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [resolveLogo, setResolveLogo] = useState<LogoResolver>(() => identityResolver);
  const [isExportMounted, setIsExportMounted] = useState(false);

  const pack = useWeeklyContentPack();
  const { summaryRef, setDivisionRef, buildRequests } = useGraphicNodes(pack.facts);
  const { capture, exportAll, isExporting } = useGraphicExport();

  useUnsavedChangesGuard(
    pack.isDirty,
    'This recap draft has not been saved. Leave without saving?'
  );

  const chosenSeasonId = seasonId || activeSeasonId;

  const handleGenerate = useCallback(() => {
    const week = Number(weekNumber);
    if (!chosenSeasonId || !Number.isFinite(week) || week < 1) return;
    fireAndForget(pack.generateFor(chosenSeasonId, week));
  }, [chosenSeasonId, pack, weekNumber]);

  const handleGenerateCaption = useCallback(async () => {
    const outcome = await pack.generateCaption();

    if (outcome === 'unconfigured') {
      toast({
        title: 'AI captions are not set up',
        description:
          'Add ANTHROPIC_API_KEY to the Supabase edge function secrets. Until then, write the caption yourself — everything else in the pack works.',
        variant: 'destructive',
      });
    } else if (outcome === 'failed') {
      toast({
        title: 'Could not write the caption',
        description:
          'The caption in the box is the plain one built from the results. Try again, or edit it as it is.',
        variant: 'destructive',
      });
    }
  }, [pack, toast]);

  const handleCopyCaption = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pack.draft.caption);
      toast({ title: 'Caption copied' });
    } catch {
      toast({
        title: 'Could not copy',
        description: 'Select the caption and copy it by hand.',
        variant: 'destructive',
      });
    }
  }, [pack.draft.caption, toast]);

  /**
   * Inline every logo, then mount the full-size copies off screen and wait a
   * frame. Doing it in this order means a capture never races a network fetch
   * or an unpainted node.
   */
  const mountExportSurface = useCallback(async () => {
    if (!pack.facts) return false;

    const logoUrls = [
      ...pack.facts.divisions.flatMap((d) => d.standings.map((r) => r.logoUrl)),
      ...pack.facts.upsets.map((u) => u.winnerLogoUrl ?? null),
      ...pack.facts.hotStreaks.map((s) => s.logoUrl ?? null),
      pack.facts.teamOfTheWeek?.logoUrl ?? null,
    ];

    const resolver = await buildLogoResolver(logoUrls);
    setResolveLogo(() => resolver);
    setIsExportMounted(true);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    return true;
  }, [pack.facts]);

  const handleDownload = useCallback(async () => {
    if (!(await mountExportSurface())) return;

    const { exported, failed } = await exportAll(buildRequests());
    setIsExportMounted(false);

    if (failed.length > 0) {
      toast({
        title: `${failed.length} graphic${failed.length === 1 ? '' : 's'} failed`,
        description: failed.join(', '),
        variant: 'destructive',
      });
    } else {
      toast({ title: `Downloaded ${exported} graphic${exported === 1 ? '' : 's'}` });
    }
  }, [buildRequests, exportAll, mountExportSurface, toast]);

  /**
   * The summary graphic, for the shared-link preview.
   *
   * Best-effort: a published recap people can read matters more than a
   * thumbnail, so a failure here returns null and publishing carries on.
   */
  const captureSummaryGraphic = useCallback(async (): Promise<string | null> => {
    if (!(await mountExportSurface())) return null;
    try {
      return summaryRef.current ? await capture(summaryRef.current) : null;
    } catch {
      return null;
    } finally {
      setIsExportMounted(false);
    }
  }, [capture, mountExportSurface, summaryRef]);

  return (
    <AdminSectionWrapper title="Weekly Content Pack" icon={Newspaper}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <WeekPickerCard
            seasons={seasons ?? []}
            seasonId={chosenSeasonId}
            weekNumber={weekNumber}
            isGenerating={pack.isGenerating}
            onSeasonChange={setSeasonId}
            onWeekChange={setWeekNumber}
            onGenerate={handleGenerate}
          />

          {pack.facts && <PackWarnings facts={pack.facts} />}

          {pack.facts && (
            <PackEditorCard
              draft={pack.draft}
              isGeneratingCaption={pack.isGeneratingCaption}
              isExporting={isExporting}
              onFieldChange={pack.setField}
              onGenerateCaption={() => fireAndForget(handleGenerateCaption())}
              onCopyCaption={() => fireAndForget(handleCopyCaption())}
              onDownload={() => fireAndForget(handleDownload())}
            />
          )}

          {pack.facts && (
            <PublishCard
              isCorrection={pack.isCorrection}
              isPublished={pack.existingEdition?.status === 'published'}
              publicPath={pack.publicPath}
              canPublish={pack.canPublish}
              isDirty={pack.isDirty}
              isSaving={pack.isSaving}
              isPublishing={pack.isPublishing}
              onSave={() => fireAndForget(pack.save())}
              onPublish={(note) => fireAndForget(pack.publish(note, captureSummaryGraphic))}
              onUnpublish={() => fireAndForget(pack.unpublish())}
              isUnpublishing={pack.isUnpublishing}
            />
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          {pack.facts ? (
            <PackPreview facts={pack.facts} headline={pack.draft.headline} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Pick a season and week, then press Generate draft.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {isExportMounted && pack.facts && (
        <PackExportSurface
          facts={pack.facts}
          headline={pack.draft.headline}
          resolveLogo={resolveLogo}
          summaryRef={summaryRef}
          setDivisionRef={setDivisionRef}
        />
      )}
    </AdminSectionWrapper>
  );
};

export default WeeklyContentPackTab;
