
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

/**
 * Empty state component for team selection
 * Displayed when no teams are available for selection
 * Phase 3: Added actionable guidance for users
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
        <p className="text-muted-foreground mb-3">
          No teams exist in this division.
        </p>
        <div className="text-sm text-muted-foreground">
          <p className="font-medium mb-2">To fix this:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Add teams under "Teams" → "New Team"</li>
            <li>Or pick a different division</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
