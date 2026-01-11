import { X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import ReactionPickerSection from './ReactionPickerSection';

// Common emoji sets
const EMOJI_GROUPS = {
  positive: ['👍', '❤️', '😂', '🎉', '🙌', '👏', '🔥', '✅'],
  neutral: ['👀', '🤔', '😮', '👋', '💯', '🚀', '🧐', '💭'],
  other: ['🙏', '💪', '👎', '😢', '🤷', '😎', '🏆', '👌'],
};

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelect, onClose }) => {
  return (
    <div
      className={cn('p-3 bg-background border rounded-lg shadow-md space-y-3', animations.scaleIn)}
    >
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Add reaction</div>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ReactionPickerSection emojis={EMOJI_GROUPS.positive} onSelect={onSelect} label="Positive" />
      <ReactionPickerSection emojis={EMOJI_GROUPS.neutral} onSelect={onSelect} label="Neutral" />
      <ReactionPickerSection emojis={EMOJI_GROUPS.other} onSelect={onSelect} label="Other" />
    </div>
  );
};

export default ReactionPicker;
