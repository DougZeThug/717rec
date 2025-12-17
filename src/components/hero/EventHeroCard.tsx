import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shuffle, Clock, DollarSign, Trophy, Calendar, Timer, Medal, Users } from "lucide-react";
import { motion } from "framer-motion";
import { HeroCard } from "@/types/heroCard";
import { cn } from "@/lib/utils";
import BlindDrawSignupForm from "@/components/home/BlindDrawSignupForm";
import { useBlindDrawSignupCount } from "@/hooks/useBlindDrawSignups";

interface EventHeroCardProps {
  card: HeroCard;
}

interface Winner {
  place: number;
  names: string;
}

interface WeekWinners {
  week: number;
  winners: Winner[];
}

const EventHeroCard: React.FC<EventHeroCardProps> = ({ card }) => {
  const [checkInCountdown, setCheckInCountdown] = useState({ text: "", percent: 0 });
  const [startCountdown, setStartCountdown] = useState({ text: "", percent: 0 });

  const metadata = card.metadata || {};
  const checkInTimeStr = metadata.check_in_time as string;
  const startTimeStr = metadata.start_time as string;
  const buyIn = metadata.buy_in as string || "$10";
  const payouts = metadata.payouts as string || "Top 3";
  const pastWinners = metadata.past_winners as WeekWinners[] || [];

  // Get event date in EST for signup count
  const getEventDateEST = (isoString: string): string | null => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleDateString('en-CA', { 
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const eventDate = startTimeStr ? getEventDateEST(startTimeStr) : null;
  const { data: signupCount } = useBlindDrawSignupCount(eventDate || undefined);

  useEffect(() => {
    if (!checkInTimeStr || !startTimeStr) return;

    const checkInTime = new Date(checkInTimeStr);
    const startTime = new Date(startTimeStr);

    const updateCountdowns = () => {
      const now = new Date();
      
      // Check-in countdown
      const checkInDiff = checkInTime.getTime() - now.getTime();
      if (checkInDiff > 0) {
        const hours = Math.floor(checkInDiff / (1000 * 60 * 60));
        const minutes = Math.floor((checkInDiff % (1000 * 60 * 60)) / (1000 * 60));
        const maxDiff = 12 * 60 * 60 * 1000;
        const percent = Math.max(0, Math.min(100, 100 - (checkInDiff / maxDiff) * 100));
        
        if (hours > 0) {
          setCheckInCountdown({ text: `${hours}h ${minutes}m until check-in`, percent });
        } else if (minutes > 0) {
          setCheckInCountdown({ text: `${minutes}m until check-in`, percent });
        } else {
          setCheckInCountdown({ text: "Check-in open now!", percent: 100 });
        }
      } else {
        setCheckInCountdown({ text: "Check-in open now!", percent: 100 });
      }

      // Start time countdown
      const startDiff = startTime.getTime() - now.getTime();
      if (startDiff > 0) {
        const hours = Math.floor(startDiff / (1000 * 60 * 60));
        const minutes = Math.floor((startDiff % (1000 * 60 * 60)) / (1000 * 60));
        const maxDiff = 12 * 60 * 60 * 1000;
        const percent = Math.max(0, Math.min(100, 100 - (startDiff / maxDiff) * 100));
        
        if (hours > 0) {
          setStartCountdown({ text: `${hours}h ${minutes}m until start`, percent });
        } else if (minutes > 0) {
          setStartCountdown({ text: `${minutes}m until start`, percent });
        } else {
          setStartCountdown({ text: "Starting now!", percent: 100 });
        }
      } else {
        setStartCountdown({ text: "Event started!", percent: 100 });
      }
    };

    updateCountdowns();
    const intervalId = setInterval(updateCountdowns, 60000);
    return () => clearInterval(intervalId);
  }, [checkInTimeStr, startTimeStr]);

  // Format times for display
  const formatTime = (isoString: string) => {
    if (!isoString) return "TBD";
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZone: 'America/New_York'
    });
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return card.subtitle || "";
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'America/New_York'
    });
  };


  const placeEmojis = ['🥇', '🥈', '🥉'];

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        "relative overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow duration-200",
        "border-t-4 border-t-emerald-400 dark:border-t-emerald-500",
        "border border-emerald-200 dark:border-white/20",
        "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 dark:from-emerald-700 dark:via-teal-700 dark:to-cyan-800"
      )}>
        {/* Static background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-8">
            <Shuffle className="h-24 w-24 text-white/30" />
          </div>
          <div className="absolute bottom-4 left-8">
            <Shuffle className="h-16 w-16 text-white/20 rotate-45" />
          </div>
        </div>
        
        {/* Inner glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />
        
        <CardContent className="relative z-10 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:gap-8 text-white">
            {/* Left Column - Header, Date, Countdowns */}
            <div className="flex flex-col items-center text-center space-y-3 md:w-1/3 md:flex-shrink-0">
              {/* Header with subtle entrance animation */}
              <div className="flex items-center gap-2">
                <motion.div
                  initial={{ rotate: -10, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Shuffle className="h-6 w-6 md:h-8 md:w-8" />
                </motion.div>
                <h2 className="text-xl md:text-2xl font-bebas uppercase tracking-wide">
                  {card.title}
                </h2>
                <motion.div
                  initial={{ rotate: 10, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <Shuffle className="h-6 w-6 md:h-8 md:w-8" />
                </motion.div>
              </div>
            
            {/* Date badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
              <Calendar className="h-4 w-4" />
              <span className="font-inter font-semibold text-sm">{card.subtitle || formatDate(checkInTimeStr)}</span>
            </div>

            {/* Countdown bar - desktop only in left column */}
            {startTimeStr && (
              <div className="hidden md:block w-full mt-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-inter text-white/90">
                    <Timer className="h-3 w-3 text-green-300" />
                    <span>{startCountdown.text}</span>
                  </div>
                  <Progress value={startCountdown.percent} className="h-1.5 bg-white/20 [&>div]:bg-green-400" aria-label="Event start countdown progress" />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Event Details & Past Winners */}
          <div className="flex-1 flex flex-col items-center md:items-stretch space-y-3 mt-4 md:mt-0">
            {/* Event details grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full">
              <motion.div 
                whileHover={{ scale: 1.03 }}
                className="flex flex-col items-center gap-0.5 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-white/20 hover:border-white/40 transition-all"
              >
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-yellow-300" />
                <span className="text-[10px] font-bebas uppercase tracking-wide text-white/80">Check-in</span>
                <span className="text-base md:text-lg font-bebas">{formatTime(checkInTimeStr)}</span>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.03 }}
                className="flex flex-col items-center gap-0.5 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-white/20 hover:border-white/40 transition-all"
              >
                <Clock className="h-4 w-4 md:h-5 md:w-5 text-green-300" />
                <span className="text-[10px] font-bebas uppercase tracking-wide text-white/80">Start</span>
                <span className="text-base md:text-lg font-bebas">{formatTime(startTimeStr)}</span>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.03 }}
                className="flex flex-col items-center gap-0.5 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-white/20 hover:border-white/40 transition-all"
              >
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-emerald-300" />
                <span className="text-[10px] font-bebas uppercase tracking-wide text-white/80">Buy-in</span>
                <span className="text-base md:text-lg font-bebas">{buyIn}</span>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.03 }}
                className="flex flex-col items-center gap-0.5 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-white/20 hover:border-white/40 transition-all"
              >
                <Trophy className="h-4 w-4 md:h-5 md:w-5 text-amber-300" />
                <span className="text-[10px] font-bebas uppercase tracking-wide text-white/80">Payouts</span>
                <span className="text-base md:text-lg font-bebas">{payouts}</span>
              </motion.div>
            </div>

            {/* Past Winners */}
            {pastWinners.length > 0 && (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Medal className="h-4 w-4 text-amber-300" />
                  <span className="font-bebas uppercase tracking-wide text-sm">Past Winners</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {pastWinners.map((weekData) => (
                    <div key={weekData.week} className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                      <div className="text-[10px] font-bebas uppercase tracking-wide text-white/70 text-center mb-1">
                        Week {weekData.week}
                      </div>
                      {weekData.winners.length > 0 ? (
                        <div className="space-y-0.5 text-xs font-inter">
                          {weekData.winners.map((winner) => (
                            <div key={winner.place} className="flex items-center gap-1 justify-center md:justify-start">
                              <span>{placeEmojis[winner.place - 1] || `#${winner.place}`}</span>
                              <span>{winner.names}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-10 text-white/50 text-xs font-inter">
                          TBD
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Countdown bar - mobile only */}
            {startTimeStr && (
              <div className="md:hidden w-full max-w-sm mt-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-inter text-white/90">
                    <Timer className="h-3 w-3 text-green-300" />
                    <span>{startCountdown.text}</span>
                  </div>
                  <Progress value={startCountdown.percent} className="h-1.5 bg-white/20 [&>div]:bg-green-400" aria-label="Event start countdown progress" />
                </div>
              </div>
            )}

            {/* Signup Form - only for blind-draw events */}
            {card.slug === 'blind-draw' && eventDate && (
              <div className="w-full mt-3 space-y-2">
                {signupCount !== undefined && signupCount > 0 && (
                  <div className="flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit mx-auto">
                    <Users className="h-4 w-4 text-emerald-300" />
                    <span className="font-inter font-semibold text-sm">
                      {signupCount} signed up
                    </span>
                  </div>
                )}
                <BlindDrawSignupForm eventDate={eventDate} />
              </div>
            )}
          </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default EventHeroCard;
