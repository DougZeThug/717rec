
import React from "react";
import { LucideIcon } from "lucide-react";

interface AdminSectionWrapperProps {
  title: string;
  icon?: LucideIcon;
  emoji?: string;
  children: React.ReactNode;
}

const AdminSectionWrapper = ({ 
  title, 
  icon: Icon, 
  emoji, 
  children 
}: AdminSectionWrapperProps) => {
  return (
    <div className="px-4 py-6 max-w-[1200px] mx-auto w-full">
      <div className="flex items-center gap-2 mb-6">
        {Icon && <Icon className="h-6 w-6 text-muted-foreground" />}
        {emoji && <span className="text-xl">{emoji}</span>}
        <h2 className="text-2xl font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
};

export default AdminSectionWrapper;
