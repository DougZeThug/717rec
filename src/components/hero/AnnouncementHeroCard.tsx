import React from "react";
import { Link } from "react-router-dom";
import { Trophy, ChevronRight, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeroCard } from "@/types/heroCard";
import { motion } from "framer-motion";

interface AnnouncementHeroCardProps {
  card: HeroCard;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Star,
  Sparkles,
  ChevronRight,
};

const AnnouncementHeroCard: React.FC<AnnouncementHeroCardProps> = ({ card }) => {
  const Icon = card.icon_name ? iconMap[card.icon_name] : Trophy;

  const content = (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn(
        "relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-200",
        "border-t-4 border-t-amber-500 dark:border-t-amber-400",
        "border border-white/20",
        card.background_color
      )}>
        {/* Static inner glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />
        
        {/* Decorative elements - static */}
        <div className="absolute top-2 left-4 opacity-30">
          {Icon && <Icon className="w-8 h-8" />}
        </div>
        <div className="absolute bottom-2 right-4 opacity-30">
          {Icon && <Icon className="w-8 h-8" />}
        </div>
        
        <div className={cn(
          "relative z-10 flex items-center justify-center gap-3 px-6 py-5",
          card.text_color
        )}>
          {Icon && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Icon className="w-6 h-6" />
            </motion.div>
          )}
          
          <div className="text-center">
            <h3 className="text-xl md:text-2xl font-bebas uppercase tracking-wide">{card.title}</h3>
            {card.subtitle && (
              <p className="text-sm font-inter opacity-90 mt-1">{card.subtitle}</p>
            )}
          </div>
          
          {card.cta_url && (
            <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
          )}
        </div>
      </div>
    </motion.div>
  );

  if (card.cta_url) {
    if (card.cta_url.startsWith('http')) {
      return (
        <a
          href={card.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          {content}
        </a>
      );
    }
    
    return (
      <Link to={card.cta_url} className="group block">
        {content}
      </Link>
    );
  }

  return content;
};

export default AnnouncementHeroCard;
