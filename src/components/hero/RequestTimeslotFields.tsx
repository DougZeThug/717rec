import React from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BLOCK_OPTIONS } from '@/utils/timeslotMove';

interface BlockSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** One block chooser: the label, and the league's blocks under it. */
const BlockSelect: React.FC<BlockSelectProps> = ({ label, value, onChange }) => {
  const id = React.useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium opacity-90">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="bg-background/20 border-white/20 text-inherit">
          <SelectValue placeholder="Pick a time" />
        </SelectTrigger>
        <SelectContent>
          {BLOCK_OPTIONS.map((block) => (
            <SelectItem key={block.value} value={block.value}>
              {block.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface RequestTimeslotFieldsProps {
  currentTimeslot: string;
  onCurrentTimeslotChange: (value: string) => void;
  requestedTimeslot: string;
  onRequestedTimeslotChange: (value: string) => void;
}

/**
 * The two times a time-change request names.
 *
 * Both are chosen from the league's real blocks rather than typed. A typed time
 * could be anything — "7ish", "as early as possible" — and the admin approving
 * it then has nothing exact to act on.
 */
const RequestTimeslotFields: React.FC<RequestTimeslotFieldsProps> = ({
  currentTimeslot,
  onCurrentTimeslotChange,
  requestedTimeslot,
  onRequestedTimeslotChange,
}) => (
  <div className="space-y-2">
    <div className="grid grid-cols-2 gap-3">
      <BlockSelect
        label="Current timeslot"
        value={currentTimeslot}
        onChange={onCurrentTimeslotChange}
      />
      <BlockSelect
        label="Requested timeslot"
        value={requestedTimeslot}
        onChange={onRequestedTimeslotChange}
      />
    </div>
    <p className="text-xs opacity-75">
      Each time is a block of two back-to-back slots. You play both.
    </p>
  </div>
);

export default RequestTimeslotFields;
