import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TARGET_TYPE_OPTIONS } from '@/constants/heroCardPresets';
import {
  fetchDivisionsForSelector,
  fetchSeasonsForSelector,
  fetchTeamsForSelector,
} from '@/services/selectors/SelectorService';
import { HeroCardTargetType } from '@/types/heroCard';

interface TargetTypeSelectorProps {
  value: HeroCardTargetType;
  onChange: (value: HeroCardTargetType) => void;
}

export const TargetTypeSelector: React.FC<TargetTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label>Who should see this card?</Label>
      <Select value={value} onValueChange={(v) => onChange(v as HeroCardTargetType)}>
        <SelectTrigger>
          <SelectValue placeholder="Select target audience" />
        </SelectTrigger>
        <SelectContent>
          {TARGET_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <span>{option.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Choose whether this card highlights a specific team, division, or season.
      </p>
    </div>
  );
};

interface TargetEntitySelectorProps {
  targetType: HeroCardTargetType;
  value: string;
  onChange: (value: string) => void;
}

export const TargetEntitySelector: React.FC<TargetEntitySelectorProps> = ({
  targetType,
  value,
  onChange,
}) => {
  const { data: teams } = useQuery({
    queryKey: ['teams-for-selector'],
    queryFn: fetchTeamsForSelector,
    enabled: targetType === 'team',
  });

  const { data: divisions } = useQuery({
    queryKey: ['divisions-for-selector'],
    queryFn: fetchDivisionsForSelector,
    enabled: targetType === 'division',
  });

  const { data: seasons } = useQuery({
    queryKey: ['seasons-for-selector'],
    queryFn: fetchSeasonsForSelector,
    enabled: targetType === 'season',
  });

  if (targetType === 'none') return null;

  const getOptions = () => {
    switch (targetType) {
      case 'team':
        return teams || [];
      case 'division':
        return divisions || [];
      case 'season':
        return seasons || [];
      default:
        return [];
    }
  };

  const getLabel = () => {
    switch (targetType) {
      case 'team':
        return 'Select Team';
      case 'division':
        return 'Select Division';
      case 'season':
        return 'Select Season';
      default:
        return 'Select Target';
    }
  };

  const options = getOptions();

  return (
    <div className="space-y-2">
      <Label>{getLabel()}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Choose a ${targetType}...`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Legacy default export for backwards compatibility
interface TargetSelectorProps {
  targetType: HeroCardTargetType;
  value: string;
  onChange: (value: string) => void;
}

const TargetSelector: React.FC<TargetSelectorProps> = ({ targetType, value, onChange }) => {
  return <TargetEntitySelector targetType={targetType} value={value} onChange={onChange} />;
};

export default TargetSelector;
