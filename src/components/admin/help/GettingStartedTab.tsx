import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Timer,
  Sparkles,
  CalendarClock,
  ListChecks,
  Calendar,
  Users,
  Clock,
  LayoutGrid,
  Shuffle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Users2,
} from "lucide-react";

interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  icon: React.ElementType;
  tab: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    step: 1,
    title: "Set Up Timeslots",
    description: "Define available match times and locations for scheduling",
    icon: Timer,
    tab: "timeslots",
  },
  {
    step: 2,
    title: "Create Teams",
    description: "Add teams and assign them to divisions",
    icon: Users,
    tab: "teams",
  },
  {
    step: 3,
    title: "Configure Season",
    description: "Set up the current season with start/end dates",
    icon: Calendar,
    tab: "seasons",
  },
  {
    step: 4,
    title: "Generate Schedule",
    description: "Use Auto Schedule to create balanced matchups automatically",
    icon: CalendarClock,
    tab: "auto-schedule",
  },
  {
    step: 5,
    title: "Record Scores",
    description: "Enter match results as games are completed",
    icon: ListChecks,
    tab: "scores",
  },
  {
    step: 6,
    title: "Run Playoffs",
    description: "Create brackets and manage tournament progression",
    icon: Sparkles,
    tab: "batch-matches",
  },
];

const tabDescriptions = [
  {
    id: "timeslots",
    label: "Timeslots",
    icon: Timer,
    description: "Manage available match times and court assignments",
  },
  {
    id: "batch-matches",
    label: "Match Creation",
    icon: Sparkles,
    description: "Create individual matches or batch import matchups",
  },
  {
    id: "auto-schedule",
    label: "Auto Schedule",
    icon: CalendarClock,
    description: "Automatically generate balanced schedules for divisions",
  },
  {
    id: "matchups",
    label: "Matchups",
    icon: Users2,
    description: "View opponent history and matchup frequency",
  },
  {
    id: "scores",
    label: "Scores",
    icon: ListChecks,
    description: "Enter and manage match scores in bulk",
  },
  {
    id: "seasons",
    label: "Season",
    icon: Calendar,
    description: "Configure season settings, dates, and champions",
  },
  {
    id: "teams",
    label: "Teams",
    icon: Users,
    description: "Add, edit, and manage teams and their divisions",
  },
  {
    id: "pending-matches",
    label: "Pending",
    icon: Clock,
    description: "Review and approve player-submitted scores",
  },
  {
    id: "hero-cards",
    label: "Hero",
    icon: LayoutGrid,
    description: "Manage homepage hero cards and announcements",
  },
  {
    id: "blind-draw",
    label: "Blind Draw",
    icon: Shuffle,
    description: "View and manage blind draw event signups",
  },
];

const tips = [
  "Use Auto Schedule after setting up timeslots for best results",
  "Review pending scores weekly to keep standings current",
  "Create playoff brackets after the regular season ends",
  "Update hero cards to highlight upcoming events",
];

const GettingStartedTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Getting Started</h2>
        <p className="text-muted-foreground mt-1">
          A quick guide to managing your 717REC league
        </p>
      </div>

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            League Setup Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflowSteps.map((item, index) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {item.step}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.tab}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
                {index < workflowSteps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tab Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Admin Tabs Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {tabDescriptions.map((tab) => (
              <div
                key={tab.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="p-2 rounded-md bg-background">
                  <tab.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{tab.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {tab.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {tips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
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
