
import React from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Plus } from "lucide-react";

interface EmptyBracketStateProps {
  onCreateBracket: () => void;
}

const EmptyBracketState: React.FC<EmptyBracketStateProps> = ({ onCreateBracket }) => {
  return (
    <div className="text-center py-12 bg-white rounded-lg shadow-md">
      <Trophy className="h-12 w-12 mx-auto text-gray-300 mb-4" />
      <h3 className="text-xl font-bold text-gray-500 mb-2">No Playoff Brackets</h3>
      <p className="text-gray-500 mb-4">
        Create playoff brackets to organize your tournament.
      </p>
      <Button onClick={onCreateBracket}>
        <Plus className="h-4 w-4 mr-2" /> Create First Bracket
      </Button>
    </div>
  );
};

export default EmptyBracketState;
