import { X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { animations } from '@/styles/design-system';

interface QuickScoreFooterProps {
  onCancel: () => void;
  isSubmitting: boolean;
}

const QuickScoreFooter: React.FC<QuickScoreFooterProps> = ({ onCancel, isSubmitting }) => {
  return (
    <DialogFooter className={animations.fadeIn} style={{ animationDelay: '0.5s' }}>
      <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
        <X className="mr-1 h-4 w-4" />
        Cancel
      </Button>
    </DialogFooter>
  );
};

export default React.memo(QuickScoreFooter);
