
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

interface SubmitButtonProps {
  onSubmit: () => void;
  disabled: boolean;
  submitting: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ 
  onSubmit, 
  disabled, 
  submitting 
}) => {
  return (
    <Button
      onClick={onSubmit}
      disabled={disabled}
      className="flex items-center gap-2"
    >
      {submitting && <Loader2 size={16} className="animate-spin" />}
      <Save size={16} />
      {submitting ? "Processing..." : "Submit All Changes"}
    </Button>
  );
};

export default SubmitButton;
