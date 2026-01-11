import { AlertCircle, Edit, Loader2, Save } from 'lucide-react';
import React, { useState } from 'react';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useTeamBasicUpdate } from '@/hooks/useTeamBasicUpdate';
import { useTeamMembership } from '@/hooks/useTeamMembership';

const TeamEditSection: React.FC = () => {
  const { membership, refreshMembership } = useTeamMembership();
  const { updateTeamBasicInfo } = useTeamBasicUpdate();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    image_url: '',
  });
  const { toast } = useToast();

  // Don't show if user doesn't have approved membership
  if (!membership?.is_approved || !membership.team) {
    return null;
  }

  // Initialize form data when entering edit mode
  const handleEditClick = () => {
    setFormData({
      name: membership.team?.name || '',
      image_url: membership.team?.imageUrl || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!membership.team) return;

    try {
      setIsLoading(true);

      await updateTeamBasicInfo(membership.team.id, {
        name: formData.name,
        image_url: formData.image_url || null,
      });

      toast({
        title: 'Team Updated',
        description: 'Team details have been successfully updated',
      });

      setIsEditing(false);
      await refreshMembership(); // Refresh to get updated team data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update team details';
      console.error('Error updating team:', error);
      toast({
        title: 'Update Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      image_url: '',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Team Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have editing privileges for this team. Changes will be applied immediately.
          </AlertDescription>
        </Alert>

        {!isEditing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <TeamLogo
                imageUrl={membership.team.imageUrl || membership.team.logoUrl}
                teamName={membership.team.name}
                size="lg"
                rounded
              />
              <div>
                <h3 className="text-lg font-semibold">{membership.team.name}</h3>
                <p className="text-sm text-muted-foreground">Team ID: {membership.team.id}</p>
              </div>
            </div>

            <Button onClick={handleEditClick} className="w-full">
              <Edit className="w-4 h-4 mr-2" />
              Edit Team Details
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter team name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-image">Team Image URL</Label>
              <Input
                id="team-image"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://example.com/team-logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Provide a URL to your team's logo or image
              </p>
            </div>

            {formData.image_url && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="flex items-center gap-2">
                  <TeamLogo
                    imageUrl={formData.image_url}
                    teamName={formData.name}
                    size="md"
                    rounded
                  />
                  <span className="text-sm">{formData.name}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isLoading || !formData.name.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>

              <Button onClick={handleCancel} variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamEditSection;
