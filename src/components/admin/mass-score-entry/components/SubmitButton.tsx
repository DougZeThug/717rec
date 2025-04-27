
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";

interface SubmitButtonProps {
  onClick: () => void;  // New prop for handling click
  disabled: boolean;
  submitting: boolean;
  editedMatchCount?: number;  // Renamed from `count` for clarity
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ 
  onClick,  // New prop
  disabled, 
  submitting,
  editedMatchCount = 0
}) => {
  return (
    <motion.div whileTap={{ scale: 0.97 }}>
      <Button
        onClick={onClick}  // Wire up the new onClick prop
        disabled={disabled}
        className="flex items-center gap-2 transition-all duration-200 hover:bg-opacity-90 shadow-sm"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {submitting ? "Processing..." : `Submit ${editedMatchCount ? `(${editedMatchCount})` : "All"} Changes`}
      </Button>
    </motion.div>
  );
};

export default SubmitButton;
