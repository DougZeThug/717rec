import { Settings } from 'lucide-react';
import React from 'react';

import { AdminBlindDrawSection } from './AdminBlindDrawSection';
import { AdminHeroSection } from './AdminHeroSection';
import { AdminPlayoffsSection } from './AdminPlayoffsSection';
import { AdminScoringSection } from './AdminScoringSection';
import { AdminSetupSection } from './AdminSetupSection';

export const AdminSections: React.FC = () => {
  return (
    <>
      <div className="pt-4 pb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Admin Guide
        </h2>
        <p className="text-sm text-muted-foreground mt-1">League management tools and workflows</p>
      </div>

      <AdminSetupSection />
      <AdminScoringSection />
      <AdminPlayoffsSection />
      <AdminHeroSection />
      <AdminBlindDrawSection />
    </>
  );
};
