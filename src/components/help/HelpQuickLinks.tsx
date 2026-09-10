import { BarChart3, Calendar, GitCompareArrows, Lightbulb, Trophy, Users } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const HelpQuickLinks: React.FC = () => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Quick Navigation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/teams">
              <Users className="size-4 mr-2" aria-hidden="true" />
              Teams
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/schedule">
              <Calendar className="size-4 mr-2" aria-hidden="true" />
              Schedule
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/stats">
              <BarChart3 className="size-4 mr-2" aria-hidden="true" />
              Standings
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/playoffs">
              <Trophy className="size-4 mr-2" aria-hidden="true" />
              Playoffs
            </Link>
          </Button>
          {/* X-02: both pages were missing from every menu in the app. The
              label is "Compare", not "Compare Teams", so it stays distinct
              from the Teams link beside it. */}
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/compare">
              <GitCompareArrows className="size-4 mr-2" aria-hidden="true" />
              Compare
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full justify-start">
            <Link to="/insights">
              <Lightbulb className="size-4 mr-2" aria-hidden="true" />
              Insights
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
