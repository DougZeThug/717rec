import React from 'react';

import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface HelpAccordionItemProps {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

export const HelpAccordionItem: React.FC<HelpAccordionItemProps> = ({
  value,
  icon: Icon,
  title,
  children,
}) => {
  return (
    <AccordionItem value={value} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-2 pb-4">
        <div className="space-y-4 text-sm">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
};
