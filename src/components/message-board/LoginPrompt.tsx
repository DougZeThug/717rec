import { MessageSquare } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';

const LoginPrompt: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center justify-center gap-3 bg-background/80 backdrop-blur-md border-t p-4 fixed bottom-0 left-0 right-0 md:rounded-lg md:border md:shadow-md md:mx-4 lg:mx-auto lg:max-w-3xl"
      style={{ bottom: 'var(--bottombar-height, 0)' }}
    >
      <MessageSquare className="h-5 w-5 text-muted-foreground hidden sm:block" />
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
  );
};

export default LoginPrompt;
