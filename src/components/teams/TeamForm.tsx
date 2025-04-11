
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Team, Player } from "@/types";

interface TeamFormProps {
  team?: Team;
  onSubmit: (data: Omit<Team, "id" | "created_at">) => void;
  onCancel: () => void;
}

const TeamForm: React.FC<TeamFormProps> = ({ team, onSubmit, onCancel }) => {
  const [name, setName] = useState<string>(team?.name || '');
  const [logoUrl, setLogoUrl] = useState<string>(team?.logoUrl || '');
  const [imageUrl, setImageUrl] = useState<string | undefined>(team?.imageUrl);
  const [players, setPlayers] = useState<Player[]>(
    team?.players || [{ name: '' }]
  );
  const [previewImage, setPreviewImage] = useState<string | undefined>(team?.logoUrl);
  const [wins] = useState<number>(team?.wins || 0);
  const [losses] = useState<number>(team?.losses || 0);

  const handleAddPlayer = () => {
    setPlayers([...players, { name: '' }]);
  };

  const handlePlayerChange = (index: number, value: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = { ...updatedPlayers[index], name: value };
    setPlayers(updatedPlayers);
  };

  const handleRemovePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      name,
      logoUrl: previewImage || undefined,
      imageUrl: imageUrl || undefined, // Use undefined if no image
      players: players.filter(p => p.name.trim() !== ""),
      wins,
      losses,
      division: team?.division // preserve existing division if editing
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Team Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter team name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="logoUrl">Team Logo URL</Label>
          <Input
            id="logoUrl"
            value={logoUrl}
            onChange={(e) => {
              setLogoUrl(e.target.value);
              setPreviewImage(e.target.value);
            }}
            placeholder="Enter URL for team logo"
          />
        </div>

        {/* Players section */}
        <div className="space-y-2">
          <Label>Players</Label>
          {players.map((player, index) => (
            <div key={index} className="flex gap-2 mt-2">
              <Input
                value={player.name}
                onChange={(e) => handlePlayerChange(index, e.target.value)}
                placeholder={`Player ${index + 1} name`}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleRemovePlayer(index)}
                className="shrink-0"
              >
                Remove
              </Button>
            </div>
          ))}
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleAddPlayer}
            className="mt-2"
          >
            Add Player
          </Button>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {team ? 'Update Team' : 'Create Team'}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default TeamForm;
