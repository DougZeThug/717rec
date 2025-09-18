
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Expand, Minimize, ChevronDown, ChevronUp } from "lucide-react";

const brackets = [
  { slug: "o4q3dyy2", title: "Competitive" },
  { slug: "e23j3yxy", title: "Intermediate 1" },
  { slug: "pkem4pw9", title: "Intermediate 2" },
  { slug: "bnqell8t", title: "Recreational" },
];

export const ChallongeFallback: React.FC = () => {
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleAll = () => {
    setAllExpanded(!allExpanded);
    // Force all brackets to update their state
    const event = new CustomEvent('toggleAllBrackets', { detail: !allExpanded });
    window.dispatchEvent(event);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">2025 Summer 2 Playoffs</h2>
          <p className="text-muted-foreground">Live tournament brackets - click any bracket to view details</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAll}
          className="flex items-center gap-2"
        >
          {allExpanded ? (
            <>
              <Minimize className="h-4 w-4" />
              Collapse All
            </>
          ) : (
            <>
              <Expand className="h-4 w-4" />
              Expand All
            </>
          )}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {brackets.map(({ slug, title }) => (
          <ChallongeEmbedWithToggle 
            key={slug} 
            slug={slug} 
            title={title} 
            forceExpanded={allExpanded}
          />
        ))}
      </div>
    </section>
  );
};

// Wrapper component to handle the expand all functionality
const ChallongeEmbedWithToggle: React.FC<{ 
  slug: string; 
  title: string; 
  forceExpanded: boolean;
}> = ({ slug, title, forceExpanded }) => {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    const handleToggleAll = (event: CustomEvent) => {
      setIsOpen(event.detail);
    };

    window.addEventListener('toggleAllBrackets', handleToggleAll as EventListener);
    return () => {
      window.removeEventListener('toggleAllBrackets', handleToggleAll as EventListener);
    };
  }, []);

  React.useEffect(() => {
    setIsOpen(forceExpanded);
  }, [forceExpanded]);

  return (
    <div className="rounded-2xl shadow-lg overflow-hidden bg-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left bg-muted border-b border-border hover:bg-muted/80 transition-colors duration-200 flex items-center justify-between group"
      >
        <h3 className="text-lg font-semibold text-foreground">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Click to view bracket
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="transition-all duration-300 ease-in-out">
          <iframe
            src={`https://challonge.com/${slug}/module?theme=8411&show_standings=1&show_final_results=1`}
            width="100%"
            height="500"
            frameBorder="0"
            scrolling="auto"
            allowTransparency
            title={`${title} Bracket`}
            className="border-0"
          />
        </div>
      )}
    </div>
  );
};
