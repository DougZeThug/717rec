import { Team, Match, PlayoffBracket, Ranking, PlayoffGame } from "../types";

export const mockTeams: Team[] = [
  {
    id: "1",
    name: "Hole Burners",
    logoUrl: "https://via.placeholder.com/150?text=Hole+Burners",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 3, 15).toISOString(),
    division: "Recreational",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "2",
    name: "Here for the Fireball",
    logoUrl: "https://via.placeholder.com/150?text=Here+for+the+Fireball",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 2).toISOString(),
    division: "Recreational",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "3",
    name: "F*** I don't know",
    logoUrl: "https://via.placeholder.com/150?text=Team+3",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 3, 28).toISOString(),
    division: "Recreational",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "4",
    name: "The Undigestibles",
    logoUrl: "https://via.placeholder.com/150?text=The+Undigestibles",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 10).toISOString(),
    division: "Competitive",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "5",
    name: "Zoo Pals",
    logoUrl: "https://via.placeholder.com/150?text=Zoo+Pals",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 3, 20).toISOString(),
    division: "Recreational",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "6",
    name: "Double Trouble",
    logoUrl: "https://via.placeholder.com/150?text=Double+Trouble",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 3, 25).toISOString(),
    division: "Competitive",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "7",
    name: "Pepperoni Cheesers",
    logoUrl: "https://via.placeholder.com/150?text=Pepperoni+Cheesers",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 5).toISOString(),
    division: "Intermediate",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "8",
    name: "3 Amigos",
    logoUrl: "https://via.placeholder.com/150?text=3+Amigos",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 8).toISOString(),
    division: "Intermediate",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "9",
    name: "Came from Dicks",
    logoUrl: "https://via.placeholder.com/150?text=Came+from+Dicks",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 12).toISOString(),
    division: "Intermediate",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "10",
    name: "Believers",
    logoUrl: "https://via.placeholder.com/150?text=Believers",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 15).toISOString(),
    division: "Competitive",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "11",
    name: "Corn 2 Be Wild",
    logoUrl: "https://via.placeholder.com/150?text=Corn+2+Be+Wild",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 18).toISOString(),
    division: "Competitive",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "12",
    name: "Mailmen",
    logoUrl: "https://via.placeholder.com/150?text=Mailmen",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 20).toISOString(),
    division: "Competitive",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "13",
    name: "Cuzzo's Clinic",
    logoUrl: "https://via.placeholder.com/150?text=Cuzzos+Clinic",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 22).toISOString(),
    division: "Intermediate",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "14",
    name: "Buttery Nips",
    logoUrl: "https://via.placeholder.com/150?text=Buttery+Nips",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 25).toISOString(),
    division: "Intermediate",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "15",
    name: "Happy Valley Hole Hunters",
    logoUrl: "https://via.placeholder.com/150?text=Happy+Valley+Hole+Hunters",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 28).toISOString(),
    division: "Competitive",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "16",
    name: "Off Dogs",
    logoUrl: "https://via.placeholder.com/150?text=Off+Dogs",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 1).toISOString(),
    division: "Recreational",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "17",
    name: "On a Mission",
    logoUrl: "https://via.placeholder.com/150?text=On+a+Mission",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 3).toISOString(),
    division: "Recreational",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "18",
    name: "Hole Violators",
    logoUrl: "https://via.placeholder.com/150?text=Hole+Violators",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 5).toISOString(),
    division: "Intermediate",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "19",
    name: "Seize the Maize",
    logoUrl: "https://via.placeholder.com/150?text=Seize+the+Maize",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 8).toISOString(),
    division: "Intermediate",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "20",
    name: "Wrong Hole",
    logoUrl: "https://via.placeholder.com/150?text=Wrong+Hole",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 10).toISOString(),
    division: "Competitive",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "21",
    name: "Shut Your Cornhole",
    logoUrl: "https://via.placeholder.com/150?text=Shut+Your+Cornhole",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 12).toISOString(),
    division: "Competitive",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  },
  {
    id: "22",
    name: "Jager Bombers",
    logoUrl: "https://via.placeholder.com/150?text=Jager+Bombers",
    players: [
      "Player 1",
      "Player 2"
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 15).toISOString(),
    division: "Competitive",
    sos: 0.5,
    power_score: 0,
    win_percentage: 0,
    game_win_percentage: 0,
    game_wins: 0,
    game_losses: 0
  }
];

