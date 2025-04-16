
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Match, Team } from "@/types";

interface RecentMatchesProps {
  completedMatches: Match[];
  getTeamById: (id: string) => Team | undefined;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
}

const RecentMatches: React.FC<RecentMatchesProps> = ({ 
  completedMatches, 
  getTeamById, 
  formatDate, 
  formatTime 
}) => {
  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-cornhole-navy">Recent Matches</h2>
        <Button asChild variant="outline" className="text-cornhole-navy border-cornhole-navy hover:bg-cornhole-navy hover:text-white">
          <Link to="/schedule">View All</Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {completedMatches.map((match) => {
          const team1 = getTeamById(match.team1Id);
          const team2 = getTeamById(match.team2Id);
          
          if (!team1 || !team2) return null;
          
          return (
            <div key={match.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {team1.imageUrl ? (
                        <img 
                          src={team1.imageUrl} 
                          alt={team1.name} 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                          <span className="text-xs">No Logo</span>
                        </div>
                      )}
                    </div>
                    <span className="ml-3 font-medium">{team1.name}</span>
                  </div>
                  <span className="text-lg font-bold mx-2">VS</span>
                  <div className="flex items-center">
                    <span className="mr-3 font-medium">{team2.name}</span>
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {team2.imageUrl ? (
                        <img 
                          src={team2.imageUrl} 
                          alt={team2.name} 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                          <span className="text-xs">No Logo</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-4">
                  <div>
                    <p><strong>Date:</strong> {formatDate(match.date)}</p>
                    <p><strong>Time:</strong> {formatTime(match.date)}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>Score:</strong></p>
                    <p>{match.team1Score} - {match.team2Score}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default RecentMatches;
