import { AlertCircle, Loader2, Plus, Trash2, Trophy } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useChallongeFallbackBrackets,
  useChallongeFallbackConfig,
  useChallongeFallbackMutations,
} from '@/hooks/useChallongeFallback';
import type { ChallongeFallbackBracket } from '@/services/ChallongeFallbackService';

type DraftRow = {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
  isNew?: boolean;
};

const toDraft = (rows: ChallongeFallbackBracket[]): DraftRow[] =>
  rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug, sort_order: r.sort_order }));

const ChallongeFallbackSection: React.FC = () => {
  const { data: config, isLoading: configLoading } = useChallongeFallbackConfig();
  const { data: brackets, isLoading: bracketsLoading } = useChallongeFallbackBrackets();
  const { updateConfig, createBracket, updateBracket, deleteBracket, isMutating } =
    useChallongeFallbackMutations();

  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [drafts, setDrafts] = useState<DraftRow[]>([]);

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setTitle(config.header_title);
      setSubtitle(config.header_subtitle);
    }
  }, [config]);

  useEffect(() => {
    if (brackets) setDrafts(toDraft(brackets));
  }, [brackets]);

  const handleSaveConfig = async () => {
    if (!config) return;
    await updateConfig({
      id: config.id,
      enabled,
      header_title: title,
      header_subtitle: subtitle,
    });
  };

  const handleAddRow = () => {
    setDrafts((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        title: '',
        slug: '',
        sort_order: prev.length,
        isNew: true,
      },
    ]);
  };

  const handleRowChange = (id: string, patch: Partial<DraftRow>) => {
    setDrafts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSaveRow = async (row: DraftRow) => {
    if (!row.title.trim() || !row.slug.trim()) return;
    if (row.isNew) {
      await createBracket({
        title: row.title.trim(),
        slug: row.slug.trim(),
        sort_order: row.sort_order,
      });
    } else {
      await updateBracket({
        id: row.id,
        title: row.title.trim(),
        slug: row.slug.trim(),
        sort_order: row.sort_order,
      });
    }
  };

  const handleDeleteRow = async (row: DraftRow) => {
    if (row.isNew) {
      setDrafts((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }
    await deleteBracket(row.id);
  };

  if (configLoading || bracketsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" /> Loading Challonge settings…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5" />
          Challonge Playoffs Fallback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4 rounded-md border p-4">
          <div className="space-y-1">
            <Label htmlFor="challonge-enabled" className="text-base">
              Show Challonge bracket embeds on Playoffs page
            </Label>
            <p className="text-sm text-muted-foreground">
              When on, the Challonge embeds appear above the native brackets viewer.
            </p>
          </div>
          <Switch
            id="challonge-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={isMutating}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="challonge-title">Section title</Label>
            <Input
              id="challonge-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="2025 Summer 2 Playoffs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="challonge-subtitle">Section subtitle</Label>
            <Input
              id="challonge-subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Live tournament brackets - click any bracket to view details"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveConfig} disabled={isMutating} size="sm">
            Save settings
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Bracket embeds</h4>
            <Button variant="outline" size="sm" onClick={handleAddRow} disabled={isMutating}>
              <Plus className="size-4 mr-1" /> Add bracket
            </Button>
          </div>

          {drafts.length === 0 && (
            <p className="text-sm text-muted-foreground">No brackets configured yet.</p>
          )}

          <div className="space-y-3">
            {drafts.map((row) => (
              <div
                key={row.id}
                className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_1fr_90px_auto_auto] sm:items-end"
              >
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={row.title}
                    onChange={(e) => handleRowChange(row.id, { title: e.target.value })}
                    placeholder="Competitive"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Challonge slug</Label>
                  <Input
                    value={row.slug}
                    onChange={(e) => handleRowChange(row.id, { slug: e.target.value })}
                    placeholder="5hy558bb"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Order</Label>
                  <Input
                    type="number"
                    value={row.sort_order}
                    onChange={(e) =>
                      handleRowChange(row.id, { sort_order: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSaveRow(row)}
                  disabled={isMutating || !row.title.trim() || !row.slug.trim()}
                >
                  {row.isNew ? 'Add' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteRow(row)}
                  disabled={isMutating}
                  aria-label="Remove bracket"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Slug is the part of the Challonge URL after challonge.com/ (e.g. for
            challonge.com/5hy558bb use "5hy558bb").
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChallongeFallbackSection;