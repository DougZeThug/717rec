
import React from "react";
import { ResponsiveContainer, ScatterChart, XAxis, YAxis, CartesianGrid, Tooltip, Scatter, Legend } from "recharts";

// PowerScore and division info type (all relevant fields)
interface TeamPowerScore {
  team_id: string;
  team_name?: string;
  power_score: number;
  sos: number;
  division_id?: string;
  division?: string;
  wins?: number;
  losses?: number;
  game_wins?: number;
  game_losses?: number;
  divisionName?: string;
}

const DIVISION_COLORS: Record<string, string> = {
  Competitive: "#8B5CF6",    // vivid purple
  Intermediate: "#0EA5E9",   // ocean blue
  Recreational: "#F97316",   // bright orange
};

function getDivisionColor(division: string | null | undefined) {
  if (!division) return "#94a3b8";
  if (DIVISION_COLORS[division]) return DIVISION_COLORS[division];
  const key = (division.charAt(0).toUpperCase() + division.slice(1).toLowerCase());
  return DIVISION_COLORS[key] || "#94a3b8";
}

const CustomTooltip = ({ active, payload }: {active?: boolean, payload?: any[]}) => {
  if (active && payload && payload[0]) {
    const team = payload[0].payload;
    return (
      <div className="bg-white rounded shadow px-4 py-2 text-xs border border-gray-200 min-w-[160px]">
        <div className="font-semibold">{team.team_name || "Unnamed Team"}</div>
        <div>
          <span>Division: </span>
          <span className="font-medium">{team.division || team.divisionName || "Unassigned"}</span>
        </div>
        <div>
          <span>Record: </span>
          <span>{team.wins ?? "-"}–{team.losses ?? "-"}</span>
        </div>
        <div>Power Score: <span className="font-mono">{Number(team.power_score).toFixed(2)}</span></div>
        <div>SOS: <span className="font-mono">{Number(team.sos).toFixed(3)}</span></div>
      </div>
    );
  }
  return null;
};

const PowerScoreScatterPlot = ({ data }: { data: TeamPowerScore[] }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className="text-center p-8 text-gray-500">No team data available for scatter plot</div>;
  }
  
  try {
    const minSOS = Math.min(...data.map(d => d.sos ?? 0));
    const maxSOS = Math.max(...data.map(d => d.sos ?? 1));
    const minPower = Math.min(...data.map(d => d.power_score ?? 0));
    const maxPower = Math.max(...data.map(d => d.power_score ?? 2));
    const divisions = Array.from(new Set(data.map(t => t.division || t.divisionName || "Unassigned")));
    const tickCount = 5;
    
    return (
      <div className="w-full overflow-x-auto">
        <div className="min-w-[360px] md:min-w-[600px]">
          <div className="text-lg mb-3 font-semibold flex items-center gap-2">
            📊 Power Score vs Strength of Schedule (SOS) — All Teams
          </div>
          <ResponsiveContainer width="100%" minWidth={360} height={350}>
            <ScatterChart margin={{ top: 30, right: 25, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="sos" 
                name="SOS" 
                label={{ value: "Strength of Schedule (SOS)", position: "insideBottom", offset: -8 }}
                domain={[minSOS, maxSOS]}
                tickCount={tickCount}
              />
              <YAxis 
                type="number" 
                dataKey="power_score" 
                name="Power Score"
                label={{ value: "Power Score", angle: -90, position: "insideLeft", offset: 8 }}
                domain={[minPower, maxPower]}
                tickCount={tickCount}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {divisions.map((division, idx) => (
                <Scatter
                  key={division}
                  name={division}
                  data={data.filter(d => (d.division || d.divisionName || "Unassigned") === division)}
                  fill={getDivisionColor(division)}
                  shape="circle"
                  line={{}}
                  legendType="circle"
                >
                {/* Optionally dot size: size={Array.isArray(d) ? (d.game_wins ?? 0) + (d.game_losses ?? 0) : 8} */}
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error rendering PowerScoreScatterPlot:", error);
    return (
      <div className="text-center p-8 text-gray-500">
        Error rendering scatter plot. Please try again later.
      </div>
    );
  }
};

export default PowerScoreScatterPlot;
