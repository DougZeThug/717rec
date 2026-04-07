import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import React, { useEffect } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDivisions } from '@/hooks/useDivisions';
import { HeroCardService } from '@/services/HeroCardService';
import { parseMetadata } from '@/utils/parseMetadata';

import { SectionHeader } from './SectionHeader';
import { FormSectionProps } from './types';

export const ChampionsEditor: React.FC<FormSectionProps> = ({ formData, onChange }) => {
  const { divisions } = useDivisions();

  // Get unique visible display divisions ordered by weight
  const visibleDivisions = React.useMemo(() => {
    const seen = new Set<string>();
    return divisions
      .filter((d) => d.display_division && d.display_division !== 'Hidden')
      .filter((d) => {
        if (seen.has(d.display_division)) return false;
        seen.add(d.display_division);
        return true;
      });
  }, [divisions]);

  // Get hidden division IDs to exclude teams
  const hiddenDivisionIds = React.useMemo(
    () => divisions.filter((d) => d.display_division === 'Hidden').map((d) => d.id),
    [divisions]
  );

  // Fetch all non-hidden teams
  const { data: teams = [] } = useQuery({
    queryKey: ['teams-for-champions', hiddenDivisionIds],
    queryFn: () => HeroCardService.fetchTeamsForChampions(hiddenDivisionIds),
    enabled: divisions.length > 0,
  });

  // Auto-clean stale division keys from previous seasons
  useEffect(() => {
    if (formData.card_type !== 'champions' || visibleDivisions.length === 0) return;
    const validNames = new Set(visibleDivisions.map((d) => d.display_division));
    const currentChampions =
      (parseMetadata(formData.metadata).champions as Record<string, string>) || {};
    const staleKeys = Object.keys(currentChampions).filter((k) => !validNames.has(k));
    if (staleKeys.length > 0) {
      const cleaned: Record<string, string> = { ...currentChampions };
      staleKeys.forEach((k) => delete cleaned[k]);
      const newMeta = { ...parseMetadata(formData.metadata), champions: cleaned };
      onChange('metadata', JSON.stringify(newMeta, null, 2));
    }
  }, [visibleDivisions, formData.card_type, formData.metadata, onChange]);

  if (formData.card_type !== 'champions') return null;

  const metadata = parseMetadata(formData.metadata);
  const champions = (metadata.champions as Record<string, string>) || {};

  const updateChampion = (divisionName: string, teamId: string) => {
    const updated = { ...champions };
    if (teamId === '__clear__') {
      delete updated[divisionName];
    } else {
      updated[divisionName] = teamId;
    }
    const newMetadata = { ...metadata, champions: updated };
    onChange('metadata', JSON.stringify(newMetadata, null, 2));
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <SectionHeader icon={Trophy} title="Division Champions" />

      <div className="space-y-3">
        {visibleDivisions.map((div) => (
          <div key={div.display_division} className="space-y-1">
            <Label className="text-xs font-medium">{div.display_division}</Label>
            <Select
              value={champions[div.display_division] || ''}
              onValueChange={(val) => updateChampion(div.display_division, val)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select champion team…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__clear__">— None —</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        {visibleDivisions.length === 0 && (
          <p className="text-xs text-muted-foreground">Loading divisions…</p>
        )}
      </div>
    </div>
  );
};
