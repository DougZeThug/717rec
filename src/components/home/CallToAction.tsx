
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// Define the possible CTA messages
const ctaMessages = [
  {
    heading: "Join The League Today!",
    subheading: "Looking to compete in the next season? Contact us to register your team and join the excitement!",
    buttonText: "Register Now",
    buttonLink: "mailto:register@bagitupleague.com"
  },
  {
    heading: "Check Out The Standings",
    subheading: "See who's leading the league and follow your favorite teams as they climb the rankings!",
    buttonText: "View Standings",
    buttonLink: "/stats"
  },
  {
    heading: "New Season Starting Soon",
    subheading: "Get your team registered for the upcoming season. Limited spots available!",
    buttonText: "Learn More",
    buttonLink: "/schedule"
  }
];

const CallToAction = () => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Rotate messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % ctaMessages.length);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const currentMessage = ctaMessages[currentMessageIndex];

  return (
    <section className="bg-cornhole-wood wood-texture text-white py-8 px-4 mt-8">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">{currentMessage.heading}</h2>
        <p className="text-base md:text-lg mb-6 max-w-2xl mx-auto">
          {currentMessage.subheading}
        </p>
        <Button asChild size="lg" className="bg-white text-cornhole-wood hover:bg-cornhole-cream hover:text-cornhole-navy">
          <a href={currentMessage.buttonLink}>{currentMessage.buttonText}</a>
        </Button>
      </div>
    </section>
  );
};

export default CallToAction;
