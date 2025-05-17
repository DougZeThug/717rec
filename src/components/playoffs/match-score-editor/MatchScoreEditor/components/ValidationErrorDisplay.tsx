
import React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";

interface ValidationErrorDisplayProps {
  error: string | null;
}

const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({ error }) => {
  if (!error) return null;
  
  return (
    <div className={cn(
      "mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm flex items-start",
      animations.fadeIn
    )} style={{ animationDelay: '0.3s' }}>
      <AlertCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
};

export default React.memo(ValidationErrorDisplay);
