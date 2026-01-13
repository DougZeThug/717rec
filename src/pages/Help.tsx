import { HelpCircle } from 'lucide-react';
import React from 'react';
import { Helmet } from 'react-helmet-async';

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
import { Accordion } from '@/components/ui/accordion';
import { useAdminAccess } from '@/hooks/useAdminAccess';

const Help: React.FC = () => {
  const { isAdminAccessGranted } = useAdminAccess();

  return (
    <>
      <Helmet>
        <title>Help & Getting Started | 717REC</title>
        <meta
          name="description"
          content="Learn how to use 717REC - your guide to league management, standings, schedules, and playoffs."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="h-8 w-8 text-primary" />
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
