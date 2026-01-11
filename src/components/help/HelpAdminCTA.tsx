import { Settings } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const HelpAdminCTA: React.FC = () => {
  return (
    <Card className="mt-8">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Ready to manage your league?</h3>
            <p className="text-sm text-muted-foreground">
              Head to the Admin Dashboard to get started.
            </p>
          </div>
          <Link to="/admin">
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
