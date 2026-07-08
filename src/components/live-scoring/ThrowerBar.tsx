import React from 'react';

import { cn } from '@/lib/utils';

export interface ThrowerOption {
  id: string;
  name: string;
}

interface ThrowerSideProps {
  label: string;
  options: ThrowerOption[];
  activeId: string | null;
  onChange: (id: string) => void;
  disabled: boolean;
}

const ThrowerSide: React.FC<ThrowerSideProps> = ({
  label,
  options,
  activeId,
  onChange,
  disabled,
}) => (
  <div className="min-w-0 flex-1">
    <div className="mb-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
      {label}
    </div>
    <div className="flex flex-wrap gap-1.5">
      {options.length === 0 ? (
        <span className="text-xs text-muted-foreground">No players selected</span>
      ) : (
        options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            aria-pressed={option.id === activeId}
            className={cn(
              'min-h-[36px] rounded-full border px-3 text-xs font-medium transition-colors',
              option.id === activeId
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted',
              disabled && 'opacity-60'
            )}
          >
            {option.name}
          </button>
        ))
      )}
    </div>
  </div>
);

interface ThrowerBarProps {
  team1Label: string;
  team2Label: string;
  team1Options: ThrowerOption[];
  team2Options: ThrowerOption[];
  team1ActiveId: string | null;
  team2ActiveId: string | null;
  onChangeTeam1: (id: string) => void;
  onChangeTeam2: (id: string) => void;
  disabled?: boolean;
}

/** Shows who is throwing this round; auto-alternates, tap to override. */
export const ThrowerBar: React.FC<ThrowerBarProps> = ({
  team1Label,
  team2Label,
  team1Options,
  team2Options,
  team1ActiveId,
  team2ActiveId,
  onChangeTeam1,
  onChangeTeam2,
  disabled = false,
}) => (
  <div className="flex gap-4 rounded-lg border bg-card p-3">
    <ThrowerSide
      label={`${team1Label} throwing`}
      options={team1Options}
      activeId={team1ActiveId}
      onChange={onChangeTeam1}
      disabled={disabled}
    />
    <ThrowerSide
      label={`${team2Label} throwing`}
      options={team2Options}
      activeId={team2ActiveId}
      onChange={onChangeTeam2}
      disabled={disabled}
    />
  </div>
);
