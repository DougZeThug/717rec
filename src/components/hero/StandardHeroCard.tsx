import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroCard } from "@/types/heroCard";
import { HERO_ICON_MAP } from "@/constants/heroCardPresets";
import { motion } from "framer-motion";

interface StandardHeroCardProps {
  card: HeroCard;
}

const StandardHeroCard: React.FC<StandardHeroCardProps> = ({ card }) => {
  const Icon = card.icon_name ? HERO_ICON_MAP[card.icon_name] : null;

  const content = (
    <div className="relative flex items-center justify-center gap-3 px-6 py-4">
      {Icon && <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />}
      <span className="font-bebas uppercase tracking-wide text-lg">{card.title}</span>
      {card.cta_url && <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />}
    </div>
  );

  const baseClasses = cn(
    "group relative block w-full",
    card.background_color,
    card.text_color,
    "transition-all duration-200",
    "rounded-xl shadow-md hover:shadow-lg",
    "border-t-[3px] border-t-blue-500 dark:border-t-blue-400",
    "border border-border/30",
    "overflow-hidden"
  );

  const cardWrapper = (children: React.ReactNode) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  );

  if (card.cta_url) {
    // Handle both internal and external links
    if (card.cta_url.startsWith('http')) {
      return cardWrapper(
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
    
    return cardWrapper(
      <Link to={card.cta_url} className={baseClasses}>
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        {content}
      </Link>
    );
  }

  return cardWrapper(
    <div className={baseClasses}>
      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      {content}
    </div>
  );
};

export default StandardHeroCard;
