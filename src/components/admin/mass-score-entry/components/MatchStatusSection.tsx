import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import React from 'react';

import { scoreLog } from '@/utils/logger';

import MatchStatusIndicator from './MatchStatusIndicator';

interface MatchStatusSectionProps {
  isCompleted: boolean;
  onCompletedChange: (checked: boolean) => void;
  isEdited: boolean;
  isValid: boolean;
  disabled: boolean;
}

const MatchStatusSection: React.FC<MatchStatusSectionProps> = ({
  isCompleted,
  onCompletedChange,
  isEdited,
  isValid,
  disabled,
}) => {
  // Handle click on the status indicator
  const _handleStatusClick = () => {
    if (!disabled) {
      scoreLog(
        `MatchStatusSection: Label clicked, toggling from ${isCompleted} to ${!isCompleted}`
      );
      onCompletedChange(!isCompleted);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isCompleted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center text-green-600 dark:text-green-400"
        >
          <Check className="h-3 w-3 mr-1" />
          <span className="text-sm">Complete</span>
        </motion.div>
      ) : null}

      <MatchStatusIndicator isEdited={isEdited} isValid={isValid} isCompleted={isCompleted} />
    </div>
  );
};

export default MatchStatusSection;
