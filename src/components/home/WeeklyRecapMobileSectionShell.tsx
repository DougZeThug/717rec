import React from 'react';

import { cn } from '@/lib/utils';
import { typeScale } from '@/styles/design-system';

function MobileSectionShell({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/40 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span
          className={cn(
            typeScale.caption,
            'font-semibold uppercase tracking-wider text-muted-foreground'
          )}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export default MobileSectionShell;
