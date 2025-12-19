
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const HeroSection = () => {
  return (
    <section 
      className={cn(
        "text-white py-6 md:py-16 px-4 transition-all duration-200 relative",
        "bg-gradient-to-br from-[#0f2647] via-cornhole-navy to-[#1d3761]"
      )}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 32px)" }}
    >
      
      {/* Simple gradient overlay - just one layer for better performance */}
      <div className="absolute inset-0 -z-10 opacity-30 bg-gradient-to-b from-black/5 to-transparent" />
      
      <div className="max-w-6xl mx-auto text-center flex flex-col items-center font-sans relative z-10">
        <div className="flex justify-center mb-3 md:mb-6">
          <img 
            src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png" 
            alt="717 Rec Logo" 
            width={96}
            height={96}
            fetchPriority="high"
            className="h-14 md:h-24 w-auto max-w-full transition-all duration-200 drop-shadow-sm"
          />
        </div>
        <h1 className={cn(
          "text-2xl md:text-5xl lg:text-6xl font-bebas uppercase tracking-wide font-normal mb-1 md:mb-2 leading-tight",
          "text-white"
        )}>
          717Rec
        </h1>
        <p className="text-base md:text-2xl mb-4 md:mb-8 max-w-2xl mx-auto font-sans font-light italic text-white/90">
          Where Bags Fly and Beers Flow.
        </p>
        
        {/* Mobile: Segmented control */}
        <div className="flex md:hidden w-full max-w-xs mx-auto">
          <Link 
            to="/stats" 
            className="flex-1 flex items-center justify-center gap-1.5 px-4 min-h-11 bg-white/20 backdrop-blur-sm text-white font-medium text-sm rounded-l-lg border border-white/30 border-r-0 hover:bg-white/30 transition-colors"
          >
            <Trophy size={16} className="shrink-0" />
            Standings
          </Link>
          <Link 
            to="/schedule" 
            className="flex-1 flex items-center justify-center gap-1.5 px-4 min-h-11 bg-white/20 backdrop-blur-sm text-white font-medium text-sm rounded-r-lg border border-white/30 hover:bg-white/30 transition-colors"
          >
            <Calendar size={16} className="shrink-0" />
            Schedule
          </Link>
        </div>
        
        {/* Desktop: Original buttons */}
        <div className="hidden md:flex gap-4 justify-center items-center w-full max-w-md mx-auto">
          <Button
            asChild
            size="lg"
            variant="blueOrange"
            className="flex items-center gap-2"
          >
            <Link to="/stats" className="flex items-center gap-2">
              <Trophy size={20} className="shrink-0" />
              View Standings
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="blueOrange" 
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30"
          >
            <Link to="/schedule" className="flex items-center gap-2">
              <Calendar size={20} className="shrink-0"/> 
              See Schedule
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
