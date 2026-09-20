import React from 'react';
import { Helmet } from 'react-helmet-async';

import { BASE_URL, DEFAULT_IMAGE } from './seoDefaults';

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  /** Absolute or root-relative preview image. Falls back to the league logo. */
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-route SEO head tags. Sets title, description, canonical, and OG/Twitter
 * tags pointing back at this page. Optionally injects JSON-LD structured data.
 */
const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  path,
  type = 'website',
  image,
  jsonLd,
}) => {
  const url = `${BASE_URL}${path}`;
  const rawImage = image ?? DEFAULT_IMAGE;
  const imageUrl = rawImage.startsWith('http') ? rawImage : `${BASE_URL}${rawImage}`;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  // A page that supplies its own artwork gets the big preview; the default
  // league logo does not deserve one.
  const twitterCard = image ? 'summary_large_image' : 'summary';

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={title} />
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      {ldArray.map((data, i) => (
        // skipcq: JS-0437
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};

export default SeoHead;
