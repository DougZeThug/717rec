
import { Team, Match, PlayoffBracket, Ranking } from "../types";

export const mockTeams: Team[] = [
  {
    id: "1",
    name: "Cornhole Kings",
    logoUrl: "https://img.freepik.com/premium-vector/sport-logo-template-with-crown_7649-114.jpg",
    players: [
      { id: "p1", name: "John Smith" },
      { id: "p2", name: "Mike Johnson" }
    ],
    wins: 12,
    losses: 3,
    created_at: new Date(2023, 3, 15).toISOString()
  },
  {
    id: "2",
    name: "Bag Tossers",
    logoUrl: "https://img.freepik.com/premium-vector/cornhole-vintage-logo-design-inspiration-isolated-white-background_427060-163.jpg",
    players: [
      { id: "p3", name: "Sarah Davis" },
      { id: "p4", name: "Emma Wilson" }
    ],
    wins: 10,
    losses: 5,
    created_at: new Date(2023, 4, 2).toISOString()
  },
  {
    id: "3",
    name: "Bean Bag Bosses",
    logoUrl: "https://creazilla-store.fra1.digitaloceanspaces.com/cliparts/7829796/cornhole-toss-clipart-md.png",
    players: [
      { id: "p5", name: "David Thompson" },
      { id: "p6", name: "Robert Brown" }
    ],
    wins: 9,
    losses: 6,
    created_at: new Date(2023, 3, 28).toISOString()
  },
  {
    id: "4",
    name: "Hole Hunters",
    logoUrl: "https://c8.alamy.com/comp/2JPMH2H/cornhole-logo-design-premium-vector-2JPMH2H.jpg",
    players: [
      { id: "p7", name: "Joe Garcia" },
      { id: "p8", name: "Tim Miller" }
    ],
    wins: 8,
    losses: 7,
    created_at: new Date(2023, 4, 10).toISOString()
  },
  {
    id: "5",
    name: "Bag Slingers",
    logoUrl: "https://t3.ftcdn.net/jpg/04/56/95/28/360_F_456952833_9nbIgFMvuUjUdx2Quq0hJZxvBWnGbrkx.jpg",
    players: [
      { id: "p9", name: "Chris White" },
      { id: "p10", name: "Dan Martin" }
    ],
    wins: 7,
    losses: 8,
    created_at: new Date(2023, 3, 20).toISOString()
  },
  {
    id: "6",
    name: "Board Masters",
    logoUrl: "https://img.freepik.com/premium-vector/cornhole-vector-logo-vintage-style_598310-214.jpg",
    players: [
      { id: "p11", name: "Alex Taylor" },
      { id: "p12", name: "Paul Lewis" }
    ],
    wins: 6,
    losses: 9,
    created_at: new Date(2023, 3, 25).toISOString()
  },
  {
    id: "7",
    name: "Ace Tossers",
    logoUrl: "https://img.freepik.com/premium-vector/cornhole-logo-design-template_607588-5635.jpg",
    players: [
      { id: "p13", name: "Kevin Clark" },
      { id: "p14", name: "Mark Robinson" }
    ],
    wins: 5,
    losses: 10,
    created_at: new Date(2023, 4, 5).toISOString()
  },
  {
    id: "8",
    name: "Bag Bandits",
    logoUrl: "https://images.squarespace-cdn.com/content/v1/63b550a77468955787c0979b/1674434812704-GCDT1GD4QCGBDMU23AYO/Cornhole_Pros.png",
    players: [
      { id: "p15", name: "Brian Hall" },
      { id: "p16", name: "Josh King" }
    ],
    wins: 3,
    losses: 12,
    created_at: new Date(2023, 4, 8).toISOString()
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