export const mockMatches: Match[] = [
  {
    id: "m1",
    team1Id: "1",
    team2Id: "2",
    team1Score: 21,
    team2Score: 15,
    date: new Date(2023, 5, 15, 18, 0).toISOString(),
    location: "Community Park",
    iscompleted: true,
    winnerId: "1",
    loserId: "2"
  },
  {
    id: "m2",
    team1Id: "3",
    team2Id: "4",
    team1Score: 19,
    team2Score: 21,
    date: new Date(2023, 5, 15, 19, 30).toISOString(),
    location: "Community Park",
    iscompleted: true,
    winnerId: "4",
    loserId: "3"
  },
  {
    id: "m3",
    team1Id: "5",
    team2Id: "6",
    team1Score: 12,
    team2Score: 21,
    date: new Date(2023, 5, 16, 18, 0).toISOString(),
    location: "Riverside Grounds",
    iscompleted: true,
    winnerId: "6",
    loserId: "5"
  },
  {
    id: "m4",
    team1Id: "7",
    team2Id: "8",
    team1Score: 21,
    team2Score: 14,
    date: new Date(2023, 5, 16, 19, 30).toISOString(),
    location: "Riverside Grounds",
    iscompleted: true,
    winnerId: "7",
    loserId: "8"
  },
  {
    id: "m5",
    team1Id: "1",
    team2Id: "4",
    date: new Date(2023, 6, 1, 18, 0).toISOString(),
    location: "Community Park",
    iscompleted: false
  },
  {
    id: "m6",
    team1Id: "6",
    team2Id: "7",
    date: new Date(2023, 6, 1, 19, 30).toISOString(),
    location: "Community Park",
    iscompleted: false
  },
  {
    id: "m7",
    team1Id: "2",
    team2Id: "3",
    date: new Date(2023, 6, 2, 18, 0).toISOString(),
    location: "Riverside Grounds",
    iscompleted: false
  },
  {
    id: "m8",
    team1Id: "5",
    team2Id: "8",
    date: new Date(2023, 6, 2, 19, 30).toISOString(),
    location: "Riverside Grounds",
    iscompleted: false
  }
];

const createBestOf3Games = (team1Id: string, team2Id: string, winningTeamId: string): PlayoffGame[] => {
  if (winningTeamId === team1Id) {
    return [
      {
        id: `game-${Math.random().toString(36).substr(2, 9)}`,
        team1Score: 21,
        team2Score: 15,
        winner: team1Id
      },
      {
        id: `game-${Math.random().toString(36).substr(2, 9)}`,
        team1Score: 18,
        team2Score: 21,
        winner: team2Id
      },
      {
        id: `game-${Math.random().toString(36).substr(2, 9)}`,
        team1Score: 21,
        team2Score: 17,
        winner: team1Id
      }
    ];
  } else {
    return [
      {
        id: `game-${Math.random().toString(36).substr(2, 9)}`,
        team1Score: 18,
        team2Score: 21,
        winner: team2Id
      },
      {
        id: `game-${Math.random().toString(36).substr(2, 9)}`,
        team1Score: 21,
        team2Score: 15,
        winner: team1Id
      },
      {
        id: `game-${Math.random().toString(36).substr(2, 9)}`,
        team1Score: 17,
        team2Score: 21,
        winner: team2Id
      }
    ];
  }
};

