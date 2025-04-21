
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Calendar } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="bg-cornhole-navy text-white pt-10 pb-8 md:py-14 px-3 md:px-4 transition-all duration-200">
      <div className="max-w-6xl mx-auto text-center flex flex-col items-center font-sans">
        <div className="flex justify-center mb-4 md:mb-6">
          <img 
            src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png" 
            alt="717 Rec Logo" 
            className="h-20 md:h-28 w-auto transition-all duration-200"
            style={{ maxHeight: 90, minHeight: 60 }} // Shrinked about 30%
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
            className="bg-cornhole-green hover:bg-cornhole-green/90 flex items-center gap-2 py-3 px-8 text-base md:text-lg font-semibold rounded-lg shadow"
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
            className="bg-cornhole-cream text-cornhole-navy border-cornhole-navy hover:bg-white hover:text-cornhole-navy flex items-center gap-2 py-3 px-8 text-base md:text-lg font-semibold rounded-lg shadow"
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
