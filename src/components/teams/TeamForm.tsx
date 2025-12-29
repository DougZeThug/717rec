import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Team } from "@/types";
import { uploadTeamImage } from "@/utils/imageUpload";
import { Upload, X, Plus, Save, Loader2 } from "lucide-react";
import { DestructiveIconButton } from "@/components/ui/destructive-icon-button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDivisions } from "@/hooks/useDivisions";

interface TeamFormProps {
  team?: Team;
  onSubmit: (data: Omit<Team, "id" | "created_at">) => void;
  onCancel: () => void;
}

const TeamForm: React.FC<TeamFormProps> = ({ team, onSubmit, onCancel }) => {
  const [name, setName] = useState<string>(team?.name || '');
  const [imageUrl, setImageUrl] = useState<string | undefined>(team?.imageUrl);
  const [playerNames, setPlayerNames] = useState<string[]>(
    team?.players || ['']
  );
  const [division, setDivision] = useState<string | null>(team?.division_id || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [wins] = useState<number>(team?.wins || 0);
  const [losses] = useState<number>(team?.losses || 0);
  const { divisions, isLoading: isDivisionsLoading } = useDivisions();

  const handleAddPlayer = () => {
    setPlayerNames([...playerNames, '']);
  };

  const handlePlayerChange = (index: number, value: string) => {
    const updatedPlayers = [...playerNames];
    updatedPlayers[index] = value;
    setPlayerNames(updatedPlayers);
  };

  const handleRemovePlayer = (index: number) => {
    setPlayerNames(playerNames.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      toast({
        title: "Processing Image",
        description: "Compressing, validating, and uploading your image...",
      });
      
      // Pass team ID if available (for editing an existing team)
      const uploadedImageUrl = await uploadTeamImage(file, team?.id);
      setImageUrl(uploadedImageUrl);
      
      toast({
        title: "Image Uploaded",
        description: "Image successfully processed and uploaded.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Image Upload Failed",
        description: "Could not upload the image. Please try again with a different image.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle the division value properly
    // If "none" is selected, set the division to null (not a string)
    const divisionValue = division === "none" ? null : division;
    
    onSubmit({
      name,
      imageUrl: imageUrl || undefined, // Use undefined if no image
      players: playerNames.filter(name => name.trim() !== ""),
      wins,
      losses,
      division_id: divisionValue
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
          <Label htmlFor="division">Division</Label>
          <Select 
            value={division || "none"} 
            onValueChange={(value) => setDivision(value === "none" ? null : value)}
          >
            <SelectTrigger id="division" className="w-full">
              <SelectValue placeholder="Select division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {isDivisionsLoading ? (
                <SelectItem value="loading-divisions">Loading divisions...</SelectItem>
              ) : divisions.length === 0 ? (
                <SelectItem value="no-divisions-available">No divisions available</SelectItem>
              ) : (
                divisions.map((div) => (
                  <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Team Image</Label>
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*" 
            onChange={handleImageUpload} 
            className="hidden"
            disabled={isUploading}
          />
          <div className="flex items-center gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <Upload size={16} /> 
              {isUploading ? "Processing..." : "Upload Image"}
            </Button>
            {imageUrl && (
              <div className="relative">
                <img 
                  src={imageUrl} 
                  alt="Team preview" 
                  className="h-20 w-20 object-cover rounded"
                />
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={handleRemoveImage}
                >
                  <X size={12} />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Players</Label>
          {playerNames.map((playerName, index) => (
            <div key={index} className="flex gap-2 mt-2">
              <Input
                value={playerName}
                onChange={(e) => handlePlayerChange(index, e.target.value)}
                placeholder={`Player ${index + 1} name`}
                className="flex-1"
              />
              <DestructiveIconButton
                onClick={() => handleRemovePlayer(index)}
                title="Remove player"
              />
            </div>
          ))}
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleAddPlayer}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Player
          </Button>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : team ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Team
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default TeamForm;
