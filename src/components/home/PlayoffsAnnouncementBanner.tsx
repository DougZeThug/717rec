
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";

const PlayoffsAnnouncementBanner: React.FC = () => {
  return (
    <section className={cn(
      "py-8 md:py-12 mx-4 md:mx-0 rounded-xl shadow-lg mb-6",
      "bg-gradient-to-r from-orange-500 via-red-500 to-orange-600",
      "relative overflow-hidden",
      animations.fadeIn
    )}>
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-red-600/20" />
      
      <div className="relative z-10 text-center text-white px-6">
        <div className="flex justify-center items-center gap-2 mb-6">
          <Trophy className="w-8 h-8 text-yellow-300 animate-pulse" />
          <h2 className="text-3xl md:text-4xl font-bebas uppercase tracking-wide">
            Championship week bracket!
          </h2>
          <Star className="w-8 h-8 text-yellow-300 animate-pulse" />
        </div>
        
        <Button
          asChild
          size="lg"
          className={cn(
            "bg-white text-orange-600 hover:bg-gray-100 font-bold text-lg px-8 py-3",
            "shadow-lg hover:shadow-xl transition-all duration-200",
            "hover:scale-105 active:scale-95"
          )}
        >
          <Link to="/playoffs" className="flex items-center gap-2">
            <Trophy size={24} />
            View Playoffs
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default PlayoffsAnnouncementBanner;
