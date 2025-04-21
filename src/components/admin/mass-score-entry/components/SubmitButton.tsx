
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";

interface SubmitButtonProps {
  onSubmit: () => void;
  disabled: boolean;
  submitting: boolean;
  count?: number;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ 
  onSubmit, 
  disabled, 
  submitting,
  count = 0
}) => {
  return (
    <motion.div whileTap={{ scale: 0.97 }}>
      <Button
        onClick={onSubmit}
        disabled={disabled}
        className="flex items-center gap-2 transition-all duration-200 hover:bg-opacity-90 shadow-sm"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {submitting ? "Processing..." : `Submit ${count ? `(${count})` : "All"} Changes`}
      </Button>
    </motion.div>
  );
};

export default SubmitButton;
