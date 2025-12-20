import React, { useState, useEffect, useCallback } from "react";
import { BarChart3, Clock, Users, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Section {
  id: string;
  label: string;
  icon: React.ElementType;
}

const sections: Section[] = [
  { id: "stats", label: "Stats", icon: BarChart3 },
  { id: "matches", label: "Matches", icon: Clock },
  { id: "h2h", label: "H2H", icon: Users },
  { id: "achievements", label: "Awards", icon: Trophy },
];

interface TeamDetailsStickyNavProps {
  className?: string;
}

export const TeamDetailsStickyNav: React.FC<TeamDetailsStickyNavProps> = ({
  className,
}) => {
  const [activeSection, setActiveSection] = useState<string>("stats");
  const [isVisible, setIsVisible] = useState(false);

  // Track which section is currently in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-100px 0px -50% 0px",
        threshold: 0,
      }
    );

    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  // Show/hide sticky nav based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past 200px (roughly past the header)
      setIsVisible(window.scrollY > 200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial position
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 60; // Account for sticky nav height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 right-0 z-30",
        "bg-background/80 backdrop-blur-lg",
        "border-b border-border",
        "shadow-sm",
        className
      )}
    >
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-center gap-1 h-12 overflow-x-auto scrollbar-hide">
          {sections.map(({ id, label, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-3 py-2 rounded-md",
                  "text-sm font-medium transition-colors whitespace-nowrap",
                  "hover:bg-muted/50",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={isActive ? "font-semibold" : "font-normal"}>
                  {label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeSection"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </motion.div>
  );
};

export default TeamDetailsStickyNav;
