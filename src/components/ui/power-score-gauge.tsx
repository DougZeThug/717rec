import React, { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { getPowerScoreColor, formatPowerScore } from "@/utils/colors/powerScoreColors";

interface PowerScoreGaugeProps {
  score: number; // 0-1 scale from database
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { width: 48, strokeWidth: 4, fontSize: "text-sm", labelSize: "text-[10px]" },
  md: { width: 64, strokeWidth: 5, fontSize: "text-lg", labelSize: "text-xs" },
  lg: { width: 80, strokeWidth: 6, fontSize: "text-xl", labelSize: "text-sm" },
};

export const PowerScoreGauge: React.FC<PowerScoreGaugeProps> = ({
  score,
  size = "md",
  showLabel = true,
  className,
}) => {
  const config = sizeConfig[size];
  const radius = (config.width - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Convert 0-1 to 0-100 for display
  const displayScore = score * 100;
  const colorClass = getPowerScoreColor(score);
  
  // Animate the score number
  const [displayValue, setDisplayValue] = useState(0);
  const springValue = useSpring(0, { stiffness: 50, damping: 15 });
  
  useEffect(() => {
    springValue.set(displayScore);
    const unsubscribe = springValue.on("change", (v) => {
      setDisplayValue(Math.round(v * 10) / 10);
    });
    return () => unsubscribe();
  }, [displayScore, springValue]);
  
  // Calculate stroke dash offset for the progress ring
  const progress = Math.min(Math.max(displayScore / 100, 0), 1);
  const strokeDashoffset = circumference * (1 - progress);
  
  // Get color for the ring based on score
  const getRingColor = () => {
    if (displayScore >= 75) return "stroke-green-500";
    if (displayScore >= 60) return "stroke-yellow-500";
    if (displayScore >= 45) return "stroke-orange-500";
    return "stroke-red-500";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={config.width}
        height={config.width}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-muted/30"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={config.width / 2}
          cy={config.width / 2}
          r={radius}
          fill="none"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          className={getRingColor()}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold font-mono", config.fontSize, colorClass)}>
          {displayValue.toFixed(1)}
        </span>
        {showLabel && (
          <span className={cn("text-muted-foreground uppercase tracking-wider", config.labelSize)}>
            PWR
          </span>
        )}
      </div>
    </div>
  );
};

export default PowerScoreGauge;
