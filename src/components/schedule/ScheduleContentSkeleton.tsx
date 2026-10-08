import { Calendar, CheckCircle, Clock, type LucideIcon } from 'lucide-react';
import React from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import DateMatchGroupSkeleton from './DateMatchGroupSkeleton';

interface ScheduleContentSkeletonProps {
  activeTab: string;
}

interface SkeletonTabProps {
  value: string;
  icon: LucideIcon;
  label: string;
}

const SkeletonTab: React.FC<SkeletonTabProps> = ({ value, icon: Icon, label }) => (
  <TabsTrigger
    value={value}
    className="flex-1 md:grow-0 data-[state=active]:bg-background px-2 md:px-6"
  >
    <div className="flex items-center justify-center">
      <Icon className="size-4 mr-2 shrink-0" />
      <span className="text-sm md:text-base md:whitespace-nowrap">{label}</span>
    </div>
  </TabsTrigger>
);

const ScheduleContentSkeleton: React.FC<ScheduleContentSkeletonProps> = ({ activeTab }) => {
  return (
    <Tabs value={activeTab} className="mb-6">
      {/* Keep these triggers in step with ScheduleContent's tab bar. The active
          tab is often 'timeslots' while data loads, and a missing trigger
          leaves no tab selected. */}
      <TabsList className="w-full md:min-w-[340px] font-inter bg-muted">
        <SkeletonTab value="timeslots" icon={Clock} label="Timeslots" />
        <SkeletonTab value="upcoming" icon={Calendar} label="Upcoming" />
        <SkeletonTab value="completed" icon={CheckCircle} label="Completed" />
      </TabsList>

      <TabsContent value={activeTab} className="mt-6 dark:bg-background">
        <div className="space-y-4">
          <DateMatchGroupSkeleton matchCount={3} />
          <DateMatchGroupSkeleton matchCount={2} />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default ScheduleContentSkeleton;
