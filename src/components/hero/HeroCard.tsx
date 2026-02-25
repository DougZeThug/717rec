import React from 'react';

import { HeroCard as HeroCardType } from '@/types/heroCard';

import AnnouncementHeroCard from './AnnouncementHeroCard';
import ChampionsHeroCard from './ChampionsHeroCard';
import EventHeroCard from './EventHeroCard';
import FlyerHeroCard from './FlyerHeroCard';
import ParticipationHeroCard from './ParticipationHeroCard';
import RequestHeroCard from './RequestHeroCard';
import StandardHeroCard from './StandardHeroCard';

interface HeroCardProps {
  card: HeroCardType;
}

const HeroCard: React.FC<HeroCardProps> = ({ card }) => {
  switch (card.card_type) {
    case 'champions':
      return <ChampionsHeroCard card={card} />;
    case 'event':
      return <EventHeroCard card={card} />;
    case 'announcement':
      return <AnnouncementHeroCard card={card} />;
    case 'participation':
      return <ParticipationHeroCard />;
    case 'request':
      return <RequestHeroCard card={card} />;
    case 'flyer':
      return <FlyerHeroCard card={card} />;
    default:
      return <StandardHeroCard card={card} />;
  }
};

export default HeroCard;
