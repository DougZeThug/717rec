import {
  BarChart3,
  Calendar,
  GitCompareArrows,
  Lightbulb,
  type LucideIcon,
  Trophy,
  Users,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

const QuickLink: React.FC<QuickLinkProps> = ({ to, icon: Icon, label }) => (
  <Button asChild variant="outline" className="w-full justify-start">
    <Link to={to}>
      <Icon className="size-4 mr-2" aria-hidden="true" />
      {label}
    </Link>
  </Button>
);

export const HelpQuickLinks: React.FC = () => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Quick Navigation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <QuickLink to="/teams" icon={Users} label="Teams" />
          <QuickLink to="/schedule" icon={Calendar} label="Schedule" />
          <QuickLink to="/stats" icon={BarChart3} label="Standings" />
          <QuickLink to="/playoffs" icon={Trophy} label="Playoffs" />
          {/* X-02: both pages were missing from every menu in the app. The
              label is "Compare", not "Compare Teams", so it stays distinct
              from the Teams link beside it. */}
          <QuickLink to="/compare" icon={GitCompareArrows} label="Compare" />
          <QuickLink to="/insights" icon={Lightbulb} label="Insights" />
        </div>
      </CardContent>
    </Card>
  );
};
