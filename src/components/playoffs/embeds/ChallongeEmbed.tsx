
import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Props { 
  slug: string; 
  title: string; 
}

export const ChallongeEmbed: React.FC<Props> = ({ slug, title }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-2xl shadow-lg overflow-hidden bg-white">
      <CollapsibleTrigger className="w-full p-4 text-left bg-gray-100 border-b border-gray-200 hover:bg-gray-200 transition-colors duration-200 flex items-center justify-between group">
        <h3 className="text-lg font-semibold text-gray-900">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="text-sm text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Click to view bracket
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600 transition-transform duration-200" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600 transition-transform duration-200" />
          )}
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent className={cn(
        "transition-all duration-300 ease-in-out",
        "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      )}>
        <iframe
          src={`https://challonge.com/${slug}/module${slug === '3z8nyjfd' ? '?theme=8411' : ''}`}
          width="100%"
          height="500"
          frameBorder="0"
          scrolling="auto"
          allowTransparency
          title={`${title} Bracket`}
          className="border-0"
        />
      </CollapsibleContent>
    </Collapsible>
  );
};
