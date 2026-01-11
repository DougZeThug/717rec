import { motion } from 'framer-motion';
import { Loader2, Save } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

interface SubmitButtonProps {
  onClick: () => void; // Changed from onSubmit to onClick
  disabled: boolean;
  submitting: boolean;
  editedMatchCount?: number;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  onClick, // Use onClick instead of onSubmit
  disabled,
  submitting,
  editedMatchCount = 0,
}) => {
  return (
    <motion.div whileTap={{ scale: 0.97 }}>
      <Button
        onClick={onClick} // Wired to onClick prop
        disabled={disabled}
        className="flex items-center gap-2 transition-all duration-200 hover:bg-opacity-90 shadow-sm"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {submitting
          ? 'Processing...'
          : `Submit ${editedMatchCount ? `(${editedMatchCount})` : 'All'} Changes`}
      </Button>
    </motion.div>
  );
};

export default SubmitButton;
