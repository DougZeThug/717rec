import { ArrowRight, Newspaper } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { RecapEditionWithVersion } from '@/services/recapEditions/RecapEditionService';
import { typeScale } from '@/styles/design-system';

/**
 * The league's own published recap, shown in place of the live one.
 *
 * Reads the frozen facts, so it says exactly what was published — it does not
 * drift as later results come in.
 */
const PublishedRecapCard: React.FC<{ edition: RecapEditionWithVersion }> = ({ edition }) => {
  const { facts, version } = edition;
  const path = `/recap/${facts.seasonSlug}/week-${facts.weekNumber}`;

  return (
    <Card>
      <CardContent className="pt-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-muted-foreground" />
          <span
            className={cn(
              typeScale.caption,
              'font-semibold uppercase tracking-wider text-muted-foreground'
            )}
          >
            Week {facts.weekNumber} Recap
          </span>
        </div>

        {version.headline && <p className="text-lg font-semibold">{version.headline}</p>}

        {version.caption && (
          <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-line">
            {version.caption}
          </p>
        )}

        <Link
          to={path}
          className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
        >
          Read the full recap
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  );
};

export default PublishedRecapCard;
