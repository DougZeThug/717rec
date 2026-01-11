import React from 'react';

import { usePlayoffPageData } from '@/components/playoffs/hooks/usePlayoffPageData';
import PlayoffPageLayout from '@/components/playoffs/layout/PlayoffPageLayout';

const Playoffs = () => {
  const data = usePlayoffPageData();

  return <PlayoffPageLayout data={data} />;
};

export default Playoffs;
