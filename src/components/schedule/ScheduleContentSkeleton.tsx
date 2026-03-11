import { Calendar, CheckCircle } from 'lucide-react';
import React from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import DateMatchGroupSkeleton from './DateMatchGroupSkeleton';

interface ScheduleContentSkeletonProps {
  activeTab: string;
}

const ScheduleContentSkeleton: React.FC<ScheduleContentSkeletonProps> = ({ activeTab }) => {
  return (
    <Tabs value={activeTab} className="mb-6">
      <TabsList className="w-full md:min-w-[340px] font-inter bg-gray-200 dark:bg-gray-700">
        <TabsTrigger
          value="upcoming"
          className="flex-1 md:flex-grow-0 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 px-2 md:px-6"
        >
          <div className="flex items-center justify-center">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm md:text-base md:whitespace-nowrap">Upcoming Matches</span>
          </div>
        </TabsTrigger>
        <TabsTrigger
          value="completed"
          className="flex-1 md:flex-grow-0 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 px-2 md:px-6"
        >
          <div className="flex items-center justify-center">
            <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="text-sm md:text-base md:whitespace-nowrap">Completed Matches</span>
          </div>
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab} className="mt-6 dark:bg-gray-900">
        <div className="space-y-4">
          <DateMatchGroupSkeleton matchCount={3} />
          <DateMatchGroupSkeleton matchCount={2} />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default ScheduleContentSkeleton;
