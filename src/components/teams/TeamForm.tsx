
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { XCircle, Plus } from "lucide-react";
import type { Team, Player } from "@/types";

interface TeamFormProps {
  team?: Team;
  onSubmit: (team: Omit<Team, "id" | "created_at">) => void;
  onCancel: () => void;
}

const TeamForm: React.FC<TeamFormProps> = ({ team, onSubmit, onCancel }) => {
  const [name, setName] = useState(team?.name || "");
  const [logoUrl, setLogoUrl] = useState(team?.logoUrl || "");
  const [players, setPlayers] = useState<Omit<Player, "id">[]>(
    team?.players.map(p => ({ name: p.name, email: p.email, avatar: p.avatar })) || [{ name: "", email: "" }]
  );
  const [wins, setWins] = useState(team?.wins || 0);
  const [losses, setLosses] = useState(team?.losses || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      name,
      logoUrl: logoUrl || undefined,
      players: players.filter(p => p.name.trim() !== ""),
      wins,
      losses
    });
  };

  const addPlayer = () => {
    setPlayers([...players, { name: "", email: "" }]);
  };

  const removePlayer = (index: number) => {
    const updatedPlayers = [...players];
    updatedPlayers.splice(index, 1);
    setPlayers(updatedPlayers);
  };

  const updatePlayer = (index: number, field: keyof Omit<Player, "id">, value: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = { ...updatedPlayers[index], [field]: value };
    setPlayers(updatedPlayers);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Team Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
          <Input
            id="logoUrl"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          {logoUrl && (
            <div className="mt-2 bg-gray-100 p-2 rounded-md">
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-20 mx-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Invalid+URL";
                }}
              />
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="wins">Wins</Label>
            <Input
              id="wins"
              type="number"
              min="0"
              value={wins}
              onChange={(e) => setWins(parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label htmlFor="losses">Losses</Label>
            <Input
              id="losses"
              type="number"
              min="0"
              value={losses}
              onChange={(e) => setLosses(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        
        <div>
          <Label>Players</Label>
          {players.map((player, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                placeholder="Player name"
                value={player.name}
                onChange={(e) => updatePlayer(index, "name", e.target.value)}
                required={index === 0}
              />
              <Input
                placeholder="Email (optional)"
                type="email"
                value={player.email || ""}
                onChange={(e) => updatePlayer(index, "email", e.target.value)}
              />
              {players.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removePlayer(index)}
                  className="flex-shrink-0"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPlayer}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Player
          </Button>
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-cornhole-navy hover:bg-cornhole-navy/90">
          {team ? "Update Team" : "Create Team"}
        </Button>
      </div>
    </form>
  );
};

export default TeamForm;
