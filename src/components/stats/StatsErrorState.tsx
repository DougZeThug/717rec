
import React from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StatsErrorStateProps {
  teamsError: Error | null;
  matchesError: Error | null;
}

const StatsErrorState: React.FC<StatsErrorStateProps> = ({ teamsError, matchesError }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Alert variant="destructive" className="max-w-xl">
        <AlertTriangle className="h-5 w-5 mr-2" />
        <AlertDescription>
          There was an error loading the statistics data. Please try refreshing the page.
          {teamsError && <p className="mt-2 text-sm">{teamsError.message}</p>}
          {matchesError && <p className="mt-2 text-sm">{matchesError.message}</p>}
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default StatsErrorState;
