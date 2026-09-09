import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Lightbulb,
  ListChecks,
  Sparkles,
  Timer,
  Users,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { switchAdminTab } from '@/utils/adminTabs';

import { adminSectionGuide } from './adminSectionGuide';

interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  icon: React.ElementType;
  /** Admin section this step is done in. */
  tab?: string;
  /** Page this step is done on, when it is not an admin section. */
  href?: string;
  /** What to show on the badge when the step leaves the dashboard. */
  hrefLabel?: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    step: 1,
    title: 'Set Up Timeslots',
    description: 'Define available match times and locations for scheduling',
    icon: Timer,
    tab: 'timeslots',
  },
  {
    step: 2,
    title: 'Create Teams',
    description: 'Add teams and assign them to divisions',
    icon: Users,
    tab: 'teams',
  },
  {
    step: 3,
    title: 'Configure Season',
    description: 'Set up the current season with start/end dates',
    icon: Calendar,
    tab: 'seasons',
  },
  {
    step: 4,
    title: 'Generate Schedule',
    description: 'Use Auto Schedule to create balanced matchups automatically',
    icon: CalendarClock,
    tab: 'auto-schedule',
  },
  {
    step: 5,
    title: 'Record Scores',
    description: 'Enter match results as games are completed',
    icon: ListChecks,
    tab: 'scores',
  },
  {
    step: 6,
    title: 'Run Playoffs',
    // Playoff administration is not a dashboard section: brackets are created
    // and advanced from the public playoffs page, with an admin toolbar.
    description: 'Create brackets and manage tournament progression',
    icon: Sparkles,
    href: '/playoffs',
    hrefLabel: 'Playoffs page',
  },
];

const tips = [
  'Use Auto Schedule after setting up timeslots for best results',
  'Review pending scores weekly to keep standings current',
  'Create playoff brackets after the regular season ends',
  'Update hero cards to highlight upcoming events',
];

/** The sidebar name of the section a step opens. */
const sectionLabel = (tabId: string) =>
  adminSectionGuide.find((section) => section.id === tabId)?.label ?? tabId;

const rowClasses =
  'w-full rounded-md p-2 -m-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** Title, target badge and description — the same body for a button or a link. */
const StepBody: React.FC<{ item: WorkflowStep }> = ({ item }) => (
  <>
    <div className="flex flex-wrap items-center gap-2">
      <item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="font-medium">{item.title}</span>
      <Badge variant="outline" className="text-xs">
        {item.tab ? sectionLabel(item.tab) : item.hrefLabel}
      </Badge>
    </div>
    <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
  </>
);

const GettingStartedTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Getting Started</h2>
        <p className="text-muted-foreground mt-1">A quick guide to managing your 717REC league</p>
      </div>

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            League Setup Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {workflowSteps.map((item, index) => (
              <li key={item.step} className="flex items-start gap-4">
                <div className="flex-shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{item.step}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {item.href ? (
                    <Link to={item.href} className={`block ${rowClasses}`}>
                      <StepBody item={item} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={rowClasses}
                      onClick={() => item.tab && switchAdminTab(item.tab)}
                    >
                      <StepBody item={item} />
                    </button>
                  )}
                </div>
                {index < workflowSteps.length - 1 && (
                  <ArrowRight className="size-4 text-muted-foreground/50 flex-shrink-0 mt-2" />
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Section reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All {adminSectionGuide.length} admin sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {adminSectionGuide.map((section) => (
              <button
                key={section.id}
                type="button"
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => switchAdminTab(section.id)}
              >
                <div className="p-2 rounded-md bg-background">
                  <section.icon className="size-4 text-primary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{section.label}</p>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="size-5 text-amber-500" />
            Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-green-500 mt-0.5 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default GettingStartedTab;
