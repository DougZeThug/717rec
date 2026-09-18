import { CheckCircle2, ExternalLink, EyeOff, Loader2, Save, Send } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PublishCardProps {
  isCorrection: boolean;
  isPublished: boolean;
  publicPath: string | null;
  canPublish: boolean;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  onSave: () => void;
  onPublish: (correctionNote?: string) => void;
  onUnpublish: () => void;
  isUnpublishing: boolean;
}

const PublishCard: React.FC<PublishCardProps> = ({
  isCorrection,
  isPublished,
  publicPath,
  canPublish,
  isDirty,
  isSaving,
  isPublishing,
  onSave,
  onPublish,
  onUnpublish,
  isUnpublishing,
}) => {
  const [correctionNote, setCorrectionNote] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {isCorrection ? 'Publish a correction' : 'Publish'}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isPublished && publicPath && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-green-600" />
            <span>Live at</span>
            <Link to={publicPath} className="underline inline-flex items-center gap-1">
              {publicPath}
              <ExternalLink className="size-3" />
            </Link>
          </div>
        )}

        {isCorrection && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="recap-correction">What changed?</Label>
            <Textarea
              id="recap-correction"
              value={correctionNote}
              onChange={(e) => setCorrectionNote(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="e.g. Week 6 score for Bag Chasers v Corn Stars was entered wrong."
            />
            <p className="text-xs text-muted-foreground">
              Publishing again saves a new version. The one that is live now is kept, not
              overwritten.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onSave} disabled={isSaving || !isDirty}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save draft
          </Button>
          <Button
            onClick={() => onPublish(correctionNote.trim() || undefined)}
            disabled={!canPublish || isPublishing}
          >
            {isPublishing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {isCorrection ? 'Publish correction' : 'Publish'}
          </Button>
          {isPublished && (
            <Button variant="ghost" onClick={onUnpublish} disabled={isUnpublishing}>
              {isUnpublishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <EyeOff className="size-4" />
              )}
              Unpublish
            </Button>
          )}
        </div>

        {isPublished && (
          <p className="text-xs text-muted-foreground">
            Unpublishing puts the home page back to its live recap. Every version stays on file.
          </p>
        )}

        {!canPublish && (
          <p className="text-xs text-muted-foreground">
            Publishing is off for this week. See the warnings above — there is either nothing to
            show, or no power score snapshot to trust.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PublishCard;
