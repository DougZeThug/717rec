
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar } from "lucide-react";
import ThemeToggle from "@/components/ui/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import { typography } from "@/styles/design-system";

const HeroSection = () => {
  return (
    <section 
      className={cn(
        "text-white py-10 md:py-16 px-4 transition-all duration-200 relative",
        "bg-gradient-to-b from-cornhole-navy to-[#1d3761]"
      )}
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 48px)" }}
    >
      {/* Theme toggle positioned in the top-right corner */}
      <div className="absolute top-4 right-4">
        <ThemeToggle 
          variant="outline" 
          className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-white/20"
        />
      </div>
      
      {/* Simple gradient overlay - just one layer for better performance */}
      <div className="absolute inset-0 -z-10 opacity-30 bg-gradient-to-b from-black/5 to-transparent" />
      
      <div className="max-w-6xl mx-auto text-center flex flex-col items-center font-sans relative z-10">
        <div className="flex justify-center mb-4 md:mb-6">
          <img 
            src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png" 
            alt="717 Rec Logo" 
            className="h-16 md:h-24 w-auto transition-all duration-200 drop-shadow-sm"
          />
        </div>
        <h1 className={cn(
          "text-3xl md:text-5xl lg:text-6xl font-bebas uppercase tracking-wide font-normal mb-2 leading-tight",
          "text-white" // Solid color instead of gradient for better readability
        )}>
          717Rec
        </h1>
        <p className="text-lg md:text-2xl mb-6 md:mb-8 max-w-2xl mx-auto font-sans font-light italic text-white/90">
          Where Bags Fly and Beers Flow.
        </p>
        <div className="flex flex-col xs:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto">
          <Button
            asChild
            size="lg"
            variant="blueOrange"
            className="w-full xs:w-auto flex items-center gap-2"
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
            className="w-full xs:w-auto flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30"
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
