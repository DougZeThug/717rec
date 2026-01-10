import { Check, CircleOff } from 'lucide-react';

import { HERO_CARD_ICONS } from '@/constants/heroCardPresets';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  value: string;
  onChange: (iconId: string) => void;
}

export const IconPicker = ({ value, onChange }: IconPickerProps) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2">
      {HERO_CARD_ICONS.map((iconOption) => {
        const isSelected = value === iconOption.id;
        const IconComponent = iconOption.icon;

        return (
          <button
            key={iconOption.id || 'none'}
            type="button"
            onClick={() => onChange(iconOption.id)}
            className={cn(
              'flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:scale-105 min-h-[72px]',
              isSelected
                ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            )}
            title={iconOption.description}
          >
            {/* Icon or placeholder */}
            <div className="relative h-6 w-6 flex items-center justify-center">
              {IconComponent ? (
                <IconComponent
                  className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')}
                />
              ) : (
                <CircleOff
                  className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')}
                />
              )}

              {isSelected && (
                <div className="absolute -top-1 -right-1">
                  <Check className="h-3 w-3 text-primary" />
                </div>
              )}
            </div>

            {/* Icon name */}
            <span
              className={cn(
                'text-[10px] mt-1.5 text-center leading-tight',
                isSelected ? 'font-medium text-primary' : 'text-muted-foreground'
              )}
            >
              {iconOption.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
