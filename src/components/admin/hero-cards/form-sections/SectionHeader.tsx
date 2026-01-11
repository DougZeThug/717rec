import React from 'react';

import { SectionHeaderProps } from './types';

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b">
    <Icon className="h-4 w-4 text-primary" />
    <h3 className="font-semibold text-sm">{title}</h3>
  </div>
);
