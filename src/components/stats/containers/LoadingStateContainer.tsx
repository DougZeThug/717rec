import React from 'react';

import { TeamListSkeleton } from '@/components/teams/TeamListSkeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const LoadingStateContainer = () => {
  return (
    <div className="max-w-7xl mx-auto bg-background px-2 sm:px-4">
      <div className="mt-2 mb-1">
        <Skeleton className="h-8 w-64 mb-4" />
      </div>
      <div className="font-inter">
        <Card className="mb-4 bg-card text-card-foreground border border-border rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-0">
          <CardHeader className="pb-1.5 rounded-t-xl">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="p-4 pt-1 sm:pt-4">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 border-b border-gray-100 dark:border-gray-800"
                >
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                  <div className="ml-auto flex gap-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <Skeleton className="h-9 w-48 mx-auto" />
            </div>
          </CardContent>
        </Card>

        <div className="mb-5">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="bg-card">
                <CardHeader className="p-4 pb-0">
                  <Skeleton className="h-5 w-24 mb-1" />
                  <Skeleton className="h-7 w-16" />
                </CardHeader>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border border-border">
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card className="bg-card border border-border">
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <Card className="bg-card">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
            </CardHeader>
            <CardContent>
              <TeamListSkeleton viewMode="list" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoadingStateContainer;
