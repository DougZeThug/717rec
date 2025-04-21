
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
    <section className="bg-gray-100 dark:bg-gray-800 py-6 px-4 mt-6">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-xl md:text-3xl font-semibold mb-3">{currentMessage.heading}</h2>
        <p className="text-base md:text-lg mb-5 max-w-2xl mx-auto text-gray-700 dark:text-gray-300">
          {currentMessage.subheading}
        </p>
        <Button 
          asChild 
          size="lg" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
        >
          <a href={currentMessage.buttonLink}>{currentMessage.buttonText}</a>
        </Button>
      </div>
    </section>
  );
};

export default CallToAction;
