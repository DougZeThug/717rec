import { HelpCircle } from 'lucide-react';
import React from 'react';

import { HelpAdminCTA } from '@/components/help/HelpAdminCTA';
import { HelpQuickLinks } from '@/components/help/HelpQuickLinks';
import { AccessibilitySection } from '@/components/help/sections/AccessibilitySection';
import { AdminSections } from '@/components/help/sections/admin/AdminSections';
import { FAQSection } from '@/components/help/sections/FAQSection';
import { HistorySection } from '@/components/help/sections/HistorySection';
import { MessageBoardSection } from '@/components/help/sections/MessageBoardSection';
import { PlayoffsSection } from '@/components/help/sections/PlayoffsSection';
import { ScheduleSection } from '@/components/help/sections/ScheduleSection';
import { StandingsSection } from '@/components/help/sections/StandingsSection';
import { TeamsSection } from '@/components/help/sections/TeamsSection';
import { WelcomeSection } from '@/components/help/sections/WelcomeSection';
import SeoHead from '@/components/seo/SeoHead';
import { Accordion } from '@/components/ui/accordion';
import { useAdminAccess } from '@/hooks/useAdminAccess';

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How is the Power Score calculated?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Power Score combines win percentage (70%) and strength of schedule (30%) to create a balanced ranking metric.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does SOS (Strength of Schedule) mean?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "SOS measures the average win percentage of all opponents you've faced. A higher SOS means you've played tougher competition.",
      },
    },
    {
      '@type': 'Question',
      name: 'How do playoff seeds work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Seeds are typically based on regular season standings or power rankings. Higher seeds get favorable bracket positions.',
      },
    },
    {
      '@type': 'Question',
      name: "Can I see my team's historical performance?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes! Visit the History page to view past seasons, or check your team's page for career statistics.",
      },
    },
  ],
};

const Help: React.FC = () => {
  const { isAdminAccessGranted } = useAdminAccess();

  return (
    <>
      <SeoHead
        title="Help & Getting Started | 717REC"
        description="Learn how 717REC standings, schedules, playoffs, and power scores work."
        path="/help"
        jsonLd={FAQ_JSON_LD}
      />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="size-8 text-primary" />
            <h1 className="text-3xl font-bold">Help & Getting Started</h1>
          </div>
          <p className="text-muted-foreground">
            Everything you need to know about using 717REC for league management and participation.
          </p>
        </div>

        <HelpQuickLinks />

        <Accordion type="single" collapsible className="space-y-4">
          <WelcomeSection />
          <StandingsSection />
          <ScheduleSection />
          <TeamsSection />
          <PlayoffsSection />
          <MessageBoardSection />
          <HistorySection />
          <AccessibilitySection />
          {isAdminAccessGranted && <AdminSections />}
          <FAQSection />
        </Accordion>

        {isAdminAccessGranted && <HelpAdminCTA />}
      </div>
    </>
  );
};

export default Help;
