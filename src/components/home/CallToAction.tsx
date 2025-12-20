import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";
import { motion } from "framer-motion";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";

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
  const { shouldApplyWinter } = useSeasonalTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % ctaMessages.length);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const currentMessage = ctaMessages[currentMessageIndex];

  return (
    <section className={cn(
      "relative py-8 px-4 mt-6 overflow-hidden border-t border-b rounded-xl",
      shouldApplyWinter
        ? "winter-card-full border-cyan-500/20"
        : cn(
            "border-gray-200 dark:border-gray-700/50",
            "bg-gradient-to-br from-blue-50/40 via-white to-orange-50/50",
            "dark:from-gray-800/90 dark:via-gray-800/70 dark:to-amber-900/10"
          ),
      animations.fadeIn
    )}>
      {/* Enhanced gradient background elements */}
      <div className={cn(
        "absolute inset-0 -z-10",
        shouldApplyWinter
          ? "bg-gradient-to-br from-cyan-900/10 via-transparent to-violet-900/10"
          : "bg-gradient-to-br from-blue-50/20 via-transparent to-orange-100/30 dark:from-blue-900/10 dark:to-amber-900/5"
      )} />
      
      {/* Animated gradient orbs in the background */}
      <div className={cn(
        "absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -z-10",
        shouldApplyWinter ? "bg-cyan-500/5" : "bg-blue-500/5"
      )} />
      <div className={cn(
        "absolute bottom-0 left-0 w-60 h-60 rounded-full blur-3xl -z-10",
        shouldApplyWinter ? "bg-violet-500/5" : "bg-orange-500/5"
      )} />
      
      <div className="max-w-5xl mx-auto text-center">
        <motion.h2 
          className={cn(
            "text-xl md:text-3xl font-semibold mb-3 bg-clip-text text-transparent",
            shouldApplyWinter
              ? "bg-gradient-to-r from-cyan-300 via-cyan-200 to-violet-300"
              : cn(
                  "bg-gradient-to-r from-blue-600 via-blue-700 to-amber-600",
                  "dark:from-blue-500 dark:via-blue-400 dark:to-amber-500"
                )
          )}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          key={`heading-${currentMessageIndex}`}
        >
          {currentMessage.heading}
        </motion.h2>
        <motion.p 
          className={cn(
            "text-base md:text-lg mb-5 max-w-2xl mx-auto",
            shouldApplyWinter ? "text-cyan-100/80" : "text-gray-700 dark:text-gray-300"
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          key={`subheading-${currentMessageIndex}`}
        >
          {currentMessage.subheading}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            asChild 
            size="lg" 
            className={cn(
              "shadow-md hover:shadow-lg transition-all duration-200 font-semibold",
              shouldApplyWinter
                ? "btn-winter-primary"
                : cn(
                    "text-white",
                    "bg-gradient-to-br from-blue-600 via-blue-700 to-amber-600/90",
                    "hover:from-blue-500 hover:via-blue-600 hover:to-amber-500/90"
                  )
            )}
          >
            <a href={currentMessage.buttonLink}>{currentMessage.buttonText}</a>
          </Button>
        </motion.div>
        
        {/* Navigation dots */}
        <div className="flex justify-center gap-0 mt-5">
          {ctaMessages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentMessageIndex(index)}
              className="p-2 flex items-center justify-center"
              aria-label={`Go to message ${index + 1}`}
            >
              <span
                className={cn(
                  "block w-2 h-2 rounded-full transition-all duration-300",
                  index === currentMessageIndex
                    ? (shouldApplyWinter ? "bg-cyan-400 w-6" : "bg-blue-600 dark:bg-blue-400 w-6")
                    : (shouldApplyWinter 
                        ? "bg-cyan-700 hover:bg-cyan-600" 
                        : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500")
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
