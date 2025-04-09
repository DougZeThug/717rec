import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { mockTeams, mockMatches } from "@/data/mockData";

const Index = () => {
  // Get upcoming matches (not completed)
  const upcomingMatches = mockMatches
    .filter(match => !match.isCompleted)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Get top teams by win percentage
  const topTeams = [...mockTeams]
    .sort((a, b) => {
      const aWinPerc = a.wins / (a.wins + a.losses);
      const bWinPerc = b.wins / (b.wins + b.losses);
      return bWinPerc - aWinPerc;
    })
    .slice(0, 4);

  const getTeamById = (id: string) => {
    return mockTeams.find(team => team.id === id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen cornhole-bg">
      {/* Hero Section */}
      <section className="bg-cornhole-navy text-white py-16 md:py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            717 Rec
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            The premier platform for managing recreational Cornhole leagues, tournaments, and events in the 717 area.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-cornhole-green hover:bg-cornhole-green/90">
              <Link to="/teams">View Teams</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-cornhole-navy">
              <Link to="/schedule">See Schedule</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Upcoming Matches */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-cornhole-navy">Upcoming Matches</h2>
            <Button asChild variant="outline" className="text-cornhole-navy border-cornhole-navy hover:bg-cornhole-navy hover:text-white">
              <Link to="/schedule">View All</Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingMatches.map((match) => {
              const team1 = getTeamById(match.team1Id);
              const team2 = getTeamById(match.team2Id);
              
              if (!team1 || !team2) return null;
              
              return (
                <div key={match.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                          {team1.logoUrl && (
                            <img src={team1.logoUrl} alt={team1.name} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span className="ml-2 font-medium">{team1.name}</span>
                      </div>
                      <span className="text-lg font-bold">VS</span>
                      <div className="flex items-center">
                        <span className="mr-2 font-medium">{team2.name}</span>
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                          {team2.logoUrl && (
                            <img src={team2.logoUrl} alt={team2.name} className="w-full h-full object-cover" />
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
                        <p><strong>Location:</strong></p>
                        <p>{match.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Top Teams */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-cornhole-navy">Top Teams</h2>
            <Button asChild variant="outline" className="text-cornhole-navy border-cornhole-navy hover:bg-cornhole-navy hover:text-white">
              <Link to="/teams">View All</Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topTeams.map((team) => (
              <div key={team.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-40 bg-gray-200 relative">
                  {team.logoUrl && (
                    <img 
                      src={team.logoUrl} 
                      alt={team.name} 
                      className="w-full h-full object-contain p-2"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold mb-2">{team.name}</h3>
                  <div className="flex justify-between text-sm">
                    <span>Record:</span>
                    <span className="font-medium">{team.wins} - {team.losses}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Win %:</span>
                    <span className="font-medium">
                      {((team.wins / (team.wins + team.losses)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Call To Action */}
      <section className="bg-cornhole-wood wood-texture text-white py-12 px-4 mt-12">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Join The League Today!</h2>
          <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">
            Looking to compete in the next season? Contact us to register your team and join the excitement!
          </p>
          <Button asChild size="lg" className="bg-white text-cornhole-wood hover:bg-cornhole-cream hover:text-cornhole-navy">
            <a href="mailto:register@bagitupleague.com">Register Now</a>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
