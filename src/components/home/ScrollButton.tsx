
import React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScrollButtonProps {
  targetId: string;
  label: string;
}

const ScrollButton: React.FC<ScrollButtonProps> = ({ targetId, label }) => {
  const scrollToSection = () => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className={cn(
        "flex items-center gap-1 text-cornhole-navy hover:bg-cornhole-cream/50",
        "active:scale-[0.95] transition-transform duration-150"
      )}
      onClick={scrollToSection}
    >
      <span>{label}</span>
      <ChevronDown size={16} />
    </Button>
  );
};

export default ScrollButton;
