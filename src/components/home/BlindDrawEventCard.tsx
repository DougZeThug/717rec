import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shuffle, Clock, DollarSign, Trophy, Calendar, Timer } from "lucide-react";
import { motion } from "framer-motion";

const BlindDrawEventCard: React.FC = () => {
  const [checkInCountdown, setCheckInCountdown] = useState({ text: "", percent: 0 });
  const [startCountdown, setStartCountdown] = useState({ text: "", percent: 0 });

  useEffect(() => {
    // Event times in EST, stored as UTC (EST = UTC-5)
    // 6:30 PM EST = 23:30 UTC on Dec 4
    // 7:00 PM EST = 00:00 UTC on Dec 5
    const checkInTime = new Date(Date.UTC(2025, 11, 4, 23, 30, 0));
    const startTime = new Date(Date.UTC(2025, 11, 5, 0, 0, 0));

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
  }, []);

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 shadow-2xl">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-4 right-8 animate-pulse">
          <Shuffle className="h-24 w-24 text-white/30" />
        </div>
        <div className="absolute bottom-4 left-8 animate-pulse delay-300">
          <Shuffle className="h-16 w-16 text-white/20 rotate-45" />
        </div>
      </div>
      
      <CardContent className="relative z-10 p-6 md:p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Header with animated icon */}
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <Shuffle className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </motion.div>
            <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
              BLIND DRAW TONIGHT!
            </h2>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <Shuffle className="h-8 w-8 md:h-10 md:w-10 text-white" />
            </motion.div>
          </div>
          
          {/* Date badge */}
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
            <Calendar className="h-4 w-4 text-white" />
            <span className="text-white font-semibold">Thursday, December 4th</span>
          </div>
          
          {/* Event details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-2xl mt-4">
            <div className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-yellow-300" />
              <span className="text-xs text-white/80 uppercase tracking-wide">Check-in</span>
              <span className="text-lg md:text-xl font-bold text-white">6:30 PM</span>
            </div>
            
            <div className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-green-300" />
              <span className="text-xs text-white/80 uppercase tracking-wide">Start</span>
              <span className="text-lg md:text-xl font-bold text-white">7:00 PM</span>
            </div>
            
            <div className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-emerald-300" />
              <span className="text-xs text-white/80 uppercase tracking-wide">Buy-in</span>
              <span className="text-lg md:text-xl font-bold text-white">$10</span>
            </div>
            
            <div className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-4">
              <Trophy className="h-5 w-5 md:h-6 md:w-6 text-amber-300" />
              <span className="text-xs text-white/80 uppercase tracking-wide">Payouts</span>
              <span className="text-lg md:text-xl font-bold text-white">1st & 2nd</span>
            </div>
          </div>

          {/* Countdown bars */}
          <div className="w-full max-w-md space-y-3 mt-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Timer className="h-4 w-4 text-yellow-300" />
                <span>{checkInCountdown.text}</span>
              </div>
              <Progress value={checkInCountdown.percent} className="h-2 bg-white/20 [&>div]:bg-yellow-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Timer className="h-4 w-4 text-green-300" />
                <span>{startCountdown.text}</span>
              </div>
              <Progress value={startCountdown.percent} className="h-2 bg-white/20 [&>div]:bg-green-400" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BlindDrawEventCard;
