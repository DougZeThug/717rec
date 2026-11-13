import React from 'react';

import { Separator } from '@/components/ui/separator';

export const InfoFooter: React.FC = () => {
  return (
    <>
      <Separator className="my-4" />

      <div className="text-xs text-muted-foreground mt-2">
        <p>* Teams are matched based on skill levels using power scores and win records</p>
        <p>
          * A time block with an odd number of teams (3 or more) stops Generate: move a team, or use
          Dual Match Mode on the Auto Schedule screen
        </p>
        <p>* A team alone in its time block is shown as unmatched (with a warning)</p>
        <p>* Generated schedule can be manually adjusted after applying to the form</p>
      </div>
    </>
  );
};
