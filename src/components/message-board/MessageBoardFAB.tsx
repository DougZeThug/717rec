import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useTheme } from 'next-themes';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useNavigation } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

const MessageBoardFAB: React.FC = () => {
  const { navigateWithTransition } = useNavigation();
  const { _resolvedTheme } = useTheme();

  const handleClick = () => {
    navigateWithTransition('/message-board');
  };

  return (
    <motion.div
      className="fixed bottom-[76px] right-4 z-40"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        onClick={handleClick}
        size="icon"
        className={cn(
          'rounded-full w-12 h-12 shadow-lg',
          'bg-gradient-to-br from-blue-500 via-blue-600 to-amber-500',
          'hover:from-blue-400 hover:via-blue-500 hover:to-amber-400 text-white',
          'dark:from-blue-600 dark:via-blue-700 dark:to-amber-600',
          'dark:hover:from-blue-500 dark:hover:via-blue-600 dark:hover:to-amber-500',
          'transition-all duration-300',
          animations.fadeIn
        )}
        aria-label="Message Board"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    </motion.div>
  );
};

export default MessageBoardFAB;
