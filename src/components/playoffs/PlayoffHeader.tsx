import React from 'react';

import PageHeader from '@/components/layout/PageHeader';

const PlayoffHeader: React.FC = () => {
  return (
    <PageHeader
      title="Playoffs"
      description="Tournament brackets and playoff schedules"
      className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6"
    />
  );
};

export default PlayoffHeader;
