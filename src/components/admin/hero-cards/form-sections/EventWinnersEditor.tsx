import { Medal, Plus, Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { parseMetadata } from '@/utils/parseMetadata';

import { SectionHeader } from './SectionHeader';
import { FormSectionProps } from './types';

interface Winner {
  place: number;
  names: string;
}

interface WeekWinners {
  week: number;
  winners: Winner[];
}

const parseMetadata = (metadataStr: string): Record<string, any> => {
  try {
    return JSON.parse(metadataStr);
  } catch {
    return {};
  }
};

export const EventWinnersEditor: React.FC<FormSectionProps> = ({ formData, onChange }) => {
  if (formData.card_type !== 'event') return null;

  const metadata = parseMetadata(formData.metadata);
  const pastWinners: WeekWinners[] = (metadata.past_winners as WeekWinners[]) || [];

  const updateWinners = (updated: WeekWinners[]) => {
    const newMetadata = { ...metadata, past_winners: updated };
    onChange('metadata', JSON.stringify(newMetadata, null, 2));
  };

  const addWeek = () => {
    const nextWeek = pastWinners.length > 0 ? Math.max(...pastWinners.map((w) => w.week)) + 1 : 1;
    updateWinners([...pastWinners, { week: nextWeek, winners: [{ place: 1, names: '' }] }]);
  };

  const removeWeek = (weekIndex: number) => {
    updateWinners(pastWinners.filter((_, i) => i !== weekIndex));
  };

  const updateWeekNumber = (weekIndex: number, week: number) => {
    const updated = [...pastWinners];
    updated[weekIndex] = { ...updated[weekIndex], week };
    updateWinners(updated);
  };

  const addWinner = (weekIndex: number) => {
    const updated = [...pastWinners];
    const nextPlace = updated[weekIndex].winners.length + 1;
    updated[weekIndex] = {
      ...updated[weekIndex],
      winners: [...updated[weekIndex].winners, { place: nextPlace, names: '' }],
    };
    updateWinners(updated);
  };

  const removeWinner = (weekIndex: number, winnerIndex: number) => {
    const updated = [...pastWinners];
    const newWinners = updated[weekIndex].winners
      .filter((_, i) => i !== winnerIndex)
      .map((w, i) => ({ ...w, place: i + 1 }));
    updated[weekIndex] = { ...updated[weekIndex], winners: newWinners };
    updateWinners(updated);
  };

  const updateWinnerNames = (weekIndex: number, winnerIndex: number, names: string) => {
    const updated = [...pastWinners];
    const newWinners = [...updated[weekIndex].winners];
    newWinners[winnerIndex] = { ...newWinners[winnerIndex], names };
    updated[weekIndex] = { ...updated[weekIndex], winners: newWinners };
    updateWinners(updated);
  };

  const placeLabels = ['🥇 1st', '🥈 2nd', '🥉 3rd'];

  return (
    <div className="bg-card rounded-lg border p-4">
      <SectionHeader icon={Medal} title="Past Winners" />

      <div className="space-y-4">
        {pastWinners.map((weekData, weekIndex) => (
          <div key={weekIndex} className="border rounded-md p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Week</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  className="w-16 h-8 text-sm"
                  value={weekData.week}
                  onChange={(e) => updateWeekNumber(weekIndex, parseInt(e.target.value) || 0)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeWeek(weekIndex)}
                className="text-destructive hover:text-destructive h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {weekData.winners.map((winner, winnerIndex) => (
              <div key={winnerIndex} className="flex items-center gap-2">
                <span className="text-sm w-12 shrink-0">
                  {placeLabels[winnerIndex] || `#${winner.place}`}
                </span>
                <Input
                  className="h-8 text-sm flex-1"
                  placeholder="Winner name(s)"
                  value={winner.names}
                  onChange={(e) => updateWinnerNames(weekIndex, winnerIndex, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeWinner(weekIndex, winnerIndex)}
                  className="text-destructive hover:text-destructive h-8 w-8 p-0 shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addWinner(weekIndex)}
              className="w-full h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Place
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addWeek} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add Week
        </Button>
      </div>
    </div>
  );
};
