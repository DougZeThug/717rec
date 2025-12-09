import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shuffle, Clock, DollarSign, Trophy, Calendar, Timer, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { HeroCard } from "@/types/heroCard";
import { cn } from "@/lib/utils";

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
    <Card className={cn(
      "relative overflow-hidden shadow-2xl",
      "border-t-4 border-t-emerald-400 dark:border-t-emerald-500",
      "border border-white/20",
      card.background_color
    )}>
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-4 right-8 animate-pulse">
          <Shuffle className="h-24 w-24 text-white/30" />
        </div>
        <div className="absolute bottom-4 left-8 animate-pulse delay-300">
          <Shuffle className="h-16 w-16 text-white/20 rotate-45" />
        </div>
      </div>
      
      {/* Inner glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />
      
      <CardContent className="relative z-10 p-6 md:p-8">
        <div className={cn("flex flex-col items-center text-center space-y-4", card.text_color)}>
          {/* Header with animated icon */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <Shuffle className="h-8 w-8 md:h-10 md:w-10" />
            </motion.div>
            <h2 className="text-2xl md:text-4xl font-bebas uppercase tracking-wide">
              {card.title}
            </h2>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <Shuffle className="h-8 w-8 md:h-10 md:w-10" />
            </motion.div>
          </div>
          
          {/* Date badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
            <Calendar className="h-4 w-4" />
            <span className="font-inter font-semibold">{card.subtitle || formatDate(checkInTimeStr)}</span>
          </div>
          
          {/* Event details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-2xl mt-4">
            <div className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-yellow-300" />
              <span className="text-xs font-bebas uppercase tracking-wide text-white/80">Check-in</span>
              <span className="text-lg md:text-xl font-bebas">{formatTime(checkInTimeStr)}</span>
            </div>
            
            <div className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-green-300" />
              <span className="text-xs font-bebas uppercase tracking-wide text-white/80">Start</span>
              <span className="text-lg md:text-xl font-bebas">{formatTime(startTimeStr)}</span>
            </div>
            
            <div className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-emerald-300" />
              <span className="text-xs font-bebas uppercase tracking-wide text-white/80">Buy-in</span>
              <span className="text-lg md:text-xl font-bebas">{buyIn}</span>
            </div>
            
            <div className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-white/10">
              <Trophy className="h-5 w-5 md:h-6 md:w-6 text-amber-300" />
              <span className="text-xs font-bebas uppercase tracking-wide text-white/80">Payouts</span>
              <span className="text-lg md:text-xl font-bebas">{payouts}</span>
            </div>
          </div>

          {/* Past Winners */}
          {pastWinners.length > 0 && (
            <div className="w-full max-w-2xl mt-4 space-y-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Medal className="h-5 w-5 text-amber-300" />
                <span className="font-bebas uppercase tracking-wide text-lg">Past Winners</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {pastWinners.map((weekData) => (
                  <div key={weekData.week} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                    <div className="text-xs font-bebas uppercase tracking-wide text-white/70 text-center mb-2">
                      Week {weekData.week}
                    </div>
                    {weekData.winners.length > 0 ? (
                      <div className="space-y-1 text-sm font-inter">
                        {weekData.winners.map((winner) => (
                          <div key={winner.place} className="flex items-center gap-2">
                            <span>{placeEmojis[winner.place - 1] || `#${winner.place}`}</span>
                            <span>{winner.names}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-16 text-white/50 text-sm font-inter">
                        TBD
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Countdown bars */}
          {checkInTimeStr && startTimeStr && (
            <div className="w-full max-w-md space-y-3 mt-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-inter text-white/90">
                  <Timer className="h-4 w-4 text-yellow-300" />
                  <span>{checkInCountdown.text}</span>
                </div>
                <Progress value={checkInCountdown.percent} className="h-2 bg-white/20 [&>div]:bg-yellow-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-inter text-white/90">
                  <Timer className="h-4 w-4 text-green-300" />
                  <span>{startCountdown.text}</span>
                </div>
                <Progress value={startCountdown.percent} className="h-2 bg-white/20 [&>div]:bg-green-400" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventHeroCard;
