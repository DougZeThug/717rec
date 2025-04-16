
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ScrollButton from "./ScrollButton";

const HeroSection = () => {
  return (
    <section className="bg-cornhole-navy text-white py-16 md:py-24 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png" 
            alt="717 Rec Logo" 
            className="h-32 md:h-40 w-auto"
          />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
          717 Rec
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
          Where Bags Fly and Beers Flow.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild size="lg" className="bg-cornhole-green hover:bg-cornhole-green/90">
            <Link to="/teams">View Teams</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-cornhole-navy">
            <Link to="/schedule">See Schedule</Link>
          </Button>
        </div>
        
        <div className="flex justify-center mt-10 gap-6">
          <ScrollButton targetId="top-teams-section" label="Top Teams" />
          <ScrollButton targetId="recent-matches-section" label="Recent Matches" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
