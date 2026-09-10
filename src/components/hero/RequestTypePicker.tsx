import { AlertTriangle, Calendar, Clock } from 'lucide-react';
import React from 'react';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { REQUEST_TYPE_LABELS, TeamRequestType } from '@/types/teamRequest';

const REQUEST_OPTIONS: { type: TeamRequestType; icon: React.ElementType; description: string }[] = [
  { type: 'TIME_CHANGE', icon: Clock, description: 'Request a different time slot' },
  { type: 'BYE_REQUEST', icon: Calendar, description: 'Request a bye week' },
  { type: 'EMERGENCY_CANCEL', icon: AlertTriangle, description: 'Emergency cancellation' },
];

interface RequestTypePickerProps {
  selectedType: TeamRequestType | null;
  onSelect: (type: TeamRequestType) => void;
}

/** The three things a team can ask the league for. */
const RequestTypePicker: React.FC<RequestTypePickerProps> = ({ selectedType, onSelect }) => (
  <>
    <Label className="text-sm font-medium opacity-90">What do you need?</Label>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {REQUEST_OPTIONS.map(({ type, icon: Icon, description }) => (
        <button
          type="button"
          key={type}
          onClick={() => onSelect(type)}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-lg transition-all text-center border-2',
            selectedType === type
              ? 'bg-white/20 border-white/50'
              : 'bg-background/10 border-white/20 hover:bg-background/20'
          )}
        >
          <Icon className="size-6" />
          <span className="font-semibold text-sm">{REQUEST_TYPE_LABELS[type]}</span>
          <span className="text-xs opacity-70">{description}</span>
        </button>
      ))}
    </div>
  </>
);

export default RequestTypePicker;