export const mockPlayoffBracket: PlayoffBracket = {
  id: "pb1",
  name: "Summer 2023 Playoffs",
  division: "Recreational",
  format: "Double Elimination",
  matches: [
    // Winners Round 1
    {
      id: "pm1",
      round: 1,
      position: 1,
      team1Id: "1",
      team2Id: "2",
      winnerId: "1",
      team1Score: 2,
      team2Score: 1,
      matchType: "winners",
      bestOf: 3,
      games: createBestOf3Games("1", "2", "1")
    },
    {
      id: "pm2",
      round: 1,
      position: 2,
      team1Id: "3",
      team2Id: "5",
      winnerId: "3",
      team1Score: 2,
      team2Score: 0,
      matchType: "winners",
      bestOf: 3,
      games: [
        {
          id: "game-1a",
          team1Score: 21,
          team2Score: 15,
          winner: "3"
        },
        {
          id: "game-1b",
          team1Score: 21,
          team2Score: 18,
          winner: "3"
        }
      ]
    },
    
    // Winners Round 2
    {
      id: "pm3",
      round: 2,
      position: 1,
      team1Id: "1",
      team2Id: "3",
      winnerId: "1",
      team1Score: 2,
      team2Score: 1,
      matchType: "winners",
      bestOf: 3,
      games: createBestOf3Games("1", "3", "1")
    },
    
    // Losers Round 1
    {
      id: "pm4",
      round: 1,
      position: 3,
      team1Id: "2",
      team2Id: "5",
      winnerId: "2",
      team1Score: 2,
      team2Score: 0,
      matchType: "losers",
      bestOf: 3,
      games: [
        {
          id: "game-2a",
          team1Score: 21,
          team2Score: 14,
          winner: "2"
        },
        {
          id: "game-2b",
          team1Score: 21,
          team2Score: 19,
          winner: "2"
        }
      ]
    },
    
    // Losers Round 2
    {
      id: "pm5",
      round: 2,
      position: 2,
      team1Id: "2",
      team2Id: "3",
      winnerId: "2",
      team1Score: 2,
      team2Score: 1,
      matchType: "losers",
      bestOf: 3,
      games: createBestOf3Games("2", "3", "2")
    },
    
    // Finals
    {
      id: "pm6",
      round: 3,
      position: 1,
      team1Id: "1",
      team2Id: "2",
      winnerId: "1",
      team1Score: 2,
      team2Score: 0,
      matchType: "finals",
      bestOf: 3,
      games: [
        {
          id: "game-3a",
          team1Score: 21,
          team2Score: 15,
          winner: "1"
        },
        {
          id: "game-3b",
          team1Score: 21,
          team2Score: 19,
          winner: "1"
        }
      ]
    }
  ],
  champion: "1"
};

export const mockIntermediatePlayoffBracket: PlayoffBracket = {
  id: "pb2",
  name: "Summer 2023 Intermediate Playoffs",
  division: "Intermediate",
  format: "Double Elimination",
  matches: [
    // Just one example match
    {
      id: "pm-int1",
      round: 1,
      position: 1,
      team1Id: "7",
      team2Id: "8",
      winnerId: "7",
      team1Score: 2,
      team2Score: 1,
      matchType: "winners",
      bestOf: 3,
      games: createBestOf3Games("7", "8", "7")
    }
  ],
  champion: "7"
};

export const mockCompetitivePlayoffBracket: PlayoffBracket = {
  id: "pb3",
  name: "Summer 2023 Competitive Playoffs",
  division: "Competitive",
  format: "Double Elimination",
  matches: [
    // Just one example match
    {
      id: "pm-comp1",
      round: 1,
      position: 1,
      team1Id: "4",
      team2Id: "6",
      winnerId: "4",
      team1Score: 2,
      team2Score: 0,
      matchType: "winners",
      bestOf: 3,
      games: [
        {
          id: "game-comp1a",
          team1Score: 21,
          team2Score: 15,
          winner: "4"
        },
        {
          id: "game-comp1b",
          team1Score: 21,
          team2Score: 18,
          winner: "4"
        }
      ]
    }
  ],
  champion: "4"
};

export const mockRankings: Ranking[] = mockTeams.map(team => {
  const winPercentage = team.wins + team.losses > 0 
    ? Number((team.wins / (team.wins + team.losses)).toFixed(3)) 
    : 0;
  
  return {
    teamId: team.id,
    teamName: team.name,
    logoUrl: team.logoUrl,
    imageUrl: team.imageUrl,
    wins: team.wins,
    losses: team.losses,
    winPercentage,
    divisionName: team.division || null,
    sos: Number((Math.random() * 0.5 + 0.5).toFixed(3)), // Random SOS between 0.5 and 1.0
    streak: Math.random() > 0.5 ? `W${Math.floor(Math.random() * 5) + 1}` : `L${Math.floor(Math.random() * 3) + 1}`,
    headToHead: {}, // Empty head-to-head records
    gamesWon: Math.floor(Math.random() * 10) + 1,
    gamesLost: Math.floor(Math.random() * 5) + 1,
    gameWinPercentage: Math.random(),
    powerScore: Math.floor(Math.random() * 100),
    closeMatchLosses: Math.floor(Math.random() * 3)
  };
}).sort((a, b) => b.winPercentage - a.winPercentage || b.sos - a.sos);
