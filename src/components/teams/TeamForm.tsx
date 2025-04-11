
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { XCircle, Plus, Upload, Link as LinkIcon } from "lucide-react";
import type { Team, Player } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface TeamFormProps {
  team?: Team;
  onSubmit: (team: Omit<Team, "id" | "created_at">) => void;
  onCancel: () => void;
}

const TeamForm: React.FC<TeamFormProps> = ({ team, onSubmit, onCancel }) => {
  const [name, setName] = useState(team?.name || "");
  const [logoUrl, setLogoUrl] = useState(team?.logoUrl || "");
  const [imageUrl, setImageUrl] = useState(team?.imageUrl || "");
  const [players, setPlayers] = useState<Player[]>(
    team?.players || [{ name: "", email: "" }]
  );
  const [wins, setWins] = useState(team?.wins || 0);
  const [losses, setLosses] = useState(team?.losses || 0);
  const [imageUploadMode, setImageUploadMode] = useState<'url' | 'upload'>(logoUrl ? 'url' : 'upload');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | undefined>(imageUrl || logoUrl);
  const { toast } = useToast();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      name,
      logoUrl: previewImage || undefined,
      imageUrl: imageUrl || undefined,
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

  const uploadImageToStorage = async (file: File) => {
    setIsUploading(true);
    try {
      // Generate a unique file name to prevent conflicts
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload the file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('team-images')
        .upload(filePath, file);

      if (error) {
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('team-images')
        .getPublicUrl(filePath);

      // Set the image URL
      setImageUrl(publicUrlData.publicUrl);
      setPreviewImage(publicUrlData.publicUrl);
      
      toast({
        title: "Upload Successful",
        description: "Team image has been uploaded successfully",
      });

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred while uploading your image.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const compressImage = (file: File): Promise<File> => {
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
          
          // Convert to blob with reduced quality
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }
            
            // Create a new file from the blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            resolve(compressedFile);
          }, 'image/jpeg', 0.6);
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
      // Show a temporary preview before upload completes
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Compress and upload the image
      const compressedFile = await compressImage(file);
      await uploadImageToStorage(compressedFile);
    } catch (error) {
      console.error("Error handling file:", error);
      toast({
        title: "Error Processing Image",
        description: "There was an error processing your image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = async () => {
    // If there's an existing image in storage, try to delete it
    if (imageUrl && imageUrl.includes('team-images')) {
      try {
        // Extract the file path from the URL
        const filePathMatch = imageUrl.match(/team-images\/([^?]+)/);
        if (filePathMatch && filePathMatch[1]) {
          const filePath = filePathMatch[1];
          
          // Delete the file from storage
          await supabase.storage
            .from('team-images')
            .remove([filePath]);
        }
      } catch (error) {
        console.error("Error removing image from storage:", error);
      }
    }
    
    setPreviewImage(undefined);
    setImageUrl("");
    setLogoUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cornhole-navy mb-2"></div>
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 mb-2" />
                    <span>{previewImage ? "Change Image" : "Select Image"}</span>
                  </>
                )}
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
                onClick={handleRemoveImage}
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
        <Button 
          type="submit" 
          className="bg-cornhole-navy hover:bg-cornhole-navy/90"
          disabled={isUploading}
        >
          {team ? "Update Team" : "Create Team"}
        </Button>
      </div>
    </form>
  );
};

export default TeamForm;
