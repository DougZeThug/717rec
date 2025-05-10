
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Calendar } from "lucide-react";
import ThemeToggle from "@/components/ui/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";

const HeroSection = () => {
  return (
    <section 
      className={cn(
        "text-white py-10 md:py-16 px-3 md:px-4 transition-all duration-200 md:pt-10 relative",
        gradients.section.hero
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
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cornhole-navy via-[#2e5082] to-cornhole-navy opacity-90" />
      
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 -z-5 bg-gradient-to-t from-cornhole-navy/10 to-transparent" />
      <div className="absolute top-0 left-0 w-full h-40 -z-5 bg-gradient-to-b from-black/10 to-transparent" />
      
      <div className="max-w-6xl mx-auto text-center flex flex-col items-center font-sans relative z-10">
        <div className="flex justify-center mb-4 md:mb-6">
          <img 
            src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png" 
            alt="717 Rec Logo" 
            className="h-20 md:h-28 w-auto transition-all duration-200 drop-shadow-md"
            style={{ maxHeight: 90, minHeight: 60 }}
          />
        </div>
        <h1 className="text-[2.75rem] md:text-5xl lg:text-6xl font-bebas uppercase tracking-wide font-normal mb-1 leading-[1.05] drop-shadow-sm">
          717Rec
        </h1>
        <p className="text-lg md:text-2xl mb-4 md:mb-8 max-w-2xl mx-auto font-sans font-light italic opacity-90">
          Where Bags Fly and Beers Flow.
        </p>
        <div className="flex flex-col xs:flex-row gap-3 xs:gap-5 justify-center items-center w-full max-w-xs mx-auto md:flex-row">
          <Button
            asChild
            size="lg"
            className={cn(
              "flex items-center gap-2 py-3 px-8 text-base md:text-lg font-semibold rounded-lg shadow-md w-full xs:w-auto dark:shadow-lg",
              "bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white"
            )}
            style={{ minWidth: 160 }}
          >
            <Link to="/teams" className="flex items-center gap-2">
              <Users size={22} className="inline align-middle mr-1" />
              View Teams
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 flex items-center gap-2 py-3 px-8 text-base md:text-lg font-semibold rounded-lg shadow-md w-full xs:w-auto"
            style={{ minWidth: 170 }}
          >
            <Link to="/schedule" className="flex items-center gap-2">
              <Calendar size={20} className="inline align-middle mr-1"/> 
              See Schedule
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
