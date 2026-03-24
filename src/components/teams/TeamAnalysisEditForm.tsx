import { Loader2, Plus, Save, X } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TeamAnalysis, TeamAnalysisInput } from '@/hooks/useTeamAnalysis';

interface TeamAnalysisEditFormProps {
  analysis: TeamAnalysis | null;
  onSave: (input: TeamAnalysisInput) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export const TeamAnalysisEditForm: React.FC<TeamAnalysisEditFormProps> = ({
  analysis,
  onSave,
  onCancel,
  isSaving,
}) => {
  const [overall, setOverall] = useState(analysis?.overall || '');
  const [strengths, setStrengths] = useState<string[]>(
    analysis?.strengths?.length ? analysis.strengths : ['']
  );
  const [weaknesses, setWeaknesses] = useState<string[]>(
    analysis?.weaknesses?.length ? analysis.weaknesses : ['']
  );
  const [trends, setTrends] = useState(analysis?.trends || '');
  const [rivalryInsights, setRivalryInsights] = useState(analysis?.rivalry_insights || '');

  const handleAddStrength = () => setStrengths([...strengths, '']);
  const handleAddWeakness = () => setWeaknesses([...weaknesses, '']);

  const handleRemoveStrength = (index: number) => {
    setStrengths(strengths.filter((_, i) => i !== index));
  };

  const handleRemoveWeakness = (index: number) => {
    setWeaknesses(weaknesses.filter((_, i) => i !== index));
  };

  const handleStrengthChange = (index: number, value: string) => {
    const updated = [...strengths];
    updated[index] = value;
    setStrengths(updated);
  };

  const handleWeaknessChange = (index: number, value: string) => {
    const updated = [...weaknesses];
    updated[index] = value;
    setWeaknesses(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      overall: overall || undefined,
      strengths: strengths.filter((s) => s.trim()),
      weaknesses: weaknesses.filter((w) => w.trim()),
      trends: trends || undefined,
      rivalry_insights: rivalryInsights || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      {/* Overall Assessment */}
      <div className="space-y-2">
        <Label htmlFor="overall">Overall Assessment</Label>
        <Textarea
          id="overall"
          value={overall}
          onChange={(e) => setOverall(e.target.value)}
          placeholder="Write an overall assessment of the team..."
          className="min-h-[100px]"
        />
      </div>

      {/* Strengths */}
      <div className="space-y-2">
        <Label>Strengths</Label>
        <div className="space-y-2">
          {strengths.map((strength, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={strength}
                onChange={(e) => handleStrengthChange(index, e.target.value)}
                placeholder="Enter a strength..."
              />
              {strengths.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveStrength(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStrength}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Strength
          </Button>
        </div>
      </div>

      {/* Weaknesses */}
      <div className="space-y-2">
        <Label>Areas to Improve</Label>
        <div className="space-y-2">
          {weaknesses.map((weakness, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={weakness}
                onChange={(e) => handleWeaknessChange(index, e.target.value)}
                placeholder="Enter an area to improve..."
              />
              {weaknesses.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveWeakness(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddWeakness}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Area to Improve
          </Button>
        </div>
      </div>

      {/* Trends */}
      <div className="space-y-2">
        <Label htmlFor="trends">Current Form / Trends</Label>
        <Textarea
          id="trends"
          value={trends}
          onChange={(e) => setTrends(e.target.value)}
          placeholder="Describe the team's current form..."
        />
      </div>

      {/* Rivalry Insights */}
      <div className="space-y-2">
        <Label htmlFor="rivalry">Rivalry Insights (Optional)</Label>
        <Textarea
          id="rivalry"
          value={rivalryInsights}
          onChange={(e) => setRivalryInsights(e.target.value)}
          placeholder="Note any notable rivalries or matchups..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" /> Save Analysis
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
