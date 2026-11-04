import { ArrowLeft } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

interface BackToBracketsButtonProps {
  onBack: () => void;
}

/**
 * The way back from an open bracket (or one still loading) to the division list.
 *
 * Without it the only exits were the bottom tab bar and the browser Back button.
 * Shared by PlayoffView and AdminView. The error banner keeps its own button, so
 * neither view renders this one while the list is showing.
 *
 * `size="sm"` already sets `min-h-[44px]`, so the tap target is 44px tall on a
 * phone and stays there on a desktop; no extra height classes are needed.
 */
const BackToBracketsButton: React.FC<BackToBracketsButtonProps> = ({ onBack }) => {
  const handleClick = () => {
    onBack();
    // The reader may be far down a tall bracket; the list should show from its top.
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="mb-3">
      <Button variant="ghost" size="sm" onClick={handleClick}>
        <ArrowLeft aria-hidden="true" />
        Back to brackets
      </Button>
    </div>
  );
};

export default BackToBracketsButton;
