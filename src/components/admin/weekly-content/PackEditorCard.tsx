import { Copy, Download, Loader2, Wand2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { PackDraft } from './useWeeklyContentPack';

const CAPTION_SOURCE_NOTES: Record<PackDraft['captionSource'], string> = {
  ai: 'Written by AI. Edit freely.',
  ai_edited: 'AI draft, edited by you.',
  fallback: 'Built from the results. Press Write it for me for something with more personality.',
  manual: 'Your own words.',
};

interface PackEditorCardProps {
  draft: PackDraft;
  isGeneratingCaption: boolean;
  isExporting: boolean;
  onFieldChange: <K extends keyof PackDraft>(field: K, value: PackDraft[K]) => void;
  onGenerateCaption: () => void;
  onCopyCaption: () => void;
  onDownload: () => void;
}

const PackEditorCard: React.FC<PackEditorCardProps> = ({
  draft,
  isGeneratingCaption,
  isExporting,
  onFieldChange,
  onGenerateCaption,
  onCopyCaption,
  onDownload,
}) => {
  const handleCaptionChange = (value: string) => {
    onFieldChange('caption', value);
    // Touching an AI draft makes it a joint effort, and the label says so.
    if (draft.captionSource === 'ai') onFieldChange('captionSource', 'ai_edited');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Edit the pack</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="recap-headline">Headline</Label>
          <Input
            id="recap-headline"
            value={draft.headline}
            onChange={(e) => onFieldChange('headline', e.target.value)}
            maxLength={90}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="recap-note">Commissioner&apos;s note</Label>
          <Textarea
            id="recap-note"
            value={draft.commissionerNote}
            onChange={(e) => onFieldChange('commissionerNote', e.target.value)}
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
            value={draft.caption}
            onChange={(e) => handleCaptionChange(e.target.value)}
            rows={10}
            placeholder="Write the post, or press Write it for me."
          />
          <p className="text-xs text-muted-foreground">
            {CAPTION_SOURCE_NOTES[draft.captionSource]}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onGenerateCaption} disabled={isGeneratingCaption}>
            {isGeneratingCaption ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            Write it for me
          </Button>
          <Button variant="outline" onClick={onCopyCaption} disabled={draft.caption.trim() === ''}>
            <Copy className="size-4" />
            Copy caption
          </Button>
          <Button variant="outline" onClick={onDownload} disabled={isExporting}>
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
  );
};

export default PackEditorCard;
