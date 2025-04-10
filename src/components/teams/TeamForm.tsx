
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { XCircle, Plus, Upload, Link as LinkIcon } from "lucide-react";
import type { Team, Player } from "@/types";

interface TeamFormProps {
  team?: Team;
  onSubmit: (team: Omit<Team, "id" | "created_at">) => void;
  onCancel: () => void;
}

const TeamForm: React.FC<TeamFormProps> = ({ team, onSubmit, onCancel }) => {
  const [name, setName] = useState(team?.name || "");
  const [logoUrl, setLogoUrl] = useState(team?.logoUrl || "");
  const [players, setPlayers] = useState<Player[]>(
    team?.players || [{ name: "", email: "" }]
  );
  const [wins, setWins] = useState(team?.wins || 0);
  const [losses, setLosses] = useState(team?.losses || 0);
  const [imageUploadMode, setImageUploadMode] = useState<'url' | 'upload'>(logoUrl ? 'url' : 'upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | undefined>(logoUrl);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      name,
      logoUrl: previewImage || undefined,
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

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create a canvas with max dimensions 300x300
          const maxWidth = 300;
          const maxHeight = 300;
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with reduced quality (0.3 = 30% quality)
          const compressed = canvas.toDataURL('image/jpeg', 0.3);
          console.log(`Original size: ~${Math.round((e.target?.result as string).length / 1024)}KB, Compressed size: ~${Math.round(compressed.length / 1024)}KB`);
          resolve(compressed);
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      // Compress the image before setting it
      const compressedImage = await compressImage(file);
      setPreviewImage(compressedImage);
    } catch (error) {
      console.error("Error compressing image:", error);
      // Fallback to original method if compression fails
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPreviewImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
          <Label>Team Logo</Label>
          <div className="flex gap-2 mb-2">
            <Button 
              type="button"
              variant={imageUploadMode === 'upload' ? "default" : "outline"} 
              className={imageUploadMode === 'upload' ? "bg-cornhole-navy" : ""}
              onClick={() => setImageUploadMode('upload')}
              size="sm"
            >
              <Upload className="h-4 w-4 mr-1" /> Upload Image
            </Button>
            <Button 
              type="button"
              variant={imageUploadMode === 'url' ? "default" : "outline"}
              className={imageUploadMode === 'url' ? "bg-cornhole-navy" : ""}
              onClick={() => setImageUploadMode('url')}
              size="sm"
            >
              <LinkIcon className="h-4 w-4 mr-1" /> Use URL
            </Button>
          </div>
          
          {imageUploadMode === 'upload' ? (
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={triggerFileInput}
                className="w-full h-24 border-dashed flex flex-col items-center justify-center"
              >
                <Upload className="h-6 w-6 mb-2" />
                <span>{previewImage ? "Change Image" : "Select Image"}</span>
              </Button>
            </div>
          ) : (
            <div className="mt-2">
              <Input
                id="logoUrl"
                type="url"
                value={logoUrl}
                onChange={(e) => {
                  setLogoUrl(e.target.value);
                  setPreviewImage(e.target.value);
                }}
                placeholder="https://example.com/logo.png"
              />
            </div>
          )}
          
          {previewImage && (
            <div className="mt-2 bg-gray-100 p-2 rounded-md">
              <img
                src={previewImage}
                alt="Logo preview"
                className="h-20 mx-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=Invalid+URL";
                }}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setPreviewImage(undefined);
                  setLogoUrl("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="w-full mt-1 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" /> Remove Image
              </Button>
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
