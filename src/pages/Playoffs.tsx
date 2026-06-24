import React from 'react';

import { usePlayoffPageData } from '@/components/playoffs/hooks/usePlayoffPageData';
import PlayoffPageLayout from '@/components/playoffs/layout/PlayoffPageLayout';
import SeoHead from '@/components/seo/SeoHead';

const Playoffs = () => {
  const data = usePlayoffPageData();

  return (
    <>
      <SeoHead
        title="Playoff Brackets | 717REC"
        description="Live and historical 717REC playoff brackets across every division with match results and seedings."
        path="/playoffs"
      />
      <PlayoffPageLayout data={data} />
    </>
  );
};

export default Playoffs;
