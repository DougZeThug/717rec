
import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

const MessageBoardFAB: React.FC = () => {
  const navigate = useNavigate();
  const { navigateWithTransition } = useNavigation();
  const { resolvedTheme } = useTheme();

  const handleClick = () => {
    navigateWithTransition('/message-board');
  };

  return (
    <motion.div 
      className="fixed bottom-[76px] right-4 z-40"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        onClick={handleClick}
        size="icon"
        className={cn(
          "rounded-full w-12 h-12 shadow-lg",
          "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white",
          "dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-500 dark:hover:to-blue-600",
          "transition-all duration-300",
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
