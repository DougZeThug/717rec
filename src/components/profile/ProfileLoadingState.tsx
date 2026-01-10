import { Loader2 } from 'lucide-react';
import React from 'react';

import { Card, CardContent } from '@/components/ui/card';

interface ProfileLoadingStateProps {
  message?: string;
  subMessage?: string;
}

const ProfileLoadingState: React.FC<ProfileLoadingStateProps> = ({
  message = 'Checking authentication...',
  subMessage = 'Please wait while we retrieve your account information',
}) => {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium">{message}</p>
        <p className="text-sm text-muted-foreground mt-2">{subMessage}</p>
      </CardContent>
    </Card>
  );
};

export default ProfileLoadingState;
