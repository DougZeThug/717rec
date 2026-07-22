import React, { useMemo } from 'react';

import { usePlayoffPageData } from '@/components/playoffs/hooks/usePlayoffPageData';
import PlayoffPageLayout from '@/components/playoffs/layout/PlayoffPageLayout';
import SeoHead from '@/components/seo/SeoHead';
import { buildBreadcrumbJsonLd } from '@/utils/breadcrumbJsonLd';

const Playoffs = () => {
  const data = usePlayoffPageData();

  const breadcrumbJsonLd = useMemo(
    () =>
      buildBreadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Playoffs', path: '/playoffs' },
      ]),
    []
  );

  return (
    <>
      <SeoHead
        title="Playoff Brackets | 717REC"
        description="Live and historical 717REC playoff brackets across every division with match results and seedings."
        path="/playoffs"
        jsonLd={breadcrumbJsonLd}
      />
      <PlayoffPageLayout data={data} />
    </>
  );
};

export default Playoffs;
