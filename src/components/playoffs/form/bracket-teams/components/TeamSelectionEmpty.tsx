
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

/**
 * Empty state component for team selection
 * Displayed when no teams are available for selection
 */
export const TeamSelectionEmpty: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          No Teams Available
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          No teams are currently available for bracket creation. 
          Please ensure teams have been added to the system and try again.
        </p>
      </CardContent>
    </Card>
  );
};
