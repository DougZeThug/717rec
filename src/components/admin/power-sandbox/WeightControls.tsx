import React, { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DEFAULT_POWER_SCORE_WEIGHTS,
  PowerScoreWeights,
  weightsEqual,
} from '@/utils/powerScore/weights';

import { formatTriple } from './previewFormat';

interface WeightControlsProps {
  /** The committed candidate triple (what the preview is showing) */
  value: PowerScoreWeights;
  /** The live triple — the "Current" preset and the change-detection anchor */
  baseline: PowerScoreWeights;
  disabled?: boolean;
  onChange: (weights: PowerScoreWeights) => void;
}

interface FieldStrings {
  win: string;
  sos: string;
  game: string;
}

const FIELDS: { key: keyof FieldStrings; label: string; hint: string }[] = [
  { key: 'win', label: 'Match wins', hint: 'points for winning matches' },
  { key: 'sos', label: 'Strength of schedule', hint: 'points for playing tough opponents' },
  { key: 'game', label: 'Game wins', hint: 'points for winning individual games' },
];

const toFields = (weights: PowerScoreWeights): FieldStrings => ({
  win: String(weights.win),
  sos: String(weights.sos),
  game: String(weights.game),
});

/** Parse the three inputs, or null while any of them is not a number yet. */
const parseFields = (fields: FieldStrings): PowerScoreWeights | null => {
  const win = Number(fields.win);
  const sos = Number(fields.sos);
  const game = Number(fields.game);
  if (fields.win.trim() === '' || fields.sos.trim() === '' || fields.game.trim() === '') {
    return null;
  }
  if (!Number.isFinite(win) || !Number.isFinite(sos) || !Number.isFinite(game)) return null;
  return { win, sos, game };
};

/**
 * The three weight inputs with presets, a "Balance SOS" helper and a live
 * sum-to-100 badge. Typing is debounced ~300ms before it reaches the parent
 * (and thus the preview computation); preset clicks commit immediately.
 */
const WeightControls: React.FC<WeightControlsProps> = ({ value, baseline, disabled, onChange }) => {
  const [fields, setFields] = useState<FieldStrings>(() => toFields(value));
  // The last triple this component handed to the parent. Lets the sync
  // effect below tell "our own echo" from a real outside change (a preset in
  // another render, a save/revert refresh) without clobbering typing.
  const lastEmitted = useRef<PowerScoreWeights>(value);

  useEffect(() => {
    if (!weightsEqual(lastEmitted.current, value)) {
      lastEmitted.current = value;
      setFields(toFields(value));
    }
  }, [value]);

  useEffect(() => {
    const parsed = parseFields(fields);
    if (!parsed || weightsEqual(parsed, lastEmitted.current)) return;
    const timer = setTimeout(() => {
      lastEmitted.current = parsed;
      onChange(parsed);
    }, 300);
    return () => clearTimeout(timer);
  }, [fields, onChange]);

  const commitPreset = (weights: PowerScoreWeights) => {
    lastEmitted.current = weights;
    setFields(toFields(weights));
    onChange(weights);
  };

  const balanceSos = () => {
    const win = Number(fields.win);
    const game = Number(fields.game);
    if (fields.win.trim() === '' || fields.game.trim() === '') return;
    if (!Number.isFinite(win) || !Number.isFinite(game)) return;
    const sos = Math.max(0, Math.round((100 - win - game) * 10) / 10);
    setFields((prev) => ({ ...prev, sos: String(sos) }));
  };

  const sumParsed = parseFields(fields);
  const sum = sumParsed ? sumParsed.win + sumParsed.sos + sumParsed.game : null;
  const sumOk = sum !== null && Math.abs(sum - 100) < 1e-6;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <label htmlFor={`weight-${field.key}`} className="text-sm font-medium leading-none">
              {field.label}
            </label>
            <Input
              id={`weight-${field.key}`}
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={1}
              value={fields[field.key]}
              disabled={disabled}
              onChange={(e) => setFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">{field.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={sumOk ? 'secondary' : 'destructive'} className="tabular-nums">
          Total: {sum ?? '—'} / 100
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || sumOk}
          onClick={balanceSos}
        >
          Balance SOS
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || weightsEqual(value, baseline)}
          onClick={() => commitPreset(baseline)}
        >
          Current ({formatTriple(baseline)})
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || weightsEqual(value, DEFAULT_POWER_SCORE_WEIGHTS)}
          onClick={() => commitPreset(DEFAULT_POWER_SCORE_WEIGHTS)}
        >
          Default ({formatTriple(DEFAULT_POWER_SCORE_WEIGHTS)})
        </Button>
      </div>
      {!sumOk && (
        <p className="text-xs text-muted-foreground">
          The three weights must add up to exactly 100. &quot;Balance SOS&quot; sets the schedule
          weight to whatever is left over.
        </p>
      )}
    </div>
  );
};

export default WeightControls;
