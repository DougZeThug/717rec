import React from 'react';

import { Separator } from '@/components/ui/separator';

export const InfoFooter: React.FC = () => {
  return (
    <>
      <Separator className="my-4" />

      <div className="text-xs text-muted-foreground mt-2">
        <p>* Teams are matched based on skill levels using power scores and win records</p>
        <p>* Teams with odd numbers will have some teams unmatched (shown with warning)</p>
        <p>* Generated schedule can be manually adjusted after applying to the form</p>
      </div>
    </>
  );
};
