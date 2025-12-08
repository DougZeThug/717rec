import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, History, Trophy, Shuffle, Calendar, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroCard } from "@/types/heroCard";

interface StandardHeroCardProps {
  card: HeroCard;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  History,
  Trophy,
  Shuffle,
  Calendar,
  Star,
  ChevronRight,
};

const StandardHeroCard: React.FC<StandardHeroCardProps> = ({ card }) => {
  const Icon = card.icon_name ? iconMap[card.icon_name] : null;

  const content = (
    <div className="relative flex items-center justify-center gap-3 px-6 py-4">
      {Icon && <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />}
      <span className="font-semibold text-lg">{card.title}</span>
      {card.cta_url && <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />}
    </div>
  );

  const baseClasses = cn(
    "group relative block w-full",
    card.background_color,
    card.text_color,
    "transition-all duration-200",
    "rounded-lg shadow-md hover:shadow-lg",
    "overflow-hidden"
  );

  if (card.cta_url) {
    // Handle both internal and external links
    if (card.cta_url.startsWith('http')) {
      return (
        <a
          href={card.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className={baseClasses}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          {content}
        </a>
      );
    }
    
    return (
      <Link to={card.cta_url} className={baseClasses}>
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        {content}
      </Link>
    );
  }

  return (
    <div className={baseClasses}>
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      {content}
    </div>
  );
};

export default StandardHeroCard;
