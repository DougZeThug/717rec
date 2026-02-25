import React from 'react';

import { HeroCard } from '@/types/heroCard';

interface FlyerHeroCardProps {
  card: HeroCard;
}

const FlyerHeroCard: React.FC<FlyerHeroCardProps> = ({ card }) => {
  if (!card.image_url) return null;

  const image = (
    <img
      src={card.image_url}
      alt={card.title || 'Event flyer'}
      className="w-full h-auto rounded-xl shadow-lg"
      loading="eager"
    />
  );

  if (card.cta_url) {
    return (
      <a
        href={card.cta_url}
        target={card.cta_url.startsWith('http') ? '_blank' : undefined}
        rel={card.cta_url.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="block max-w-3xl mx-auto hover:opacity-95 transition-opacity"
      >
        {image}
      </a>
    );
  }

  return <div className="max-w-3xl mx-auto">{image}</div>;
};

export default FlyerHeroCard;
