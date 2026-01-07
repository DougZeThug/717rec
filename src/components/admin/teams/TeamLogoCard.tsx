import React, { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Check } from "lucide-react";
import { Team } from "@/types";
import { getLogoStatus, getStatusColor, getStatusLabel, getStatusIcon, LogoStatus } from "@/utils/logoStatusUtils";
import { uploadTeamImage } from "@/utils/imageUpload";
import { updateTeamApi } from "@/services/TeamService";
import { useToast } from "@/hooks/use-toast";
import { TeamLogo } from "@/components/shared/TeamLogo";
import { errorLog } from "@/utils/logger";

interface TeamLogoCardProps {
  team: Team;
  onUpdate: () => void;
}

const TeamLogoCard: React.FC<TeamLogoCardProps> = ({ team, onUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const status = getLogoStatus(team.imageUrl);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const imageUrl = await uploadTeamImage(file, team.id);
      await updateTeamApi(team.id, { ...team, imageUrl: imageUrl });
      
      toast({
        title: "Logo Updated",
        description: `${team.name}'s logo has been optimized and uploaded.`,
      });
      
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 2000);
      onUpdate();
    } catch (error) {
      errorLog("Error uploading logo:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className={`transition-all duration-300 ${justUpdated ? 'ring-2 ring-green-500' : ''}`}>
      <CardContent className="p-4 flex flex-col items-center gap-3">
        {/* Logo Preview */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          <TeamLogo
            imageUrl={team.imageUrl}
            teamName={team.name}
            size="lg"
          />
        </div>

        {/* Team Name */}
        <h3 className="font-medium text-sm text-center line-clamp-2 min-h-[2.5rem]">
          {team.name}
        </h3>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5">
          <span>{getStatusIcon(status)}</span>
          <span className={`text-xs font-medium ${getStatusColor(status)}`}>
            {getStatusLabel(status)}
          </span>
        </div>

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant={status === 'optimized' ? 'outline' : 'default'}
          size="sm"
          className="w-full"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              Uploading...
            </>
          ) : justUpdated ? (
            <>
              <Check className="h-3 w-3 mr-1.5" />
              Updated!
            </>
          ) : (
            <>
              <Upload className="h-3 w-3 mr-1.5" />
              {status === 'missing' ? 'Add Logo' : 'Update Logo'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TeamLogoCard;
