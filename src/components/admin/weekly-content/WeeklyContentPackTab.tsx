import { Copy, Download, Loader2, Newspaper, Sparkles } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import AdminSectionWrapper from '@/components/admin/AdminSectionWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSeasons } from '@/hooks/useSeasons';
import { useToast } from '@/hooks/useToast';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

import type { LogoResolver } from './export/inlineImages';
import { buildLogoResolver } from './export/inlineImages';
import { useGraphicExport } from './export/useGraphicExport';
import PackExportSurface from './PackExportSurface';
import PackPreview from './PackPreview';
import PackWarnings from './PackWarnings';
import { useGraphicNodes } from './useGraphicNodes';
import { useWeeklyContentPack } from './useWeeklyContentPack';

/** Weeks to offer. A season never runs longer than this in practice. */
const WEEK_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);

const identityResolver: LogoResolver = (url) => url;

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
  const { exportAll, isExporting } = useGraphicExport();

  useUnsavedChangesGuard(
    pack.isDirty,
    'This recap draft has not been saved. Leave without saving?'
  );

  const chosenSeasonId = seasonId || activeSeasonId;

  const handleGenerate = useCallback(async () => {
    const week = Number(weekNumber);
    if (!chosenSeasonId || !Number.isFinite(week) || week < 1) return;
    await pack.generateFor(chosenSeasonId, week);
  }, [chosenSeasonId, pack, weekNumber]);

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

  const handleDownload = useCallback(async () => {
    if (!pack.facts) return;

    // Inline every logo first, then mount the full-size copies. Doing it in this
    // order means the capture never races a network fetch.
    const logoUrls = [
      ...pack.facts.divisions.flatMap((d) => d.standings.map((r) => r.logoUrl)),
      ...pack.facts.upsets.map((u) => u.winnerLogoUrl ?? null),
      ...pack.facts.hotStreaks.map((s) => s.logoUrl ?? null),
      pack.facts.teamOfTheWeek?.logoUrl ?? null,
    ];

    const resolver = await buildLogoResolver(logoUrls);
    setResolveLogo(() => resolver);
    setIsExportMounted(true);

    // Let React paint the off-screen copies before measuring them.
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

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
  }, [buildRequests, exportAll, pack.facts, toast]);

  return (
    <AdminSectionWrapper title="Weekly Content Pack" icon={Newspaper}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Choose a week</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="recap-season">Season</Label>
                <Select value={chosenSeasonId} onValueChange={setSeasonId}>
                  <SelectTrigger id="recap-season">
                    <SelectValue placeholder="Pick a season" />
                  </SelectTrigger>
                  <SelectContent>
                    {(seasons ?? []).map((season) => (
                      <SelectItem key={season.id} value={season.id}>
                        {season.name}
                        {season.is_active ? ' (active)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="recap-week">Week</Label>
                <Select value={weekNumber} onValueChange={setWeekNumber}>
                  <SelectTrigger id="recap-week">
                    <SelectValue placeholder="Pick a week" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEK_OPTIONS.map((week) => (
                      <SelectItem key={week} value={String(week)}>
                        Week {week}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!chosenSeasonId || !weekNumber || pack.isGenerating}
              >
                {pack.isGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Generate draft
              </Button>
            </CardContent>
          </Card>

          {pack.facts && <PackWarnings facts={pack.facts} />}

          {pack.facts && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Edit the pack</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="recap-headline">Headline</Label>
                  <Input
                    id="recap-headline"
                    value={pack.draft.headline}
                    onChange={(e) => pack.setField('headline', e.target.value)}
                    maxLength={90}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="recap-note">Commissioner&apos;s note</Label>
                  <Textarea
                    id="recap-note"
                    value={pack.draft.commissionerNote}
                    onChange={(e) => pack.setField('commissionerNote', e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Anything the database cannot know — who finally beat their brother, the outfit, the trash talk."
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to colour the caption. Nothing here changes the results.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="recap-caption">Caption</Label>
                  <Textarea
                    id="recap-caption"
                    value={pack.draft.caption}
                    onChange={(e) => {
                      pack.setField('caption', e.target.value);
                      if (pack.draft.captionSource === 'ai') {
                        pack.setField('captionSource', 'ai_edited');
                      }
                    }}
                    rows={10}
                    placeholder="Write the post, or generate a draft once captions are wired up."
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopyCaption}
                    disabled={pack.draft.caption.trim() === ''}
                  >
                    <Copy className="size-4" />
                    Copy caption
                  </Button>
                  <Button variant="outline" onClick={handleDownload} disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Download className="size-4" />
                    )}
                    Download graphics
                  </Button>
                </div>
              </CardContent>
            </Card>
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
