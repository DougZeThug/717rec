
import React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      className="flex items-center gap-1 text-cornhole-navy hover:bg-cornhole-cream/50"
      onClick={scrollToSection}
    >
      <span>{label}</span>
      <ChevronDown size={16} />
    </Button>
  );
};

export default ScrollButton;
