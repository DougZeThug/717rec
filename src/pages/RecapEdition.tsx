import { ArrowLeft } from 'lucide-react';
import React from 'react';
import { Link, useParams } from 'react-router';

import DivisionStandingsTable from '@/components/recap/DivisionStandingsTable';
import PowerRankingsTable from '@/components/recap/PowerRankingsTable';
import SeoHead from '@/components/seo/SeoHead';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecapEditionBySlug } from '@/hooks/useRecapEditions';

import NotFound from './NotFound';

/**
 * One published recap edition at its permanent address.
 *
 * Everything on this page comes from the frozen `facts` stored with the
 * version. It never re-queries matches, teams or snapshots, which is what makes
 * an old recap still describe the week it was written about.
 */

/**
 * React Router segments cannot be partial, so the route is registered as
 * `/recap/:seasonSlug/:week` and the `week-6` form is parsed here. The public
 * address is unchanged.
 */
const parseWeekSegment = (segment: string | undefined): number | null => {
  const match = /^week-(\d{1,2})$/.exec(segment ?? '');
  if (!match) return null;
  const week = Number(match[1]);
  return week >= 1 && week <= 60 ? week : null;
};

const formatDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

const RecapEdition: React.FC = () => {
  const { seasonSlug, week } = useParams<{ seasonSlug: string; week: string }>();
  const weekNumber = parseWeekSegment(week);

  const { data, isLoading, isError } = useRecapEditionBySlug(seasonSlug, weekNumber ?? undefined);

  if (weekNumber === null) return <NotFound />;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl flex flex-col gap-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) return <NotFound />;

  const { facts, version, edition } = data;
  const wasCorrected =
    edition.first_published_at !== null &&
    edition.published_at !== null &&
    edition.first_published_at !== edition.published_at;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <SeoHead
        title={`717REC — ${facts.seasonName} Week ${facts.weekNumber} Recap`}
        description={version.caption.slice(0, 155) || `Week ${facts.weekNumber} results.`}
        path={`/recap/${facts.seasonSlug}/week-${facts.weekNumber}`}
        type="article"
        image={version.graphic_url ?? undefined}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: version.headline || `Week ${facts.weekNumber} Recap`,
          datePublished: edition.first_published_at,
          dateModified: edition.published_at,
        }}
      />

      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        Home
      </Link>

      <header className="mb-6">
        <p className="text-sm uppercase tracking-wider text-muted-foreground">{facts.seasonName}</p>
        <h1 className="text-3xl font-bebas tracking-wide">Week {facts.weekNumber}</h1>
        {version.headline && <p className="text-lg mt-2">{version.headline}</p>}
        <p className="text-xs text-muted-foreground mt-3">
          Published {formatDate(edition.first_published_at)}
          {wasCorrected && ` · Corrected ${formatDate(edition.published_at)}`}
        </p>
      </header>

      {version.caption && (
        <Card className="mb-6">
          <CardContent className="pt-6 whitespace-pre-line leading-relaxed">
            {version.caption}
          </CardContent>
        </Card>
      )}

      {/*
        Above the division tables: the rankings cover every team, so a reader
        finds theirs here whichever division it is in. Editions published before
        power rankings existed simply have no powerRankings and show nothing.
      */}
      <PowerRankingsTable
        teams={facts.powerRankings ?? []}
        blurbs={(version.blurbs as Record<string, string> | null) ?? {}}
      />

      {facts.divisions.map((division) => (
        <DivisionStandingsTable key={division.divisionId} division={division} />
      ))}

      <p className="text-xs text-muted-foreground">
        These are the results as they stood at the end of week {facts.weekNumber}. Later corrections
        appear as a new version of this page.
      </p>
    </div>
  );
};

export default RecapEdition;
