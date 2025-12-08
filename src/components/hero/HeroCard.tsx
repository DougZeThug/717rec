import React from "react";
import { HeroCard as HeroCardType } from "@/types/heroCard";
import StandardHeroCard from "./StandardHeroCard";
import ChampionsHeroCard from "./ChampionsHeroCard";
import EventHeroCard from "./EventHeroCard";
import AnnouncementHeroCard from "./AnnouncementHeroCard";

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
    default:
      return <StandardHeroCard card={card} />;
  }
};

export default HeroCard;
