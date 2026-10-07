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
import { useDivisions } from '@/hooks/useDivisions';
import { useToast } from '@/hooks/useToast';
import { Team } from '@/types';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { uploadTeamImage } from '@/utils/imageUpload';
import { errorLog } from '@/utils/logger';

const teamSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required'),
  division_id: z.string().nullable(),
});

type TeamFormData = z.infer<typeof teamSchema>;

interface TeamFormProps {
  team?: Team;
  onSubmit: (data: Omit<Team, 'id' | 'created_at'>) => void;
  onCancel: () => void;
}

interface TeamImageFieldProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageUrl: string | undefined;
  isUploading: boolean;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

const TeamImageField: React.FC<TeamImageFieldProps> = ({
  fileInputRef,
  imageUrl,
  isUploading,
  onUpload,
  onRemove,
}) => (
  <div className="space-y-2">
    <FormLabel>Team Image</FormLabel>
    <input
      type="file"
      ref={fileInputRef}
      accept="image/*"
      onChange={onUpload}
      className="hidden"
      disabled={isUploading}
      aria-label="Upload team image"
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
          <img src={imageUrl} alt="Team preview" className="size-20 object-cover rounded" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 size-8 rounded-full p-0"
            onClick={onRemove}
            aria-label="Remove team image"
          >
            <X size={16} />
          </Button>
        </div>
      )}
    </div>
  </div>
);

interface PlayerNamesFieldProps {
  playerNames: string[];
  playerIds: string[];
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

const PlayerNamesField: React.FC<PlayerNamesFieldProps> = ({
  playerNames,
  playerIds,
  onChange,
  onRemove,
  onAdd,
}) => (
  <div className="space-y-2">
    <FormLabel>Players</FormLabel>
    {playerNames.map((playerName, index) => (
      <div key={playerIds[index]} className="flex gap-2 mt-2">
        <Input
          value={playerName}
          onChange={(e) => onChange(index, e.target.value)}
          placeholder={`Player ${index + 1} name`}
          className="flex-1"
        />
        <DestructiveIconButton onClick={() => onRemove(index)} title="Remove player" />
      </div>
    ))}
    <Button type="button" variant="outline" onClick={onAdd} className="mt-2">
      <Plus className="size-4 mr-2" />
      Add Player
    </Button>
  </div>
);

interface DivisionSelectProps {
  value: string | null | undefined;
  onChange: (divisionId: string | null) => void;
  divisions: ReturnType<typeof useDivisions>['divisions'];
  isLoading: boolean;
}

const DivisionSelect: React.FC<DivisionSelectProps> = ({
  value,
  onChange,
  divisions,
  isLoading,
}) => (
  <Select
    value={value || 'none'}
    onValueChange={(selected) => onChange(selected === 'none' ? null : selected)}
  >
    <FormControl>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select division" />
      </SelectTrigger>
    </FormControl>
    <SelectContent>
      <SelectItem value="none">None</SelectItem>
      {isLoading ? (
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
);

interface TeamFormActionsProps {
  isUploading: boolean;
  isSubmitting: boolean;
  isEditing: boolean;
  onCancel: () => void;
}

const TeamFormActions: React.FC<TeamFormActionsProps> = ({
  isUploading,
  isSubmitting,
  isEditing,
  onCancel,
}) => (
  <div className="flex justify-end gap-2 mt-4">
    <Button type="button" variant="outline" onClick={onCancel}>
      <X className="size-4 mr-2" />
      Cancel
    </Button>
    <Button type="submit" disabled={isUploading || isSubmitting}>
      {isUploading ? (
        <>
          <Loader2 className="size-4 mr-2 animate-spin" />
          Uploading...
        </>
      ) : isEditing ? (
        <>
          <Save className="size-4 mr-2" />
          Update Team
        </>
      ) : (
        <>
          <Plus className="size-4 mr-2" />
          Create Team
        </>
      )}
    </Button>
  </div>
);

const TeamForm: React.FC<TeamFormProps> = ({ team, onSubmit, onCancel }) => {
  const missingImageUrl: string | undefined = undefined;
  const [imageUrl, setImageUrl] = useState<string | undefined>(team?.imageUrl ?? missingImageUrl);
  const [playerNames, setPlayerNames] = useState<string[]>(team?.players || ['']);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Stable per-row IDs kept in sync with playerNames so React keys remain
  // stable across reorders/removals (avoids array-index-as-key bugs).
  const [playerIds, setPlayerIds] = useState<string[]>(() =>
    (team?.players || ['']).map(() => crypto.randomUUID())
  );
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
    setPlayerIds((prev) => [...prev, crypto.randomUUID()]);
    setPlayerNames((prev) => [...prev, '']);
  };

  const handlePlayerChange = (index: number, value: string) => {
    const updatedPlayers = [...playerNames];
    updatedPlayers[index] = value;
    setPlayerNames(updatedPlayers);
  };

  const handleRemovePlayer = (index: number) => {
    setPlayerIds((prev) => prev.filter((_, i) => i !== index));
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
      errorLog('Upload error:', error);
      toast({
        title: 'Image Upload Failed',
        description: getUIErrorMessage(error, 'Could not upload the image'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(missingImageUrl);
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
                <DivisionSelect
                  value={field.value}
                  onChange={field.onChange}
                  divisions={divisions}
                  isLoading={isDivisionsLoading}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <TeamImageField
            fileInputRef={fileInputRef}
            imageUrl={imageUrl}
            isUploading={isUploading}
            onUpload={handleImageUpload}
            onRemove={handleRemoveImage}
          />

          <PlayerNamesField
            playerNames={playerNames}
            playerIds={playerIds}
            onChange={handlePlayerChange}
            onRemove={handleRemovePlayer}
            onAdd={handleAddPlayer}
          />

          <TeamFormActions
            isUploading={isUploading}
            isSubmitting={isSubmitting}
            isEditing={Boolean(team)}
            onCancel={onCancel}
          />
        </div>
      </form>
    </Form>
  );
};

export default TeamForm;
