
import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/designSystem';
import { useTheme } from 'next-themes';

const MessageBoardFAB: React.FC = () => {
  const navigate = useNavigate();
  const { navigateWithTransition } = useNavigation();
  const { resolvedTheme } = useTheme();

  const handleClick = () => {
    navigateWithTransition('/message-board');
  };

  return (
    <div className="fixed bottom-[76px] right-4 z-40">
      <Button
        onClick={handleClick}
        size="icon"
        className={cn(
          "rounded-full w-12 h-12 shadow-lg",
          "transition-all duration-200 hover:scale-110 active:scale-95",
          resolvedTheme === 'dark'
            ? "bg-blue-600 hover:bg-blue-700 text-white"
            : "bg-cornhole-navy hover:bg-cornhole-navy-light text-white",
          animations.fadeIn
        )}
        aria-label="Message Board"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default MessageBoardFAB;
