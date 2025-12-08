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
    <div className={cn(
      "relative overflow-hidden rounded-xl shadow-lg",
      card.background_color
    )}>
      {/* Animated background shimmer */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Decorative elements */}
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
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Icon className="w-6 h-6" />
          </motion.div>
        )}
        
        <div className="text-center">
          <h3 className="text-xl md:text-2xl font-bold">{card.title}</h3>
          {card.subtitle && (
            <p className="text-sm opacity-90 mt-1">{card.subtitle}</p>
          )}
        </div>
        
        {card.cta_url && (
          <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
        )}
      </div>
    </div>
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
