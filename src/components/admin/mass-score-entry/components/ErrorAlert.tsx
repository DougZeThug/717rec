
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  failedMatches: string[];
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ failedMatches }) => {
  if (!failedMatches?.length) return null;

  return (
    <Alert variant="default" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {failedMatches.length} {failedMatches.length === 1 ? 'match' : 'matches'} failed to update. 
        Please correct the errors and resubmit.
      </AlertDescription>
    </Alert>
  );
};

export default ErrorAlert;
