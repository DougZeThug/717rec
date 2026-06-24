import { ChevronDown, ChevronUp, Expand, Minimize } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  useChallongeFallbackBrackets,
  useChallongeFallbackConfig,
} from '@/hooks/useChallongeFallback';

export const ChallongeFallback: React.FC = () => {
  const { data: config } = useChallongeFallbackConfig();
  const { data: brackets } = useChallongeFallbackBrackets();
  const [allExpanded, setAllExpanded] = useState(false);

  if (!brackets || brackets.length === 0) return null;

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
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {config?.header_title ?? 'Playoffs'}
          </h2>
          {config?.header_subtitle && (
            <p className="text-muted-foreground">{config.header_subtitle}</p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={toggleAll} className="flex items-center gap-2">
          {allExpanded ? (
            <>
              <Minimize className="size-4" />
              Collapse All
            </>
          ) : (
            <>
              <Expand className="size-4" />
              Expand All
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {brackets.map(({ id, slug, title }) => (
          <ChallongeEmbedWithToggle
            key={id}
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount flag
    setIsOpen(forceExpanded);
  }, [forceExpanded]);

  return (
    <div className="rounded-2xl shadow-lg overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left bg-muted border-b border-border hover:bg-muted/80 transition-colors duration-200 flex items-center justify-between group"
      >
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Click to view bracket
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="size-5 text-muted-foreground transition-transform duration-200" />
          ) : (
            <ChevronDown className="size-5 text-muted-foreground transition-transform duration-200" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="transition-all duration-300 ease-in-out">
          <iframe
            src={`https://challonge.com/${slug}/module?theme=8411&show_standings=1&show_final_results=1&multiplier=1.0`}
            width="100%"
            height="500"
            frameBorder="0"
            scrolling="auto"
            allowTransparency
            title={`${title} Bracket`}
            sandbox="allow-scripts allow-popups"
            className="border-0 w-full min-w-full"
            style={{
              colorScheme: 'normal',
              minWidth: '100%',
            }}
          />
        </div>
      )}
    </div>
  );
};
