import { MessageSquare } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';

import ViewportPortal from '@/components/layout/ViewportPortal';
import { Button } from '@/components/ui/button';

const LoginPrompt: React.FC = () => {
  const navigate = useNavigate();

  return (
    // Portalled so `fixed` means the screen, not the page (see ViewportPortal).
    // bottom-(--bottom-nav-h) lifts it clear of the phone tab bar (z-40).
    <ViewportPortal>
      <div className="flex items-center justify-center gap-3 bg-background/80 backdrop-blur-md border-t p-4 fixed bottom-(--bottom-nav-h) left-0 right-0 z-30 md:rounded-lg md:border md:shadow-md md:mx-4 lg:mx-auto lg:max-w-3xl">
        <MessageSquare className="size-5 text-muted-foreground hidden sm:block" />
        <p className="text-muted-foreground">Sign in to post messages</p>
        <Button
          onClick={() => navigate('/auth', { state: { returnTo: '/message-board' } })}
          variant="default"
          size="sm"
          className="whitespace-nowrap"
        >
          Sign In
        </Button>
      </div>
    </ViewportPortal>
  );
};

export default LoginPrompt;
