import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SuccessFlashProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * A wrapper component that displays a green success flash animation.
 * Used to provide visual feedback after successful form submissions.
 */
export const SuccessFlash: React.FC<SuccessFlashProps> = ({ 
  show, 
  children, 
  className 
}) => {
  return (
    <div className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ 
              opacity: 0,
              scale: 1.05,
              boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.4)"
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-md pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuccessFlash;
