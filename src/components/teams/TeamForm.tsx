import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Save, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { DestructiveIconButton } from '@/components/ui/destructive-icon-button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDivisions } from '@/hooks/useDivisions';
import { Team } from '@/types';
import { uploadTeamImage } from '@/utils/imageUpload';

const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  division_id: z.string().nullable(),
});

type TeamFormData = z.infer<typeof teamSchema>;

interface TeamFormProps {
  team?: Team;
  onSubmit: (data: Omit<Team, 'id' | 'created_at'>) => void;
  onCancel: () => void;
}

const TeamForm: React.FC<TeamFormProps> = ({ team, onSubmit, onCancel }) => {
  const [imageUrl, setImageUrl] = useState<string | undefined>(team?.imageUrl);
  const [playerNames, setPlayerNames] = useState<string[]>(team?.players || ['']);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { divisions, isLoading: isDivisionsLoading } = useDivisions();

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: team?.name || '',
      division_id: team?.division_id || null,
    },
  });

  const { isSubmitting } = form.formState;

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
        title: 'Processing Image',
        description: 'Compressing, validating, and uploading your image...',
      });

      const uploadedImageUrl = await uploadTeamImage(file, team?.id);
      setImageUrl(uploadedImageUrl);

      toast({
        title: 'Image Uploaded',
        description: 'Image successfully processed and uploaded.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Image Upload Failed',
        description: 'Could not upload the image. Please try again with a different image.',
        variant: 'destructive',
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

  const handleFormSubmit = (data: TeamFormData) => {
    const divisionValue = data.division_id === 'none' ? null : data.division_id;

    onSubmit({
      name: data.name,
      imageUrl: imageUrl || undefined,
      players: playerNames.filter((name) => name.trim() !== ''),
      wins: team?.wins || 0,
      losses: team?.losses || 0,
      division_id: divisionValue,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team Name</FormLabel>
                <FormControl>
                  <Input autoComplete="organization" placeholder="Enter team name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="division_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Division</FormLabel>
                <Select
                  value={field.value || 'none'}
                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {isDivisionsLoading ? (
                      <SelectItem value="loading-divisions" disabled>
                        Loading divisions...
                      </SelectItem>
                    ) : divisions.length === 0 ? (
                      <SelectItem value="no-divisions-available" disabled>
                        No divisions available
                      </SelectItem>
                    ) : (
                      divisions.map((div) => (
                        <SelectItem key={div.id} value={div.id}>
                          {div.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Team Image</FormLabel>
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
                {isUploading ? 'Processing...' : 'Upload Image'}
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
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={handleRemoveImage}
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <FormLabel>Players</FormLabel>
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
            <Button type="button" variant="outline" onClick={handleAddPlayer} className="mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Player
            </Button>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || isSubmitting}>
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
    </Form>
  );
};

export default TeamForm;
