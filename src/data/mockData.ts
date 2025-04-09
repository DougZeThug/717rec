
import { Team, Match, PlayoffBracket, Ranking } from "../types";

export const mockTeams: Team[] = [
  {
    id: "1",
    name: "Hole Burners",
    logoUrl: "https://via.placeholder.com/150?text=Hole+Burners",
    players: [
      { id: "p1", name: "Player 1" },
      { id: "p2", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 3, 15).toISOString()
  },
  {
    id: "2",
    name: "Here for the Fireball",
    logoUrl: "https://via.placeholder.com/150?text=Here+for+the+Fireball",
    players: [
      { id: "p3", name: "Player 1" },
      { id: "p4", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 2).toISOString()
  },
  {
    id: "3",
    name: "F*** I don't know",
    logoUrl: "https://via.placeholder.com/150?text=Team+3",
    players: [
      { id: "p5", name: "Player 1" },
      { id: "p6", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 3, 28).toISOString()
  },
  {
    id: "4",
    name: "The Undigestibles",
    logoUrl: "https://via.placeholder.com/150?text=The+Undigestibles",
    players: [
      { id: "p7", name: "Player 1" },
      { id: "p8", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 10).toISOString()
  },
  {
    id: "5",
    name: "Zoo Pals",
    logoUrl: "https://via.placeholder.com/150?text=Zoo+Pals",
    players: [
      { id: "p9", name: "Player 1" },
      { id: "p10", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 3, 20).toISOString()
  },
  {
    id: "6",
    name: "Double Trouble",
    logoUrl: "https://via.placeholder.com/150?text=Double+Trouble",
    players: [
      { id: "p11", name: "Player 1" },
      { id: "p12", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 3, 25).toISOString()
  },
  {
    id: "7",
    name: "Pepperoni Cheesers",
    logoUrl: "https://via.placeholder.com/150?text=Pepperoni+Cheesers",
    players: [
      { id: "p13", name: "Player 1" },
      { id: "p14", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 5).toISOString()
  },
  {
    id: "8",
    name: "3 Amigos",
    logoUrl: "https://via.placeholder.com/150?text=3+Amigos",
    players: [
      { id: "p15", name: "Player 1" },
      { id: "p16", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 8).toISOString()
  },
  {
    id: "9",
    name: "Came from Dicks",
    logoUrl: "https://via.placeholder.com/150?text=Came+from+Dicks",
    players: [
      { id: "p17", name: "Player 1" },
      { id: "p18", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 12).toISOString()
  },
  {
    id: "10",
    name: "Believers",
    logoUrl: "https://via.placeholder.com/150?text=Believers",
    players: [
      { id: "p19", name: "Player 1" },
      { id: "p20", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 15).toISOString()
  },
  {
    id: "11",
    name: "Corn 2 Be Wild",
    logoUrl: "https://via.placeholder.com/150?text=Corn+2+Be+Wild",
    players: [
      { id: "p21", name: "Player 1" },
      { id: "p22", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 18).toISOString()
  },
  {
    id: "12",
    name: "Mailmen",
    logoUrl: "https://via.placeholder.com/150?text=Mailmen",
    players: [
      { id: "p23", name: "Player 1" },
      { id: "p24", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 20).toISOString()
  },
  {
    id: "13",
    name: "Cuzzo's Clinic",
    logoUrl: "https://via.placeholder.com/150?text=Cuzzos+Clinic",
    players: [
      { id: "p25", name: "Player 1" },
      { id: "p26", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 22).toISOString()
  },
  {
    id: "14",
    name: "Buttery Nips",
    logoUrl: "https://via.placeholder.com/150?text=Buttery+Nips",
    players: [
      { id: "p27", name: "Player 1" },
      { id: "p28", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 25).toISOString()
  },
  {
    id: "15",
    name: "Happy Valley Hole Hunters",
    logoUrl: "https://via.placeholder.com/150?text=Happy+Valley+Hole+Hunters",
    players: [
      { id: "p29", name: "Player 1" },
      { id: "p30", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 4, 28).toISOString()
  },
  {
    id: "16",
    name: "Off Dogs",
    logoUrl: "https://via.placeholder.com/150?text=Off+Dogs",
    players: [
      { id: "p31", name: "Player 1" },
      { id: "p32", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 1).toISOString()
  },
  {
    id: "17",
    name: "On a Mission",
    logoUrl: "https://via.placeholder.com/150?text=On+a+Mission",
    players: [
      { id: "p33", name: "Player 1" },
      { id: "p34", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 3).toISOString()
  },
  {
    id: "18",
    name: "Hole Violators",
    logoUrl: "https://via.placeholder.com/150?text=Hole+Violators",
    players: [
      { id: "p35", name: "Player 1" },
      { id: "p36", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 5).toISOString()
  },
  {
    id: "19",
    name: "Seize the Maize",
    logoUrl: "https://via.placeholder.com/150?text=Seize+the+Maize",
    players: [
      { id: "p37", name: "Player 1" },
      { id: "p38", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 8).toISOString()
  },
  {
    id: "20",
    name: "Wrong Hole",
    logoUrl: "https://via.placeholder.com/150?text=Wrong+Hole",
    players: [
      { id: "p39", name: "Player 1" },
      { id: "p40", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 10).toISOString()
  },
  {
    id: "21",
    name: "Shut Your Cornhole",
    logoUrl: "https://via.placeholder.com/150?text=Shut+Your+Cornhole",
    players: [
      { id: "p41", name: "Player 1" },
      { id: "p42", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 12).toISOString()
  },
  {
    id: "22",
    name: "Jager Bombers",
    logoUrl: "https://via.placeholder.com/150?text=Jager+Bombers",
    players: [
      { id: "p43", name: "Player 1" },
      { id: "p44", name: "Player 2" }
    ],
    wins: 0,
    losses: 0,
    created_at: new Date(2023, 5, 15).toISOString()
  }
];

// Now let's update the matches to use our new team IDs
export const mockMatches: Match[] = [
  {
    id: "m1",
    team1Id: "1",
    team2Id: "2",
    team1Score: 21,
    team2Score: 15,
    date: new Date(2023, 5, 15, 18, 0).toISOString(),
    location: "Community Park",
    isCompleted: true,
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
    isCompleted: true,
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
    isCompleted: true,
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
    isCompleted: true,
    winnerId: "7",
    loserId: "8"
  },
  {
    id: "m5",
    team1Id: "1",
    team2Id: "4",
    date: new Date(2023, 6, 1, 18, 0).toISOString(),
    location: "Community Park",
    isCompleted: false
  },
  {
    id: "m6",
    team1Id: "6",
    team2Id: "7",
    date: new Date(2023, 6, 1, 19, 30).toISOString(),
    location: "Community Park",
    isCompleted: false
  },
  {
    id: "m7",
    team1Id: "2",
    team2Id: "3",
    date: new Date(2023, 6, 2, 18, 0).toISOString(),
    location: "Riverside Grounds",
    isCompleted: false
  },
  {
    id: "m8",
    team1Id: "5",
    team2Id: "8",
    date: new Date(2023, 6, 2, 19, 30).toISOString(),
    location: "Riverside Grounds",
    isCompleted: false
  }
];

// Update the playoff bracket to use our new team IDs
export const mockPlayoffBracket: PlayoffBracket = {
  id: "pb1",
  name: "Summer 2023 Playoffs",
  division: "Recreational",
  matches: [
    // Quarter Finals
    {
      id: "pm1",
      round: 1,
      position: 1,
      team1Id: "1",
      team2Id: "8",
      winnerId: "1",
      team1Score: 21,
      team2Score: 10
    },
    {
      id: "pm2",
      round: 1,
      position: 2,
      team1Id: "4",
      team2Id: "5",
      winnerId: "4",
      team1Score: 21,
      team2Score: 18
    },
    {
      id: "pm3",
      round: 1,
      position: 3,
      team1Id: "2",
      team2Id: "7",
      winnerId: "2",
      team1Score: 21,
      team2Score: 15
    },
    {
      id: "pm4",
      round: 1,
      position: 4,
      team1Id: "3",
      team2Id: "6",
      winnerId: "6",
      team1Score: 21,
      team2Score: 20
    },
    // Semi Finals
    {
      id: "pm5",
      round: 2,
      position: 1,
      team1Id: "1",
      team2Id: "4",
      winnerId: "1",
      team1Score: 21,
      team2Score: 17
    },
    {
      id: "pm6",
      round: 2,
      position: 2,
      team1Id: "2",
      team2Id: "6",
      winnerId: "2",
      team1Score: 21,
      team2Score: 19
    },
    // Finals
    {
      id: "pm7",
      round: 3,
      position: 1,
      team1Id: "1",
      team2Id: "2",
      winnerId: "1",
      team1Score: 21,
      team2Score: 15
    }
  ],
  champion: "1"
};

// Generate rankings based on the updated teams
export const mockRankings: Ranking[] = mockTeams.map(team => {
  const winPercentage = team.wins + team.losses > 0 
    ? Number((team.wins / (team.wins + team.losses)).toFixed(3)) 
    : 0;
  
  return {
    teamId: team.id,
    teamName: team.name,
    logoUrl: team.logoUrl,
    wins: team.wins,
    losses: team.losses,
    winPercentage,
    sos: Number((Math.random() * 0.5 + 0.5).toFixed(3)) // Random SOS between 0.5 and 1.0
  };
}).sort((a, b) => b.winPercentage - a.winPercentage || b.sos - a.sos);
