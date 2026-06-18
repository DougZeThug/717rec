import { m } from 'framer-motion';
import { Check } from 'lucide-react';
import React from 'react';

import MatchStatusIndicator from './MatchStatusIndicator';

interface MatchStatusSectionProps {
  isCompleted: boolean;
  isEdited: boolean;
  isValid: boolean;
  disabled: boolean;
}

const MatchStatusSection: React.FC<MatchStatusSectionProps> = ({
  isCompleted,
  isEdited,
  isValid,
  disabled,
}) => {
  return (
    <div className="flex items-center gap-2">
      {isCompleted ? (
        <m.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center text-green-600 dark:text-green-400"
        >
          <Check className="size-3 mr-1" />
          <span className="text-sm">Complete</span>
        </m.div>
      ) : null}

      <MatchStatusIndicator isEdited={isEdited} isValid={isValid} isCompleted={isCompleted} />
    </div>
  );
};

export default MatchStatusSection;
