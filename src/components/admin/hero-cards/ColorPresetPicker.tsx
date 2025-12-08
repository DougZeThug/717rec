import { Check } from 'lucide-react';
import { HERO_CARD_COLOR_PRESETS, findPresetByColors } from '@/constants/heroCardPresets';
import { cn } from '@/lib/utils';

interface ColorPresetPickerProps {
  backgroundValue: string;
  textValue: string;
  onSelect: (background: string, text: string) => void;
}

export const ColorPresetPicker = ({ backgroundValue, textValue, onSelect }: ColorPresetPickerProps) => {
  const selectedPreset = findPresetByColors(backgroundValue, textValue);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {HERO_CARD_COLOR_PRESETS.map((preset) => {
          const isSelected = selectedPreset?.id === preset.id;
          
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.background_color, preset.text_color)}
              className={cn(
                "relative flex flex-col items-center p-3 rounded-lg border-2 transition-all hover:scale-105",
                isSelected 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "border-border hover:border-primary/50"
              )}
            >
              {/* Color preview chip */}
              <div 
                className="w-full h-12 rounded-md mb-2 relative overflow-hidden"
                style={{ background: preset.preview }}
              >
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Check className="h-5 w-5 text-white drop-shadow-md" />
                  </div>
                )}
              </div>
              
              {/* Preset name */}
              <span className="text-xs font-medium text-center leading-tight">
                {preset.name}
              </span>
              
              {/* Description on hover - hidden on mobile */}
              <span className="hidden sm:block text-[10px] text-muted-foreground text-center mt-0.5">
                {preset.description}
              </span>
            </button>
          );
        })}
      </div>
      
      {!selectedPreset && backgroundValue && (
        <p className="text-xs text-muted-foreground italic">
          Using custom colors. Select a preset above to use standard themes.
        </p>
      )}
    </div>
  );
};
