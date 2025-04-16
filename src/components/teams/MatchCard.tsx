
import { Match } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface MatchCardProps {
  match: Match;
  opponentId: string;
  isPastMatch: boolean;
  matchResult?: string;
  scoreDisplay?: string;
}

const MatchCard = ({ match, opponentId, isPastMatch, matchResult, scoreDisplay }: MatchCardProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar size={16} className="mr-2 text-gray-500" />
            <span>
              {isPastMatch ? (
                format(new Date(match.date), "MMM d, yyyy")
              ) : (
                <>
                  {format(new Date(match.date), "MMM d, yyyy")} at{" "}
                  {format(new Date(match.date), "h:mm a")}
                </>
              )}
            </span>
          </div>
          {isPastMatch ? (
            <Badge 
              variant={match.winnerId === opponentId ? "destructive" : "default"}
            >
              {matchResult}
            </Badge>
          ) : (
            <Badge variant="outline">Upcoming</Badge>
          )}
        </div>
        <div className="mt-2 flex justify-between items-center">
          <span className="font-semibold">
            Opponent: <span className="text-cornhole-navy">{opponentId}</span>
          </span>
          {isPastMatch && match.iscompleted && scoreDisplay && (
            <span className="font-bold">{scoreDisplay}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchCard;
