import { HelpCircle } from 'lucide-react';
import React from 'react';

import { usePowerScoreWeights } from '@/hooks/usePowerScoreWeights';

import { HelpAccordionItem } from '../HelpAccordionItem';

export const FAQSection: React.FC = () => {
  const weights = usePowerScoreWeights();
  return (
    <HelpAccordionItem value="faq" icon={HelpCircle} title="Frequently Asked Questions">
      <div>
        <p className="font-medium">How is the Power Score calculated?</p>
        <p className="text-muted-foreground mt-1">
          Power Score is a 0-100 rating made of three parts: {weights.win}% match win rate,{' '}
          {weights.sos}% strength of schedule, and {weights.game}% game win rate. Wins and games are
          weighted by the division of the opponent you played, so beating a stronger team is worth
          more than beating a weaker one.
        </p>
      </div>
      <div>
        <p className="font-medium">What does SOS (Strength of Schedule) mean?</p>
        <p className="text-muted-foreground mt-1">
          SOS is the average division strength of the opponents you&apos;ve faced. A higher SOS
          means you&apos;ve played tougher competition, and it raises your Power Score &mdash; which
          is why two teams with the same record can be ranked differently.
        </p>
      </div>
      <div>
        <p className="font-medium">How do playoff seeds work?</p>
        <p className="text-muted-foreground mt-1">
          Seeds are typically based on regular season standings or power rankings. Higher seeds get
          favorable bracket positions.
        </p>
      </div>
      <div>
        <p className="font-medium">Can I see my team&apos;s historical performance?</p>
        <p className="text-muted-foreground mt-1">
          Yes! Visit the History page to view past seasons, or check your team&apos;s page for
          career statistics.
        </p>
      </div>
    </HelpAccordionItem>
  );
};
