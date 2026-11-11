import { LucideIcon } from 'lucide-react';
import React from 'react';

interface AdminSectionWrapperProps {
  title: string;
  icon?: LucideIcon;
  emoji?: string;
  children: React.ReactNode;
}

const AdminSectionWrapper = ({ title, icon: Icon, emoji, children }: AdminSectionWrapperProps) => {
  return (
    // On a phone the admin page already pads the screen (16px). Padding here
    // too put these sections 16px further in than the Sections bar. From md up
    // the padding stays as it was.
    <div className="md:px-4 md:py-6 max-w-[1200px] mx-auto w-full">
      <div className="flex items-center gap-2 mb-4 md:mb-6">
        {Icon && <Icon className="size-6 text-muted-foreground" />}
        {emoji && <span className="text-xl">{emoji}</span>}
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
};

export default AdminSectionWrapper;
